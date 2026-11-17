/**
 * Week helpers for the Journal's weekly stamps. Dates are "YYYY-MM-DD"
 * strings in the profile's timezone (like v_daily_activity and
 * v_weekly_study.week_start); all math runs in UTC so the browser's own
 * timezone never shifts a day.
 */

function toUtc(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function shiftDays(date: string, days: number): string {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateString(d);
}

/** Monday of the week that contains `date` (weeks start on Monday, like
    Postgres date_trunc('week', …)). */
export function mondayOf(date: string): string {
  const weekday = (toUtc(date).getUTCDay() + 6) % 7; // Monday = 0
  return shiftDays(date, -weekday);
}

/** The Mondays of the last `count` weeks, newest first (this week included). */
export function lastWeekStarts(today: string, count: number): string[] {
  const monday = mondayOf(today);
  return Array.from({ length: count }, (_, i) => shiftDays(monday, -7 * i));
}

/** ISO 8601 week number of the week starting at `monday`. */
export function isoWeek(monday: string): number {
  const thursday = toUtc(shiftDays(monday, 3));
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  return Math.floor((thursday.getTime() - yearStart) / 86_400_000 / 7) + 1;
}

const dayMonth = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", timeZone: "UTC" });

/** "Nov 9" — the Monday of a week, short. */
export function formatWeekStart(monday: string): string {
  return dayMonth.format(toUtc(monday));
}
