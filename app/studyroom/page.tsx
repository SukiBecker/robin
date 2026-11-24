"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGardenObjects } from "@/lib/garden/use-garden-objects";
import { GardenScene } from "@/components/garden-scene";
import { HOME_REGION, type CellRect } from "@/lib/garden/world";
import { Button } from "@/components/journal/button";
import { FocusFrame } from "@/components/journal/ink";
import { TabularNumber } from "@/components/journal/tabular-number";
import { RobinPerch, type PerchMood } from "@/components/nursery/robin-perch";
import { PlaceBackdrop } from "@/components/place/place-backdrop";
import { ShelfPlank } from "@/components/place/shelf-plank";
import {
  ExitFullscreenIcon,
  FullscreenIcon,
} from "@/components/studyroom/icons";
import { AmbienceCrate } from "@/components/studyroom/ambience-crate";
import { RewardSlip } from "@/components/studyroom/reward-slip";
import { SessionComplete } from "@/components/studyroom/session-complete";
import {
  BREAK_QUOTES,
  COMPLETE_NOTES,
  formatTime,
  getModeMinutes,
  type Phase,
  type PomodoroModeId,
  type World,
} from "@/components/studyroom/session";
import { BoardNote, TimerBoard } from "@/components/studyroom/timer-board";
import { TodoNote } from "@/components/studyroom/todo-note";
import { VineProgress } from "@/components/studyroom/vine-progress";
import { XP_CHANGED_EVENT } from "@/lib/level-progress";
import { getStudyroomCamera } from "@/components/studyroom/garden-camera";
import styles from "@/components/studyroom/studyroom.module.css";

// The stage fits the home garden plus a one-cell margin, centered, and
// fills the rest of its (any-shaped) box with the lawn around it.
const STAGE_REGION: CellRect = {
  x: HOME_REGION.x - 1,
  y: HOME_REGION.y - 1,
  cols: HOME_REGION.cols + 2,
  rows: HOME_REGION.rows + 2,
};

const REWARD_OVERLAY_MS = 4000;

export default function StudyroomPage() {
  const [gardenCamera, setGardenCamera] = useState(() => getStudyroomCamera());
  useEffect(() => {
    setGardenCamera(getStudyroomCamera(undefined, window.location.search));
  }, []);
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
  const [level, setLevel] = useState<number | null>(null);

  // Worlds for the Ambience crate, plus the player's current level so
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

  // Development only: /studyroom?preview=focus | break | complete | reward
  // shows those states without a session or a reward — nothing is written.
  // (A previewed break runs down like a real one and starts a focus block
  // after 5 minutes, which does insert an empty study_sessions row. A
  // previewed focus block has no real session: Pause, End session and its
  // natural end only report an error.)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const preview = new URLSearchParams(window.location.search).get("preview");
    if (preview === "focus") {
      // Mid-run (round 2 of 2, 12 min left), so the vine shows progress.
      setTotalBlocks(2);
      setBlockIndex(2);
      setSessionId("preview");
      setSecondsRemaining(12 * 60);
      setPhase("focus");
    } else if (preview === "break") {
      setTotalBlocks(2);
      setBlockIndex(1);
      setSecondsRemaining(5 * 60);
      setPhase("break");
    } else if (preview === "complete") {
      setTotalBlocks(2);
      setRunSecondsStudied(50 * 60);
      setRunXpEarned(100);
      setRunCoinsEarned(50);
      setPhase("complete");
    } else if (preview === "reward") {
      // Shown again every 6 s (it closes itself after 4 s), so there is
      // time to look at it while the garden is still loading.
      const show = () => setReward({ xp: 50, coins: 25 });
      show();
      const interval = setInterval(show, 6000);
      return () => clearInterval(interval);
    }
  }, []);

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

  // The vine on the window frame (VineProgress) — overall study progress of the
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
  // With a single round there is nothing to look ahead to.
  const nextUp =
    blocksPlanned <= 1
      ? null
      : phase === "break"
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

  // Robin's line for a break: starts somewhere in the pool, moves on by
  // one with every round.
  const [quoteStart] = useState(() =>
    Math.floor(Math.random() * BREAK_QUOTES.length)
  );
  const breakQuote =
    BREAK_QUOTES[(quoteStart + blockIndex) % BREAK_QUOTES.length];
  // And his note when a run is done (one of a few, chosen once per visit).
  const [completeNote] = useState(
    () => COMPLETE_NOTES[Math.floor(Math.random() * COMPLETE_NOTES.length)]
  );

  // The run's result is shown on the shelf (slate and Robin's note), which
  // fullscreen hides — so a finished run leaves fullscreen.
  useEffect(() => {
    if (phase === "complete" && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, [phase]);

  const clockSeconds =
    phase === "idle" || secondsRemaining === null
      ? selectedMinutes.studyMinutes * 60
      : secondsRemaining;

  // Robin on the window sill: happy when a run is done, sad while a
  // session error is shown, otherwise calm (no hopping while you study).
  const robinMood: PerchMood =
    phase === "complete" ? "happy" : sessionError ? "sad" : "neutral";

  const board = (
    <TimerBoard
      phase={phase}
      paused={paused}
      secondsRemaining={secondsRemaining}
      displaySeconds={clockSeconds}
      nextUp={nextUp}
      progressPercent={
        showSessionBar ? Math.floor(sessionProgress * 100) : null
      }
      breakQuote={breakQuote}
      sessionId={sessionId}
      blockIndex={blockIndex}
      totalBlocks={totalBlocks}
      modeId={modeId}
      onModeChange={setModeId}
      customStudyMinutes={customStudyMinutes}
      onCustomStudyMinutesChange={setCustomStudyMinutes}
      customBreakMinutes={customBreakMinutes}
      onCustomBreakMinutesChange={setCustomBreakMinutes}
      repetitions={repetitions}
      onRepetitionsChange={setRepetitions}
      pauseToggling={pauseToggling}
      finishing={finishing}
      onTogglePause={handleTogglePause}
      onFinish={handleFinishSession}
      onEndBreak={handleEndBreak}
      error={sessionError}
      complete={
        <SessionComplete
          totalBlocks={totalBlocks}
          secondsStudied={runSecondsStudied}
          xpEarned={runXpEarned}
          coinsEarned={runCoinsEarned}
          error={sessionError}
          onReturn={handleReturnToStudyroom}
        />
      }
      completeNote={completeNote}
      reward={
        !isFullscreen && reward && phase !== "complete" ? (
          <RewardSlip
            xp={reward.xp}
            coins={reward.coins}
            onClose={() => setReward(null)}
          />
        ) : undefined
      }
    />
  );

  return (
    <PlaceBackdrop world="garden" className="room-viewport">
      <div ref={pageRef} className={styles.page}>
        {/* The nav already says where we are — keep the heading for
            screen readers only, so the window gets the height. */}
        <h1 className={styles.srOnly}>Studyroom</h1>

        <div className={styles.main}>
          {/* The window: the garden, uncovered. This element goes
              fullscreen (the countdown keeps running through the switch). */}
          <div ref={stageRef} className={styles.stage} data-phase={phase}>
            {fullscreenSupported && (
              <button
                type="button"
                className={styles.fullscreenButton}
                onClick={handleToggleFullscreen}
                aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                aria-pressed={isFullscreen}
              >
                {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
                <FocusFrame className={styles.fullscreenFocus} />
              </button>
            )}

            {/* Fullscreen hides the shelf, so the time comes along as a
                small framed slate in the corner. */}
            {isFullscreen && phase !== "complete" && (
              <div className={styles.fullscreenClock}>
                <span
                  role="timer"
                  aria-label="Time left"
                  data-surface="slate"
                  className={styles.fullscreenTime}
                  data-paused={paused ? "" : undefined}
                >
                  <TabularNumber>{formatTime(clockSeconds)}</TabularNumber>
                </span>
              </div>
            )}

            {gardenLoading && (
              <p className={styles.stageNotice}>Loading garden…</p>
            )}
            {gardenError && (
              <p
                role="alert"
                className={`${styles.error} ${styles.stageNotice}`}
              >
                {gardenError}
              </p>
            )}

            <GardenScene
              objects={gardenObjects}
              gridWidth={gridWidth}
              gridHeight={gridHeight}
              camera={{ region: STAGE_REGION, zoom: gardenCamera.zoom, offsetX: gardenCamera.offsetX, offsetY: gardenCamera.offsetY }}
              className={styles.garden}
            >
              {/* In fullscreen the shelf is hidden, so the reward slip is
                  taped over the garden instead of nailed to the slate. */}
              {isFullscreen && reward && phase !== "complete" && (
                <RewardSlip
                  xp={reward.xp}
                  coins={reward.coins}
                  onClose={() => setReward(null)}
                  fixing="tape"
                />
              )}
            </GardenScene>

            {/* The study progress grows as a vine up the left post and
                along the top rail (in fullscreen along the screen's
                edges). */}
            <VineProgress
              progress={sessionProgress}
              phase={
                phase === "complete"
                  ? "complete"
                  : showSessionBar
                    ? phase === "break"
                      ? "break"
                      : "focus"
                    : null
              }
              paused={paused}
            />
          </div>

          {/* The window sill, Robin on it. */}
          <div className={styles.sill}>
            <RobinPerch mood={robinMood} className={styles.robin} />
          </div>

          {/* The shelf: slate and sign, same bottom line on the plank; the
              crate at its right end. */}
          <div className={styles.shelf}>
            <div className={styles.things}>
              <div
                className={styles.slateGroup}
                data-sign={phase === "idle" || undefined}
              >
                <div className={styles.onShelf}>{board}</div>
                {phase === "idle" && (
                  <div className={`${styles.onShelf} ${styles.sign}`}>
                    <Button
                      onClick={handleStartRun}
                      loading={loading}
                      disabled={loading}
                    >
                      Start session
                    </Button>
                  </div>
                )}
              </div>
              {/* The Ambience crate at the plank's right end. */}
              <div className={`${styles.onShelf} ${styles.crateSlot}`}>
                <AmbienceCrate
                  worlds={worlds}
                  worldsError={worldsError}
                  level={level}
                />
              </div>
            </div>
            <ShelfPlank className={styles.plank} />
          </div>
        </div>

        {/* The to-do, nailed to the wall beside the window; on wide
            screens Robin's note of the moment hangs below it. */}
        <div className={styles.wallTodo}>
          <TodoNote />
          <BoardNote
            phase={phase}
            breakRunning={phase === "break" && secondsRemaining !== null}
            isComplete={phase === "complete"}
            breakQuote={breakQuote}
            completeNote={completeNote}
            className={styles.breakNoteOnWall}
          />
        </div>
      </div>
    </PlaceBackdrop>
  );
}
