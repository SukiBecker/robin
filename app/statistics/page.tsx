"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Alert } from "@/components/alert";
import { Card } from "@/components/card";
import { PageShell } from "@/components/page-shell";
import styles from "./statistics.module.css";


type DailyActivity = {
  study_date: string; // date, e.g. "2026-08-25"
  total_duration_seconds: number;
};

export default function StatisticsPage() {
  const [activity, setActivity] = useState<DailyActivity[] | null>(null);
  const [timezone, setTimezone] = useState("UTC");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      setLoading(true);

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

      // v_daily_activity buckets each day using the profile's own timezone
      // ((started_at at time zone profiles.timezone)::date) — fetched here
      // too, so "today" is computed the same way client-side.
      const [profileResult, activityResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("timezone")
          .eq("id", user.id)
          .single(),
        supabase
          .from("v_daily_activity")
          .select("study_date, total_duration_seconds")
          .eq("profile_id", user.id),
      ]);

      if (cancelled) return;

      setLoading(false);

      if (profileResult.error) {
        setError(profileResult.error.message);
        return;
      }

      if (activityResult.error) {
        setError(activityResult.error.message);
        return;
      }

      setTimezone(profileResult.data.timezone);
      setActivity(activityResult.data);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const todayDate = getTodayDateString(timezone);
  const todaySeconds =
    activity?.find((row) => row.study_date === todayDate)
      ?.total_duration_seconds ?? 0;
  const totalSeconds =
    activity?.reduce((sum, row) => sum + row.total_duration_seconds, 0) ?? 0;

  return (
    <PageShell title="Statistics" width="wide">
      {loading && <p className={styles.body}>Loading…</p>}
      <Alert variant="error">{error}</Alert>

      {!loading && !error && (
        <div className={styles.statsGrid}>
          <Card padding="sm" label="Today">
            <span className={`${styles.statValue} ${styles.statValueToday}`}>
              {formatDuration(todaySeconds)}
            </span>
          </Card>
          <Card padding="sm" label="Total">
            <span className={`${styles.statValue} ${styles.statValueTotal}`}>
              {formatDuration(totalSeconds)}
            </span>
          </Card>
        </div>
      )}
    </PageShell>
  );
}

function getTodayDateString(timezone: string): string {
  // "en-CA" formats as YYYY-MM-DD, matching the date string PostgREST
  // returns for v_daily_activity.study_date.
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(
    new Date()
  );
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours === 0 ? `${minutes} min` : `${hours} h ${minutes} min`;
}
