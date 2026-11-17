"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGardenObjects } from "@/lib/garden/use-garden-objects";
import { GardenScene } from "@/components/garden-scene";
import { HOME_REGION, type CellRect } from "@/lib/garden/world";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { XpIcon } from "@/components/xp-icon";
import { LockIcon } from "@/components/lock-icon";
import { SessionProgressBar } from "@/components/session-progress-bar";
import { TabularNumber } from "@/components/journal/tabular-number";
import { XP_CHANGED_EVENT } from "@/lib/level-progress";
import styles from "./studyroom.module.css";


// The stage fits the home garden plus a one-cell margin, centered, and
// fills the rest of its (any-shaped) box with the lawn around it.
const STAGE_REGION: CellRect = {
  x: HOME_REGION.x - 1,
  y: HOME_REGION.y - 1,
  cols: HOME_REGION.cols + 2,
  rows: HOME_REGION.rows + 2,
};

const POMODORO_MODES: {
  id: PomodoroModeId;
  label: string;
  description: string;
}[] = [
  { id: "50_10", label: "50 / 10", description: "50 min study / 10 min break" },
  { id: "25_5", label: "25 / 5", description: "25 min study / 5 min break" },
  { id: "flexible", label: "Flexible", description: "Flexible" },
];

const REWARD_OVERLAY_MS = 4000;

// Static placeholder entries for the To-Do card until V2 adds real tasks.
const SAMPLE_TODOS = [
  { id: "1", text: "Read chapter 3", done: true },
  { id: "2", text: "Summarize lecture notes", done: false },
  { id: "3", text: "Practice exercises 4–6", done: false },
];

// Ambient sound mixer entries for the Sounds card (layout only in V1).
const AMBIENT_SOUNDS = [
  { id: "rain", name: "Rain", Icon: RainIcon },
  { id: "white-noise", name: "White noise", Icon: WhiteNoiseIcon },
  { id: "fire", name: "Fire", Icon: FireIcon },
  { id: "waves", name: "Waves", Icon: WavesIcon },
  { id: "wind", name: "Wind", Icon: WindIcon },
];

type World = {
  id: number;
  name: string;
  slug: string;
  unlock_level: number;
};

// The Background card always shows the home garden as selected for now —
// actually switching the stage's world comes in V3.
const SELECTED_WORLD_SLUG = "garden";

type ProfileSummary = {
  xp: number;
  coins: number;
};

type PomodoroModeId = "50_10" | "25_5" | "flexible";

type Phase = "idle" | "focus" | "break" | "complete";

export default function StudyroomPage() {
  // Same fetch logic as the Garden page — the studyroom's background is
  // the user's own live garden, per the product spec (docs/ROBIN.md §4).
  // Read-only here: a fixed HOME_REGION view with no camera input and no
  // click handlers, so placing/removing stays exclusive to the Garden page.
  const {
    objects: gardenObjects,
    gridWidth,
    gridHeight,
    loading: gardenLoading,
    error: gardenError,
  } = useGardenObjects();

  // Pomodoro mode selection lives here now (moved out of Settings) — it's
  // a per-session choice, not a persisted account setting, so it's plain
  // component state plus study_sessions.pomodoro_mode recording which mode
  // was used for a given focus block.
  const [modeId, setModeId] = useState<PomodoroModeId>("25_5");
  const [customStudyMinutes, setCustomStudyMinutes] = useState(25);
  const [customBreakMinutes, setCustomBreakMinutes] = useState(5);
  // How many study blocks to run this session: study → break → study →
  // break → … → study, with no break after the final study block.
  const [repetitions, setRepetitions] = useState(1);

  const [phase, setPhase] = useState<Phase>("idle");
  const [paused, setPaused] = useState(false);
  const [pendingBreakSeconds, setPendingBreakSeconds] = useState(0);
  // Multi-block run tracking. totalBlocks is a snapshot of `repetitions`
  // taken when the run starts (idle → focus), so it stays fixed for the
  // rest of the run even if the (now-hidden) input changes. blockIndex is
  // the 1-based index of the study block currently running or just
  // completed; incremented only when a break naturally advances into the
  // next study block (not on the initial manual start).
  const [totalBlocks, setTotalBlocks] = useState(1);
  const [blockIndex, setBlockIndex] = useState(1);
  // Running totals across every study block completed so far in this run
  // — reset only at run start (handleStartRun), then accumulated in
  // completeFocusSession() below. Displayed on the "complete" screen once
  // the whole run finishes.
  const [runXpEarned, setRunXpEarned] = useState(0);
  const [runCoinsEarned, setRunCoinsEarned] = useState(0);
  const [runSecondsStudied, setRunSecondsStudied] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [pauseToggling, setPauseToggling] = useState(false);
  const [finishing, setFinishing] = useState(false);
  // Guards against the natural-completion effects (focus→break,
  // break→focus) double-firing. Deliberately a ref, not state: flipping it
  // must NOT itself trigger a re-render, because it's read at the top of
  // the very effects it guards — as state, setting it inside the effect
  // changes that effect's own dependency array mid-flight, causing React
  // to re-run + clean up the effect (setting `cancelled`) *before* the
  // in-flight async work can apply its result, silently dropping the
  // phase transition. Reset to false at each phase entry point
  // (startFocusBlock, and the focus→break transition below).
  const autoAdvanceAttempted = useRef(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [level, setLevel] = useState<number | null>(null);

  // Worlds for the Background card, plus the player's current level so
  // worlds above it can be shown locked. Level is otherwise only fetched
  // after a completed block (completeFocusSession below).
  const [worlds, setWorlds] = useState<World[] | null>(null);
  const [worldsError, setWorldsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadWorlds() {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!cancelled) setWorldsError("You must be signed in to see worlds.");
        return;
      }

      const [worldsResult, levelResult] = await Promise.all([
        supabase
          .from("worlds")
          .select("id, name, slug, unlock_level")
          .order("sort_order", { ascending: true }),
        supabase
          .from("profiles_with_level")
          .select("level")
          .eq("id", user.id)
          .single(),
      ]);

      if (cancelled) return;

      if (worldsResult.error) {
        setWorldsError(worldsResult.error.message);
        return;
      }
      if (levelResult.error) {
        setWorldsError(levelResult.error.message);
        return;
      }

      setWorlds(worldsResult.data);
      setLevel(levelResult.data.level);
    }

    loadWorlds();

    return () => {
      cancelled = true;
    };
  }, []);

  // What the block that just completed earned — shown as a short overlay
  // on the stage, closed by a click or after REWARD_OVERLAY_MS.
  const [reward, setReward] = useState<{ xp: number; coins: number } | null>(
    null
  );

  useEffect(() => {
    if (!reward) return;
    const timeout = setTimeout(() => setReward(null), REWARD_OVERLAY_MS);
    return () => clearTimeout(timeout);
  }, [reward]);

  // Desktop: the page fills exactly what's left of the viewport under the
  // sticky nav, so stage and cards fit without page scroll. The nav's
  // height changes when it wraps or its XP row loads (and the nav may
  // re-render into a new element), so the body is observed instead —
  // its height always moves with the nav's.
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    function measure() {
      const top = page!.getBoundingClientRect().top + window.scrollY;
      page!.style.setProperty("--studyroom-top", `${top}px`);
    }

    measure();
    window.addEventListener("resize", measure);
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => {
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, []);

  // Fullscreen shows only the stage (garden, timer window, progress
  // bar). It's the same element going fullscreen, not a remount, so the
  // countdown keeps running straight through the switch.
  const stageRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);

  useEffect(() => {
    setFullscreenSupported(document.fullscreenEnabled);
    // Also catches Esc, which leaves fullscreen without our button.
    const onChange = () =>
      setIsFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function handleToggleFullscreen() {
    // Either call can reject (e.g. the browser denies fullscreen) — then
    // the page simply stays as it is.
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      stageRef.current?.requestFullscreen().catch(() => {});
    }
  }

  // Ticks the countdown for both the focus and the break phase — depends
  // only on `isTicking` (not secondsRemaining) so the interval isn't torn
  // down and recreated every second. Both focus and break can be paused.
  const isTicking = (phase === "focus" || phase === "break") && !paused;

  useEffect(() => {
    if (!isTicking) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) =>
        prev === null ? prev : Math.max(prev - 1, 0)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isTicking]);

  // Calls complete_study_session() and refetches profile/level. Shared by
  // manual End Session (during focus) and the natural focus→break
  // auto-advance below. Does NOT touch `phase` — callers decide what
  // happens next. Returns true on success, false on failure (error is
  // already surfaced via sessionError). Wrapped in useCallback (stable
  // identity unless sessionId/userId change) so it can safely sit in an
  // effect's dependency array without causing spurious re-runs.
  const completeFocusSession = useCallback(async (): Promise<boolean> => {
    if (!sessionId || !userId) return false;

    setSessionError(null);

    const supabase = createClient();

    // Snapshot xp/coins immediately before completing, so the exact
    // amount this block adds (diff of before/after) can be accumulated
    // into runXpEarned/runCoinsEarned. Diffing rather than recomputing
    // from duration_seconds also correctly captures any quest/achievement
    // bonus complete_study_session() grants alongside the base reward.
    const { data: beforeProfile, error: beforeError } = await supabase
      .from("profiles")
      .select("xp, coins")
      .eq("id", userId)
      .single();

    if (beforeError) {
      setSessionError(beforeError.message);
      return false;
    }

    // All reward math (xp/coins/streak/growth/quests) runs server-side in
    // this RPC — the client only ever passes the session id. A stale or
    // foreign session id makes it raise; finishing an already-completed
    // session is idempotent and just returns the session again without
    // erroring. The RPC returns the updated study_sessions row, whose
    // duration_seconds (actual paused-time-excluded study time) is
    // accumulated into runSecondsStudied for the run-complete summary.
    const { data: completedSession, error: rpcError } = await supabase.rpc(
      "complete_study_session",
      { p_session_id: sessionId }
    );

    if (rpcError) {
      setSessionError(rpcError.message);
      return false;
    }

    const [profileResult, profileWithLevelResult] = await Promise.all([
      supabase.from("profiles").select("xp, coins").eq("id", userId).single(),
      supabase
        .from("profiles_with_level")
        .select("level")
        .eq("id", userId)
        .single(),
    ]);

    if (profileResult.error) {
      setSessionError(profileResult.error.message);
      return false;
    }

    if (profileWithLevelResult.error) {
      setSessionError(profileWithLevelResult.error.message);
      return false;
    }

    setProfile(profileResult.data);
    setLevel(profileWithLevelResult.data.level);
    window.dispatchEvent(new Event(XP_CHANGED_EVENT));
    const xpEarned = profileResult.data.xp - beforeProfile.xp;
    const coinsEarned = profileResult.data.coins - beforeProfile.coins;
    setRunXpEarned((prev) => prev + xpEarned);
    setRunCoinsEarned((prev) => prev + coinsEarned);
    setReward({ xp: xpEarned, coins: coinsEarned });
    setRunSecondsStudied(
      (prev) => prev + (completedSession?.duration_seconds ?? 0)
    );
    setSessionId(null);
    return true;
  }, [sessionId, userId]);

  // Inserts a new study_sessions row and starts its focus countdown. Used
  // both by the manual "Start Session" button (idle) and by the automatic
  // break→focus continuation below. Wrapped in useCallback (stable
  // identity unless the mode selection changes) for the same reason as
  // completeFocusSession above.
  const startFocusBlock = useCallback(
    async (cancelled = false, advanceBlock = false) => {
      setSessionError(null);
      setLoading(true);

      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!cancelled) {
          setLoading(false);
          setSessionError("You must be signed in to start a session.");
        }
        return;
      }

      const { studyMinutes, breakMinutes } = getModeMinutes(
        modeId,
        customStudyMinutes,
        customBreakMinutes
      );

      // completed defaults to false and RLS requires it explicitly; ended_at/
      // duration are set later, exclusively via the complete_study_session()
      // RPC. pomodoro_mode records which mode this focus block used. Only a
      // focus block ever gets a study_sessions row — the break that follows
      // it is never persisted (purely client-side countdown), so break time
      // is never included in any duration_seconds/reward calculation.
      const { data, error: insertError } = await supabase
        .from("study_sessions")
        .insert({
          profile_id: user.id,
          completed: false,
          pomodoro_mode: modeId,
        })
        .select("id")
        .single();

      if (cancelled) return;

      setLoading(false);

      if (insertError) {
        setSessionError(insertError.message);
        return;
      }

      autoAdvanceAttempted.current = false;
      setUserId(user.id);
      setSessionId(data.id);
      setPendingBreakSeconds(breakMinutes * 60);
      setSecondsRemaining(studyMinutes * 60);
      setPaused(false);
      // Advance the block counter only once the next block has actually
      // started, in the same batch as the phase change — incrementing it
      // before the insert made the break briefly read as one block further
      // along (panel text and session progress) while the insert ran.
      if (advanceBlock) setBlockIndex((prev) => prev + 1);
      setPhase("focus");
    },
    [modeId, customStudyMinutes, customBreakMinutes]
  );

  // Natural completion of the FOCUS timer (reached 0 on its own, not via
  // manual End Session) awards XP/coins for the focus time exactly like
  // manual End Session does, then either advances into the break phase
  // (if more study blocks remain) or ends the whole run (if this was the
  // final block — no break after the last study block). Manual End
  // Session (handleFinishSession) intentionally does NOT use this path —
  // it always returns to idle instead, regardless of block progress.
  useEffect(() => {
    if (
      phase !== "focus" ||
      secondsRemaining !== 0 ||
      autoAdvanceAttempted.current
    ) {
      return;
    }

    let cancelled = false;
    autoAdvanceAttempted.current = true;

    async function advance() {
      const ok = await completeFocusSession();
      if (cancelled) return;

      if (ok) {
        const hasMoreBlocks = blockIndex < totalBlocks;
        if (hasMoreBlocks && pendingBreakSeconds > 0) {
          autoAdvanceAttempted.current = false;
          setSecondsRemaining(pendingBreakSeconds);
          setPaused(false);
          setPhase("break");
        } else {
          // This was the final study block of the run — show the
          // completion screen instead of returning straight to idle.
          // Manual End Session (handleFinishSession) never reaches this
          // branch; it always goes to idle regardless of block progress.
          setSecondsRemaining(null);
          setPhase("complete");
        }
      }
      // On failure, sessionError is already set by completeFocusSession();
      // phase stays "focus" at 0:00 so the user can retry via End Session.
    }

    advance();

    return () => {
      cancelled = true;
    };
  }, [
    phase,
    secondsRemaining,
    pendingBreakSeconds,
    blockIndex,
    totalBlocks,
    completeFocusSession,
  ]);

  // Natural completion of the BREAK timer auto-advances into the next
  // study block (blockIndex + 1 of totalBlocks), using the same mode —
  // continuing the run (study → break → study → … → study). Only reached
  // when the preceding focus-completion effect determined more blocks
  // remain, so no bounds check is needed here. Manual End Session during
  // break (handleEndBreak) does NOT use this path — it always returns to
  // idle instead.
  useEffect(() => {
    if (
      phase !== "break" ||
      secondsRemaining !== 0 ||
      autoAdvanceAttempted.current
    ) {
      return;
    }

    let cancelled = false;
    autoAdvanceAttempted.current = true;

    async function advance() {
      await startFocusBlock(cancelled, true);
    }

    advance();

    return () => {
      cancelled = true;
    };
  }, [phase, secondsRemaining, startFocusBlock]);

  async function handleTogglePause() {
    if (pauseToggling) return;

    // Break was never tracked server-side (no study_sessions row — see
    // startFocusBlock above), so pausing it is purely a local timer
    // freeze. Nothing to protect from being rewarded, unlike focus.
    if (phase === "break") {
      setPaused((prev) => !prev);
      return;
    }

    if (!sessionId) return;

    setSessionError(null);
    setPauseToggling(true);

    const supabase = createClient();
    const nextPaused = !paused;

    // Pausing/resuming is server-tracked (paused_at/paused_seconds), not
    // just a local timer freeze — complete_study_session() subtracts the
    // accumulated paused time from duration_seconds, so paused time is
    // never rewarded either (same principle as break time, see the
    // pause_study_session()/resume_study_session() RPCs in the schema).
    const { error: rpcError } = await supabase.rpc(
      nextPaused ? "pause_study_session" : "resume_study_session",
      { p_session_id: sessionId }
    );

    setPauseToggling(false);

    if (rpcError) {
      setSessionError(rpcError.message);
      return;
    }

    setPaused(nextPaused);
  }

  // Manual "End Session" during focus: always stops completely and
  // returns to idle — never transitions into break, unlike the timer
  // naturally reaching 0 (see the auto-advance effect above).
  async function handleFinishSession() {
    if (finishing) return;

    setFinishing(true);
    const ok = await completeFocusSession();
    setFinishing(false);

    if (!ok) return;

    setPhase("idle");
    setSecondsRemaining(null);
    setPaused(false);
  }

  // Manual "End Session" during break: stops completely and returns to
  // idle — no RPC call (break was never persisted), and it must NOT start
  // or continue another break/focus block.
  function handleEndBreak() {
    setPhase("idle");
    setSecondsRemaining(null);
    setPaused(false);
  }

  // Starts a brand-new multi-block run from idle: snapshots the current
  // `repetitions` input as this run's totalBlocks (so later changes to
  // the — now hidden — input don't affect a run in progress), resets
  // blockIndex to the first block and the running totals to 0, then
  // starts that first study block.
  function handleStartRun() {
    setTotalBlocks(repetitions);
    setBlockIndex(1);
    setRunXpEarned(0);
    setRunCoinsEarned(0);
    setRunSecondsStudied(0);
    startFocusBlock();
  }

  // "Return to Studyroom" on the completion screen — just goes back to
  // idle; the running totals stay as-is until the next handleStartRun
  // resets them, same as the profile/level summary elsewhere on this page.
  function handleReturnToStudyroom() {
    setReward(null);
    setPhase("idle");
  }

  // Session progress bar over the garden — overall study progress of the
  // run, derived from the existing timer state (no extra state). Breaks
  // don't count: the value holds still during a break. Block length comes
  // from the mode's study minutes (inputs are hidden during a run, so they
  // can't change mid-run); totalBlocks is the run's snapshot of repetitions.
  const showSessionBar =
    (phase === "focus" || phase === "break") && secondsRemaining !== null;
  const selectedMinutes = getModeMinutes(
    modeId,
    customStudyMinutes,
    customBreakMinutes
  );
  const blockSeconds = selectedMinutes.studyMinutes * 60;
  // What follows the current phase. Before the start this previews the
  // selected mode; there's no break after the final study block.
  const blocksPlanned = phase === "idle" ? repetitions : totalBlocks;
  const nextUp =
    phase === "break"
      ? `${selectedMinutes.studyMinutes} min focus`
      : (phase === "idle" ? 1 : blockIndex) < blocksPlanned
        ? `${selectedMinutes.breakMinutes} min break`
        : "End of session";
  const runTotalSeconds = blockSeconds * totalBlocks;
  // blockIndex is the block running (focus) or just finished (break).
  const completedBlocks = phase === "focus" ? blockIndex - 1 : blockIndex;
  const elapsedInBlock =
    phase === "focus" && secondsRemaining !== null
      ? blockSeconds - secondsRemaining
      : 0;
  const sessionProgress =
    showSessionBar && runTotalSeconds > 0
      ? (completedBlocks * blockSeconds + elapsedInBlock) / runTotalSeconds
      : 0;

  return (
    <div ref={pageRef} className={styles.page}>
      {/* The nav already says where we are — keep the heading for screen
          readers only, so the stage gets the height. */}
      <h1 className={styles.srOnly}>Studyroom</h1>

      {/* Stage: the garden as the full-width backdrop, with a glass
          window on the right showing the countdown and what comes next —
          the garden stays visible behind it and stays the point. Session
          controls live in the Timer card below. */}
      <div ref={stageRef} className={styles.stage}>
        {fullscreenSupported && (
          <button
            type="button"
            className={styles.fullscreenButton}
            onClick={handleToggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            aria-pressed={isFullscreen}
          >
            {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
          </button>
        )}

        {gardenLoading && (
          <p className={styles.stageNotice}>Loading garden…</p>
        )}
        {gardenError && (
          <p role="alert" className={`${styles.error} ${styles.stageNotice}`}>
            {gardenError}
          </p>
        )}

        <GardenScene
          objects={gardenObjects}
          gridWidth={gridWidth}
          gridHeight={gridHeight}
          camera={{ region: STAGE_REGION }}
          className={styles.garden}
        >
          {phase !== "complete" && (
            <div className={styles.stageWindow}>
              <p className={styles.timer} data-phase={phase}>
                <TabularNumber>
                  {formatTime(
                    phase === "idle" || secondsRemaining === null
                      ? selectedMinutes.studyMinutes * 60
                      : secondsRemaining
                  )}
                </TabularNumber>
              </p>
              <p className={styles.nextUp}>
                <span className={styles.nextUpLabel}>Next up:</span> {nextUp}
              </p>

              <hr className={styles.windowDivider} />

              <div className={styles.quoteRow}>
                <p className={styles.quote}>
                  “Small steps every day add up to big results.”
                </p>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label="New quote"
                >
                  <RefreshIcon />
                </button>
              </div>
            </div>
          )}


          {/* The run-complete screen below already shows the run's
              totals, so the per-block reward overlay stays out of its way. */}
          {reward && phase !== "complete" && (
            <button
              type="button"
              className={styles.rewardOverlay}
              onClick={() => setReward(null)}
              aria-label="Close"
            >
              <span className={styles.rewardCard} role="status">
                <span className={styles.rewardValue} data-currency="xp">
                  <XpIcon size={28} /> +{reward.xp} XP
                </span>
                <span className={styles.rewardValue} data-currency="coins">
                  <CoinIcon size={28} /> +{reward.coins} Coins
                </span>
              </span>
            </button>
          )}

          {phase === "complete" && (
            <div className={styles.completeOverlay}>
              <div className={styles.completeCard}>
                <h2 className={styles.completeHeading}>Congratulations!</h2>
                <p className={styles.completeMeta}>
                  {totalBlocks} {totalBlocks === 1 ? "block" : "blocks"}{" "}
                  completed
                </p>

                <div className={styles.completeStats}>
                  <div className={styles.statTile}>
                    <span className={styles.statLabel}>Minutes</span>
                    <span className={styles.statValue} data-currency="minutes">
                      {Math.floor(runSecondsStudied / 60)}
                    </span>
                  </div>
                  <div className={styles.statTile}>
                    <span className={styles.statLabel}>XP</span>
                    <span className={styles.statValue} data-currency="xp">
                      <XpIcon size={16} /> {runXpEarned}
                    </span>
                  </div>
                  <div className={styles.statTile}>
                    <span className={styles.statLabel}>Coins</span>
                    <span className={styles.statValue} data-currency="coins">
                      <CoinIcon size={16} /> {runCoinsEarned}
                    </span>
                  </div>
                </div>

                <Button onClick={handleReturnToStudyroom}>
                  Return to Studyroom
                </Button>

                {profile && level !== null && (
                  <p className={styles.statusBar}>
                    <span>
                      <XpIcon size={14} /> <strong>{profile.xp}</strong>
                    </span>
                    <span>
                      <CoinIcon size={14} /> <strong>{profile.coins}</strong>
                    </span>
                    <span>
                      Level <strong>{level}</strong>
                    </span>
                  </p>
                )}

                {sessionError && (
                  <p role="alert" className={styles.error}>
                    {sessionError}
                  </p>
                )}
              </div>
            </div>
          )}
          {showSessionBar && (
            <SessionProgressBar
              progress={sessionProgress}
              phase={phase === "break" ? "break" : "study"}
              showPercent
              className={styles.sessionBar}
            />
          )}
        </GardenScene>
      </div>

      {/* Tool row: four equal cards under the stage. Only Timer is wired
          up so far — the other three are placeholders. */}
      <div className={styles.toolRow}>
        <section className={styles.toolCard} aria-labelledby="tool-timer">
          <h2 id="tool-timer" className={styles.toolTitle}>
            <TimerIcon /> Timer
          </h2>

          {/* Scrolls inside the card if it ever outgrows the row. */}
          <div className={styles.toolBody}>
            {phase === "idle" && (
              <>
                <div
                  className={styles.modePills}
                  role="radiogroup"
                  aria-label="Pomodoro mode"
                >
                  {POMODORO_MODES.map((mode) => (
                    <label
                      key={mode.id}
                      title={mode.description}
                      className={`${styles.modePill} ${
                        modeId === mode.id ? styles.modePillSelected : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="pomodoro-mode"
                        className={styles.srOnlyInput}
                        checked={modeId === mode.id}
                        onChange={() => setModeId(mode.id)}
                        aria-label={mode.description}
                      />
                      {mode.label}
                    </label>
                  ))}
                </div>

                {modeId === "flexible" && (
                  <div className={styles.fieldRow}>
                    <label className={styles.fieldInline}>
                      Study
                      <input
                        type="number"
                        min={1}
                        className={styles.miniInput}
                        value={customStudyMinutes}
                        onChange={(event) =>
                          setCustomStudyMinutes(Number(event.target.value))
                        }
                        aria-label="Study minutes"
                      />
                    </label>
                    <label className={styles.fieldInline}>
                      Break
                      <input
                        type="number"
                        min={1}
                        className={styles.miniInput}
                        value={customBreakMinutes}
                        onChange={(event) =>
                          setCustomBreakMinutes(Number(event.target.value))
                        }
                        aria-label="Break minutes"
                      />
                    </label>
                  </div>
                )}

                <div className={styles.fieldRow}>
                  <label className={styles.fieldInline}>
                    Repetitions
                    <input
                      type="number"
                      min={1}
                      className={styles.miniInput}
                      value={repetitions}
                      onChange={(event) =>
                        setRepetitions(Number(event.target.value))
                      }
                    />
                  </label>
                  <Button size="sm" onClick={handleStartRun} disabled={loading}>
                    {loading ? "Starting…" : "Start Session"}
                  </Button>
                </div>
              </>
            )}

            {phase === "focus" && sessionId && secondsRemaining !== null && (
              <>
                <div>
                  <p className={styles.phaseLabel} data-phase="focus">
                    {paused ? "Focus · paused" : "Focus"}
                  </p>
                  <p className={styles.blockProgress}>
                    Block {blockIndex} of {totalBlocks}
                  </p>
                </div>

                <div className={styles.controlsRow}>
                  <Button
                    variant="secondary"
                    onClick={handleTogglePause}
                    disabled={pauseToggling}
                  >
                    {pauseToggling ? "…" : paused ? "Continue" : "Pause"}
                  </Button>
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={handleFinishSession}
                    disabled={finishing}
                  >
                    {finishing ? "Ending…" : "End Session"}
                  </button>
                </div>
              </>
            )}

            {phase === "break" && secondsRemaining !== null && (
              <>
                <div>
                  <p className={styles.phaseLabel} data-phase="break">
                    {paused ? "Break · paused" : "Break"}
                  </p>
                  <p className={styles.blockProgress}>
                    After block {blockIndex} of {totalBlocks}
                  </p>
                </div>

                <div className={styles.controlsRow}>
                  <Button variant="secondary" onClick={handleTogglePause}>
                    {paused ? "Continue" : "Pause"}
                  </Button>
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={handleEndBreak}
                  >
                    End Session
                  </button>
                </div>
              </>
            )}

            {profile && level !== null && (
              <p className={styles.statusBar}>
                <span>
                  <XpIcon size={14} /> <strong>{profile.xp}</strong>
                </span>
                <span>
                  <CoinIcon size={14} /> <strong>{profile.coins}</strong>
                </span>
                <span>
                  Level <strong>{level}</strong>
                </span>
              </p>
            )}

            {phase !== "complete" && sessionError && (
              <p role="alert" className={styles.error}>
                {sessionError}
              </p>
            )}
          </div>
        </section>

        <section className={styles.toolCard} aria-labelledby="tool-todo">
          <h2 id="tool-todo" className={styles.toolTitle}>
            <TodoIcon /> To-Do
          </h2>

          {/* Layout only — adding, checking off and deleting get wired up
              (with storage) in V2. */}
          <form
            className={styles.todoForm}
            onSubmit={(event) => event.preventDefault()}
          >
            <input
              type="text"
              className={styles.todoInput}
              placeholder="Add a task…"
              aria-label="New task"
            />
            <Button type="submit" variant="tonal" size="sm">
              Add
            </Button>
          </form>

          <ul className={styles.todoList}>
            {SAMPLE_TODOS.map((todo) => (
              <li key={todo.id} className={styles.todoItem}>
                <label className={styles.todoLabel}>
                  <input
                    type="checkbox"
                    className={styles.todoCheckbox}
                    defaultChecked={todo.done}
                  />
                  <span className={styles.todoText}>{todo.text}</span>
                </label>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label={`Delete “${todo.text}”`}
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.toolCard} aria-labelledby="tool-background">
          <h2 id="tool-background" className={styles.toolTitle}>
            <BackgroundIcon /> Background
          </h2>

          {worldsError && (
            <p role="alert" className={styles.error}>
              {worldsError}
            </p>
          )}
          {!worlds && !worldsError && <p className={styles.body}>Loading…</p>}

          {/* Display only — picking a world doesn't switch the stage yet
              (V3). Locked worlds stay visible, dimmed, so there's
              something to look forward to. */}
          {worlds && level !== null && (
            <ul className={styles.worldList}>
              {worlds.map((world) => {
                const locked = world.unlock_level > level;
                const selected = world.slug === SELECTED_WORLD_SLUG;
                return (
                  <li key={world.id}>
                    <button
                      type="button"
                      className={`${styles.worldOption} ${
                        selected ? styles.worldOptionSelected : ""
                      }`}
                      aria-pressed={selected}
                      disabled={locked}
                    >
                      <span className={styles.worldName}>{world.name}</span>
                      {locked && (
                        <span className={styles.worldLock}>
                          <LockIcon size={16} />
                          Lv {world.unlock_level}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={styles.toolCard} aria-labelledby="tool-sounds">
          <h2 id="tool-sounds" className={styles.toolTitle}>
            <SoundsIcon /> Sounds
          </h2>

          {/* Layout only — no audio in V1. Sliders start at 0 (silent). */}
          <ul className={styles.soundList}>
            {AMBIENT_SOUNDS.map(({ id, name, Icon }) => (
              <li key={id} className={styles.soundItem}>
                <span className={styles.soundIcon}>
                  <Icon />
                </span>
                <label htmlFor={`sound-${id}`} className={styles.soundName}>
                  {name}
                </label>
                <input
                  id={`sound-${id}`}
                  type="range"
                  min={0}
                  max={100}
                  defaultValue={0}
                  className={styles.soundSlider}
                  aria-label={`${name} volume`}
                />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function getModeMinutes(
  modeId: PomodoroModeId,
  customStudyMinutes: number,
  customBreakMinutes: number
): { studyMinutes: number; breakMinutes: number } {
  switch (modeId) {
    case "50_10":
      return { studyMinutes: 50, breakMinutes: 10 };
    case "25_5":
      return { studyMinutes: 25, breakMinutes: 5 };
    case "flexible":
      return {
        studyMinutes: customStudyMinutes,
        breakMinutes: customBreakMinutes,
      };
  }
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function TimerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
      <path d="M10 8v3l2 1.5M8 2.5h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TodoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5l1.5 1.5L7 4M3 11l1.5 1.5L7 10M10 5.5h7M10 11.5h7M10 16.5h7M4 16.5h1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BackgroundIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.5" y="3.5" width="15" height="13" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M3 14l4-4 3 3 2.5-2.5L17 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="13" cy="7.5" r="1.3" fill="currentColor" />
    </svg>
  );
}

function SoundsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M8 15V4.5l8-2V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="5.5" cy="15" r="2.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="13.5" cy="13" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M16 10a6 6 0 1 1-1.8-4.3M16 3.5v3.5h-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3.5 5.5h13M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M5.5 5.5l.8 10.6a1.5 1.5 0 0 0 1.5 1.4h4.4a1.5 1.5 0 0 0 1.5-1.4l.8-10.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RainIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5.5 11.5a3.5 3.5 0 0 1 .4-7 4.5 4.5 0 0 1 8.4 1.3 2.9 2.9 0 0 1-.3 5.7H5.5ZM6.5 14.5l-1 2.5M10 14.5l-1 2.5M13.5 14.5l-1 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WhiteNoiseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 10h1.5M6.5 6v8M10 3.5v13M13.5 7v6M16.5 10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FireIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 17.5a5 5 0 0 0 5-5c0-3.5-3-5-3.5-9-2 1.5-3 3.5-3 5.5-1-.5-1.5-1.5-1.5-2.5-1.5 1.5-2 3.5-2 6a5 5 0 0 0 5 5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function WavesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M2.5 8c1.25 0 1.25-1.5 2.5-1.5S6.25 8 7.5 8s1.25-1.5 2.5-1.5S11.25 8 12.5 8s1.25-1.5 2.5-1.5S16.25 8 17.5 8M2.5 13.5c1.25 0 1.25-1.5 2.5-1.5s1.25 1.5 2.5 1.5S8.75 12 10 12s1.25 1.5 2.5 1.5S13.75 12 15 12s1.25 1.5 2.5 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WindIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M2.5 7.5h9a2.5 2.5 0 1 0-2.5-2.5M2.5 11h12.5a2.5 2.5 0 1 1-2.5 2.5M2.5 14.5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 7.5V3h4.5M12.5 3H17v4.5M17 12.5V17h-4.5M7.5 17H3v-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExitFullscreenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M7.5 3v4.5H3M17 7.5h-4.5V3M12.5 17v-4.5H17M3 12.5h4.5V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
