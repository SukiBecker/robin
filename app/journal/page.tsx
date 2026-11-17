"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Alert } from "@/components/alert";
import { JournalSpread } from "@/components/journal/journal-spread";
import { JourneySummary } from "@/components/journal-page/journey-summary";
import { PageShell } from "@/components/page-shell";
import { EmptyPage } from "@/components/journal-page/empty-page";
import { JournalCalendar } from "@/components/journal-page/journal-calendar";
import { JourneyPage } from "@/components/journal-page/journey-page";
import { STREAK_SYNCED_EVENT } from "@/components/streak-sync";
import {
  isFreshStreakMilestone,
  todayInTimezone,
} from "@/lib/statistics/format";
import styles from "./journal.module.css";

type Profile = {
  id: string;
  created_at: string;
  current_streak: number;
  level: number;
  xp: number;
  timezone: string;
  last_study_date: string | null;
};

type DailyActivity = {
  study_date: string; // date, e.g. "2026-08-25"
  total_duration_seconds: number;
};

// Fallback if app_config has no row — same value as the schema seed.
const DEFAULT_STREAK_MIN_MINUTES = 15;

export default function StatisticsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activity, setActivity] = useState<DailyActivity[]>([]);
  const [streakMinMinutes, setStreakMinMinutes] = useState(
    DEFAULT_STREAK_MIN_MINUTES
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // showLoading = false: quiet refetch after the streak sync, no flash.
    async function load(showLoading = true) {
      setError(null);
      if (showLoading) setLoading(true);

      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!cancelled) {
          setLoading(false);
          setError("You must be signed in to view statistics.");
        }
        return;
      }

      // Level always from profiles_with_level (never computed here). The
      // profile's timezone is needed so "today" is bucketed exactly like
      // v_daily_activity does ((started_at at time zone timezone)::date).
      const [profileResult, activityResult, configResult] = await Promise.all([
        supabase
          .from("profiles_with_level")
          .select(
            "id, created_at, current_streak, level, xp, timezone, last_study_date"
          )
          .eq("id", user.id)
          .single(),
        supabase
          .from("v_daily_activity")
          .select("study_date, total_duration_seconds")
          .eq("profile_id", user.id),
        supabase
          .from("app_config")
          .select("value")
          .eq("key", "streak_min_minutes_per_day")
          .maybeSingle(),
      ]);

      if (cancelled) return;

      setLoading(false);

      const firstError = profileResult.error ?? activityResult.error;
      if (firstError) {
        setError(firstError.message);
        return;
      }

      setProfile(profileResult.data);
      setActivity(activityResult.data ?? []);
      const minMinutes = Number(configResult.data?.value);
      if (Number.isFinite(minMinutes) && minMinutes > 0)
        setStreakMinMinutes(minMinutes);
    }

    load();
    const reload = () => load(false);
    window.addEventListener(STREAK_SYNCED_EVENT, reload);

    return () => {
      cancelled = true;
      window.removeEventListener(STREAK_SYNCED_EVENT, reload);
    };
  }, []);

  const today = profile ? todayInTimezone(profile.timezone) : null;
  const todaySeconds =
    activity.find((row) => row.study_date === today)?.total_duration_seconds ??
    0;
  // v_daily_activity only counts completed sessions, so its sum is the
  // total over all completed study_sessions.
  const totalSeconds = activity.reduce(
    (sum, row) => sum + row.total_duration_seconds,
    0
  );

  // Brand new: no streak and no study time at all.
  const isNewUser =
    profile !== null && profile.current_streak === 0 && totalSeconds === 0;

  return (
    <PageShell width="spread">
      <h1 className={styles.srOnly}>Journal</h1>
      {loading && <p className={styles.body}>Loading…</p>}
      <Alert variant="error">{error}</Alert>

      {!loading && !error && profile && today && (
        // Left page: streak, today/total, calendar — or, before the very
        // first session, a blank page with Robin's note. Right page: the
        // journey (seed jar, next stop, stamps; weekly stamps once there
        // is something to count).
        <JournalSpread
          aria-label="Journal"
          className={styles.book}
          left={
            isNewUser ? (
              <EmptyPage streakMinMinutes={streakMinMinutes} />
            ) : (
              <>
                <JourneySummary
                  streak={profile.current_streak}
                  todaySeconds={todaySeconds}
                  totalSeconds={totalSeconds}
                  streakMinMinutes={streakMinMinutes}
                  milestone={isFreshStreakMilestone(
                    profile.current_streak,
                    profile.last_study_date,
                    today
                  )}
                />
                <JournalCalendar
                  userId={profile.id}
                  timezone={profile.timezone}
                  today={today}
                  firstDate={todayInTimezone(
                    profile.timezone,
                    new Date(profile.created_at)
                  )}
                  streakMinMinutes={streakMinMinutes}
                />
              </>
            )
          }
          right={
            <JourneyPage
              userId={profile.id}
              today={today}
              xp={profile.xp}
              level={profile.level}
              empty={isNewUser}
            />
          }
        />
      )}
    </PageShell>
  );
}
