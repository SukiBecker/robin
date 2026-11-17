"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { monthId, monthOf, monthRange, type MonthKey } from "./calendar";
import { todayInTimezone } from "./format";

export type DayData = {
  seconds: number;
  /** null when v_daily_rewards couldn't be read — the XP row is hidden then. */
  xp: number | null;
  /** To-dos completed that day; null when todos couldn't be read. */
  todos: number | null;
  /** A Streak Freezer was used for this day (streak_freezer_log). */
  frozen: boolean;
};

export type MonthData = Record<string, DayData>;

/** Shift a YYYY-MM-DD date by whole days (UTC math, no browser timezone). */
function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * Everything the Journal calendar shows for one month, in four range
 * queries in parallel — never one per day: study time (v_daily_activity),
 * XP (v_daily_rewards), freezer days (streak_freezer_log) and completed
 * to-dos (todos.completed_at, bucketed into days in the profile's
 * timezone like v_daily_activity). Months already loaded are kept, so
 * paging back and forth doesn't refetch.
 */
export function useMonthData(userId: string, month: MonthKey, timezone: string) {
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

      const [activityResult, rewardsResult, freezerResult, todosResult] = await Promise.all([
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
        supabase
          .from("streak_freezer_log")
          .select("applied_for_date")
          .eq("profile_id", userId)
          .gte("applied_for_date", first)
          .lte("applied_for_date", last),
        // A day of margin on both sides covers every timezone offset; the
        // exact day is decided below in the profile's timezone.
        supabase
          .from("todos")
          .select("completed_at")
          .eq("profile_id", userId)
          .eq("done", true)
          .gte("completed_at", `${shiftDate(first, -1)}T00:00:00Z`)
          .lt("completed_at", `${shiftDate(last, 2)}T00:00:00Z`),
      ]);

      if (cancelled) return;

      if (activityResult.error) {
        setError(activityResult.error.message);
        return;
      }

      // XP, freezer and to-dos are extras in the summary — if one of them
      // fails, the calendar still works, just without that part.
      const rewardsOk = !rewardsResult.error;
      const todosOk = !todosResult.error;
      const xpByDate = new Map(
        (rewardsResult.data ?? []).map((row) => [row.reward_date as string, Number(row.xp_earned)])
      );
      const frozenDates = new Set(
        (freezerResult.data ?? []).map((row) => row.applied_for_date as string)
      );
      const todosByDate = new Map<string, number>();
      for (const row of todosResult.data ?? []) {
        if (!row.completed_at) continue;
        const date = todayInTimezone(timezone, new Date(row.completed_at));
        if (date < first || date > last) continue;
        todosByDate.set(date, (todosByDate.get(date) ?? 0) + 1);
      }

      const secondsByDate = new Map(
        (activityResult.data ?? []).map((row) => [
          row.study_date as string,
          Number(row.total_duration_seconds),
        ])
      );

      const dates = new Set([...secondsByDate.keys(), ...frozenDates, ...todosByDate.keys()]);
      const days: MonthData = {};
      for (const date of dates) {
        days[date] = {
          seconds: secondsByDate.get(date) ?? 0,
          xp: rewardsOk ? (xpByDate.get(date) ?? 0) : null,
          todos: todosOk ? (todosByDate.get(date) ?? 0) : null,
          frozen: frozenDates.has(date),
        };
      }

      cache.current.set(id, days);
      setData(days);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [userId, id, timezone]);

  return { data, error };
}
