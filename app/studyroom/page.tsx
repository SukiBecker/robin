"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ProfileSummary = {
  xp: number;
  coins: number;
};

export default function StudyroomPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [level, setLevel] = useState<number | null>(null);

  // Ticks the countdown once a session is running. Depends only on
  // sessionId (not secondsRemaining) so the interval isn't torn down and
  // recreated every second.
  useEffect(() => {
    if (sessionId === null) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) =>
        prev === null ? prev : Math.max(prev - 1, 0)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionId]);

  async function handleStartSession() {
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setError("You must be signed in to start a session.");
      return;
    }

    // completed defaults to false and RLS requires it explicitly; ended_at/
    // duration are set later, exclusively via the complete_study_session() RPC.
    // focus_minutes seeds the countdown only — no timer state is written back.
    const [sessionResult, settingsResult] = await Promise.all([
      supabase
        .from("study_sessions")
        .insert({ profile_id: user.id, completed: false })
        .select("id")
        .single(),
      supabase
        .from("study_room_settings")
        .select("focus_minutes")
        .eq("profile_id", user.id)
        .single(),
    ]);

    setLoading(false);

    if (sessionResult.error) {
      setError(sessionResult.error.message);
      return;
    }

    if (settingsResult.error) {
      setError(settingsResult.error.message);
      return;
    }

    setUserId(user.id);
    setSessionId(sessionResult.data.id);
    setSecondsRemaining(settingsResult.data.focus_minutes * 60);
  }

  async function handleFinishSession() {
    if (!sessionId || !userId) return;

    setError(null);
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
      setError(rpcError.message);
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
      setError(profileResult.error.message);
      return;
    }

    if (profileWithLevelResult.error) {
      setError(profileWithLevelResult.error.message);
      return;
    }

    setProfile(profileResult.data);
    setLevel(profileWithLevelResult.data.level);
    setSessionId(null);
    setSecondsRemaining(null);
  }

  return (
    <section>
      <h1>Studyroom</h1>

      {sessionId && secondsRemaining !== null ? (
        <div>
          <p style={{ fontSize: "3rem", fontVariantNumeric: "tabular-nums" }}>
            {formatTime(secondsRemaining)}
          </p>
          <p>Session id: {sessionId}</p>
          <button
            type="button"
            onClick={handleFinishSession}
            disabled={finishing}
          >
            {finishing ? "Finishing…" : "Finish Session"}
          </button>
        </div>
      ) : (
        <button type="button" onClick={handleStartSession} disabled={loading}>
          {loading ? "Starting…" : "Start Session"}
        </button>
      )}

      {profile && level !== null && (
        <p>
          XP: {profile.xp} · Coins: {profile.coins} · Level: {level}
        </p>
      )}

      {error && <p role="alert">{error}</p>}
    </section>
  );
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
