"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGardenObjects } from "@/lib/garden/use-garden-objects";
import { GardenScene } from "@/components/garden-scene";
import { HOME_REGION } from "@/lib/garden/world";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { XpIcon } from "@/components/xp-icon";
import { SessionProgressBar } from "@/components/session-progress-bar";
import { XP_CHANGED_EVENT } from "@/lib/level-progress";
import styles from "./studyroom.module.css";


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
    setRunXpEarned((prev) => prev + (profileResult.data.xp - beforeProfile.xp));
    setRunCoinsEarned(
      (prev) => prev + (profileResult.data.coins - beforeProfile.coins)
    );
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
    setPhase("idle");
  }

  // Session progress bar over the garden — overall study progress of the
  // run, derived from the existing timer state (no extra state). Breaks
  // don't count: the value holds still during a break. Block length comes
  // from the mode's study minutes (inputs are hidden during a run, so they
  // can't change mid-run); totalBlocks is the run's snapshot of repetitions.
  const showSessionBar =
    (phase === "focus" || phase === "break") && secondsRemaining !== null;
  const blockSeconds =
    getModeMinutes(modeId, customStudyMinutes, customBreakMinutes).studyMinutes * 60;
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
    <div
      className={`${styles.page}`}
    >
      <h1 className={styles.eyebrow}>Studyroom</h1>

      {gardenLoading && <p className={styles.body}>Loading garden…</p>}
      {gardenError && (
        <p role="alert" className={styles.error}>
          {gardenError}
        </p>
      )}

      {/* Garden = background/main view; timer, mode selection, and session
          controls are overlaid on top as a floating panel, absolutely
          positioned in the scene's screen-space overlay — never a full
          opaque cover, so the garden stays visible and stays the point. */}
      <div className={styles.stage}>
        <GardenScene
          objects={gardenObjects}
          gridWidth={gridWidth}
          gridHeight={gridHeight}
          camera={{ region: HOME_REGION }}
          className={styles.garden}
        >
          {phase !== "complete" && (
            <div className={styles.panel}>
              {phase === "idle" && (
                <>
                  <span className={styles.sectionLabel}>Pomodoro mode</span>

                  <div className={styles.radioList}>
                    <label
                      className={`${styles.radioChip} ${
                        modeId === "50_10" ? styles.radioChipSelected : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="pomodoro-mode"
                        className={styles.srOnlyInput}
                        checked={modeId === "50_10"}
                        onChange={() => setModeId("50_10")}
                      />
                      50 min study / 10 min break
                    </label>

                    <label
                      className={`${styles.radioChip} ${
                        modeId === "25_5" ? styles.radioChipSelected : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="pomodoro-mode"
                        className={styles.srOnlyInput}
                        checked={modeId === "25_5"}
                        onChange={() => setModeId("25_5")}
                      />
                      25 min study / 5 min break
                    </label>

                    <label
                      className={`${styles.radioChip} ${
                        modeId === "flexible" ? styles.radioChipSelected : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="pomodoro-mode"
                        className={styles.srOnlyInput}
                        checked={modeId === "flexible"}
                        onChange={() => setModeId("flexible")}
                      />
                      Flexible
                    </label>
                  </div>

                  {modeId === "flexible" && (
                    <div className={styles.customFields}>
                      <label className={styles.fieldInline}>
                        Study minutes
                        <input
                          type="number"
                          min={1}
                          className={styles.miniInput}
                          value={customStudyMinutes}
                          onChange={(event) =>
                            setCustomStudyMinutes(Number(event.target.value))
                          }
                        />
                      </label>
                      <label className={styles.fieldInline}>
                        Break minutes
                        <input
                          type="number"
                          min={1}
                          className={styles.miniInput}
                          value={customBreakMinutes}
                          onChange={(event) =>
                            setCustomBreakMinutes(Number(event.target.value))
                          }
                        />
                      </label>
                    </div>
                  )}

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

                  <Button onClick={handleStartRun} disabled={loading}>
                    {loading ? "Starting…" : "Start Session"}
                  </Button>
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

                  <p className={styles.timer} data-phase="focus">
                    {formatTime(secondsRemaining)}
                  </p>

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

                  <p className={styles.timer} data-phase="break">
                    {formatTime(secondsRemaining)}
                  </p>

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

              {sessionError && (
                <p role="alert" className={styles.error}>
                  {sessionError}
                </p>
              )}
            </div>
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
