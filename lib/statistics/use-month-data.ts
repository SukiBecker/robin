"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { monthId, monthOf, monthRange, type MonthKey } from "./calendar";

export type DayData = {
  seconds: number;
  /** null when v_daily_rewards couldn't be read — the XP row is hidden then. */
  xp: number | null;
};

type MonthData = Record<string, DayData>;

/**
 * Study time and earned XP per day for one calendar month: one range query
 * on v_daily_activity and one on v_daily_rewards, in parallel — never one
 * per day. Months already loaded are kept, so paging back and forth
 * doesn't refetch.
 */
export function useMonthData(userId: string, month: MonthKey) {
  const cache = useRef(new Map<string, MonthData>());
  const id = monthId(month);
  const [data, setData] = useState<MonthData | null>(() => cache.current.get(id) ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cached = cache.current.get(id);
    if (cached) {
      setData(cached);
      setError(null);
      return;
    }

    let cancelled = false;
    setData(null);
    setError(null);

    async function load() {
      const supabase = createClient();
      const { first, last } = monthRange(monthOf(`${id}-01`));

      const [activityResult, rewardsResult] = await Promise.all([
        supabase
          .from("v_daily_activity")
          .select("study_date, total_duration_seconds")
          .eq("profile_id", userId)
          .gte("study_date", first)
          .lte("study_date", last),
        supabase
          .from("v_daily_rewards")
          .select("reward_date, xp_earned")
          .eq("profile_id", userId)
          .gte("reward_date", first)
          .lte("reward_date", last),
      ]);

      if (cancelled) return;

      if (activityResult.error) {
        setError(activityResult.error.message);
        return;
      }

      // Rewards are a nice-to-have in the day summary — if the view is
      // missing or fails, the calendar still works, just without XP.
      const rewardsOk = !rewardsResult.error;
      const xpByDate = new Map(
        (rewardsResult.data ?? []).map((row) => [row.reward_date as string, Number(row.xp_earned)])
      );

      const days: MonthData = {};
      for (const row of activityResult.data ?? []) {
        days[row.study_date] = {
          seconds: Number(row.total_duration_seconds),
          xp: rewardsOk ? (xpByDate.get(row.study_date) ?? 0) : null,
        };
      }

      cache.current.set(id, days);
      setData(days);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [userId, id]);

  return { data, error };
}
