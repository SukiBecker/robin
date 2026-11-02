export type StudyTimeMode = "today" | "total";

/** Streak lengths that get the gold milestone treatment (and only those). */
export const STREAK_MILESTONES = [7, 30, 100] as const;

/**
 * "45 min" under an hour, "2h 15m" / "2h" above. Total switches to whole
 * hours ("124 h") from 100h on — minutes stop meaning anything there and
 * the number would no longer fit the tile on a phone.
 */
export function formatStudyTime(seconds: number, mode: StudyTimeMode): string {
  const totalMinutes = Math.floor(Math.max(seconds, 0) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} min`;
  if (mode === "total" && hours >= 100) return `${hours} h`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/**
 * Gold only on the day the milestone was actually reached: the streak sits
 * exactly on 7/30/100 AND that streak day is today (last_study_date in the
 * user's timezone). The morning after, before studying, it's plain again.
 */
export function isFreshStreakMilestone(
  streak: number,
  lastStudyDate: string | null,
  today: string
): boolean {
  return (
    (STREAK_MILESTONES as readonly number[]).includes(streak) && lastStudyDate === today
  );
}

/**
 * Today's date as YYYY-MM-DD in the given IANA timezone — the same bucket
 * v_daily_activity uses ((started_at at time zone profiles.timezone)::date).
 * "en-CA" formats as YYYY-MM-DD, matching what PostgREST returns for dates.
 */
export function todayInTimezone(timezone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now);
}
