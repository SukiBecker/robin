"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGardenObjects } from "@/lib/garden/use-garden-objects";
import { GardenView } from "@/components/garden-view";

type ProfileSummary = {
  xp: number;
  coins: number;
};

type PomodoroModeId = "50_10" | "25_5" | "flexible";

type Phase = "idle" | "focus" | "break";

export default function StudyroomPage() {
  // Same fetch logic as the Garden page — the studyroom's background is
  // the user's own live garden, per the product spec (docs/BLOOMLY.md §4).
  // Read-only here: no onContainerClick/onObjectClick passed to GardenView,
  // so placing/removing stays exclusive to the Garden page.
  const {
    objects: gardenObjects,
    loading: gardenLoading,
    error: gardenError,
  } = useGardenObjects();

  // Pomodoro mode selection lives here now (moved out of Settings) — it's
  // a per-session choice, not a persisted account setting, so it's plain
  // component state plus study_sessions.pomodoro_mode recording which mode
  // was used for a given session.
  const [modeId, setModeId] = useState<PomodoroModeId>("25_5");
  const [customStudyMinutes, setCustomStudyMinutes] = useState(25);
  const [customBreakMinutes, setCustomBreakMinutes] = useState(5);

  const [phase, setPhase] = useState<Phase>("idle");
  const [paused, setPaused] = useState(false);
  const [pendingBreakSeconds, setPendingBreakSeconds] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [pauseToggling, setPauseToggling] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [level, setLevel] = useState<number | null>(null);

  // Ticks the countdown for both the focus and the break phase — depends
  // only on `isTicking` (not secondsRemaining) so the interval isn't torn
  // down and recreated every second. Focus can be paused; break cannot.
  const isTicking = phase === "break" || (phase === "focus" && !paused);

  useEffect(() => {
    if (!isTicking) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) =>
        prev === null ? prev : Math.max(prev - 1, 0)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isTicking]);

  // The break countdown auto-ends (no confirmation needed, unlike finishing
  // a focus block) — it's purely client-side, never a study_sessions row.
  useEffect(() => {
    if (phase === "break" && secondsRemaining === 0) {
      setPhase("idle");
      setSecondsRemaining(null);
    }
  }, [phase, secondsRemaining]);

  async function handleStartSession() {
    setSessionError(null);
    setLoading(true);

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setSessionError("You must be signed in to start a session.");
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
    // it is never persisted, see the break-phase effect above and
    // handleFinishSession below.
    const { data, error: insertError } = await supabase
      .from("study_sessions")
      .insert({ profile_id: user.id, completed: false, pomodoro_mode: modeId })
      .select("id")
      .single();

    setLoading(false);

    if (insertError) {
      setSessionError(insertError.message);
      return;
    }

    setUserId(user.id);
    setSessionId(data.id);
    setPendingBreakSeconds(breakMinutes * 60);
    setSecondsRemaining(studyMinutes * 60);
    setPaused(false);
    setPhase("focus");
  }

  async function handleTogglePause() {
    if (!sessionId || pauseToggling) return;

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

  async function handleFinishSession() {
    if (!sessionId || !userId) return;

    setSessionError(null);
    setFinishing(true);

    const supabase = createClient();

    // All reward math (xp/coins/streak/growth/quests) runs server-side in
    // this RPC — the client only ever passes the session id. A stale or
    // foreign session id makes it raise (surfaced here as rpcError);
    // finishing an already-completed session is idempotent and just
    // returns the session again without erroring.
    const { error: rpcError } = await supabase.rpc("complete_study_session", {
      p_session_id: sessionId,
    });

    if (rpcError) {
      setFinishing(false);
      setSessionError(rpcError.message);
      return;
    }

    const [profileResult, profileWithLevelResult] = await Promise.all([
      supabase.from("profiles").select("xp, coins").eq("id", userId).single(),
      supabase
        .from("profiles_with_level")
        .select("level")
        .eq("id", userId)
        .single(),
    ]);

    setFinishing(false);

    if (profileResult.error) {
      setSessionError(profileResult.error.message);
      return;
    }

    if (profileWithLevelResult.error) {
      setSessionError(profileWithLevelResult.error.message);
      return;
    }

    setProfile(profileResult.data);
    setLevel(profileWithLevelResult.data.level);
    setSessionId(null);

    // This study_sessions row is now completed and rewarded (duration
    // computed by the RPC ends exactly here). The break that follows is a
    // plain client-side countdown — no row, no RPC call — so break time is
    // never included in any duration_seconds or reward calculation.
    if (pendingBreakSeconds > 0) {
      setPhase("break");
      setSecondsRemaining(pendingBreakSeconds);
    } else {
      setPhase("idle");
      setSecondsRemaining(null);
    }
  }

  return (
    <section>
      <h1>Studyroom</h1>

      {gardenLoading && <p>Loading garden…</p>}
      {gardenError && <p role="alert">{gardenError}</p>}

      {/* Garden = background/main view; timer, mode selection, and session
          controls are overlaid on top as the foreground, absolutely
          positioned inside the same (relatively positioned) container
          GardenView renders. */}
      <GardenView objects={gardenObjects} height="600px">
        <div style={{ position: "absolute", top: 16, left: 16 }}>
          {phase === "idle" && (
            <div>
              <p>Pomodoro mode</p>
              <label>
                <input
                  type="radio"
                  name="pomodoro-mode"
                  checked={modeId === "50_10"}
                  onChange={() => setModeId("50_10")}
                />{" "}
                50 min study / 10 min break
              </label>
              <br />
              <label>
                <input
                  type="radio"
                  name="pomodoro-mode"
                  checked={modeId === "25_5"}
                  onChange={() => setModeId("25_5")}
                />{" "}
                25 min study / 5 min break
              </label>
              <br />
              <label>
                <input
                  type="radio"
                  name="pomodoro-mode"
                  checked={modeId === "flexible"}
                  onChange={() => setModeId("flexible")}
                />{" "}
                Flexible
              </label>

              {modeId === "flexible" && (
                <div>
                  <label>
                    Study minutes:{" "}
                    <input
                      type="number"
                      min={1}
                      value={customStudyMinutes}
                      onChange={(event) =>
                        setCustomStudyMinutes(Number(event.target.value))
                      }
                    />
                  </label>
                  <br />
                  <label>
                    Break minutes:{" "}
                    <input
                      type="number"
                      min={1}
                      value={customBreakMinutes}
                      onChange={(event) =>
                        setCustomBreakMinutes(Number(event.target.value))
                      }
                    />
                  </label>
                </div>
              )}

              <p>
                <button
                  type="button"
                  onClick={handleStartSession}
                  disabled={loading}
                >
                  {loading ? "Starting…" : "Start Session"}
                </button>
              </p>
            </div>
          )}

          {phase === "focus" && sessionId && secondsRemaining !== null && (
            <div>
              <p>{paused ? "Focus (paused)" : "Focus"}</p>
              <p
                style={{ fontSize: "3rem", fontVariantNumeric: "tabular-nums" }}
              >
                {formatTime(secondsRemaining)}
              </p>
              <p>Session id: {sessionId}</p>
              <button
                type="button"
                onClick={handleTogglePause}
                disabled={pauseToggling}
              >
                {pauseToggling ? "…" : paused ? "Continue" : "Pause"}
              </button>{" "}
              <button
                type="button"
                onClick={handleFinishSession}
                disabled={finishing}
              >
                {finishing ? "Ending…" : "End Session"}
              </button>
            </div>
          )}

          {phase === "break" && secondsRemaining !== null && (
            <div>
              <p>Break</p>
              <p
                style={{ fontSize: "3rem", fontVariantNumeric: "tabular-nums" }}
              >
                {formatTime(secondsRemaining)}
              </p>
            </div>
          )}

          {profile && level !== null && (
            <p>
              XP: {profile.xp} · Coins: {profile.coins} · Level: {level}
            </p>
          )}

          {sessionError && <p role="alert">{sessionError}</p>}
        </div>
      </GardenView>
    </section>
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
