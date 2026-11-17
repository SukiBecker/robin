"use client";

import { useState } from "react";
import { addMonths, compareMonths, monthOf } from "@/lib/statistics/calendar";
import { useMonthData } from "@/lib/statistics/use-month-data";
import { CalendarView } from "./calendar-view";

type JournalCalendarProps = {
  userId: string;
  /** IANA timezone of the profile (to-dos are bucketed into its days). */
  timezone: string;
  /** YYYY-MM-DD in the profile timezone. */
  today: string;
  /** Account creation date (profile timezone): no paging back before it. */
  firstDate: string;
  /** app_config.streak_min_minutes_per_day */
  streakMinMinutes: number;
};

/** The Journal calendar with its data: one month at a time, loaded by
    useMonthData; CalendarView draws it. */
export function JournalCalendar({
  userId,
  timezone,
  today,
  firstDate,
  streakMinMinutes,
}: JournalCalendarProps) {
  const currentMonth = monthOf(today);
  const firstMonth = monthOf(firstDate);
  const [month, setMonth] = useState(currentMonth);
  const { data, error } = useMonthData(userId, month, timezone);

  return (
    <CalendarView
      month={month}
      data={data}
      error={error}
      today={today}
      firstDate={firstDate}
      minSeconds={streakMinMinutes * 60}
      canGoBack={compareMonths(month, firstMonth) > 0}
      canGoForward={compareMonths(month, currentMonth) < 0}
      onMonthChange={(delta) => setMonth((m) => addMonths(m, delta))}
    />
  );
}
