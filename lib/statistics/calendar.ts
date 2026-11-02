/**
 * Pure month-calendar helpers for the Statistics "Day streak" calendar.
 * Dates are plain "YYYY-MM-DD" strings — the same shape v_daily_activity
 * returns — and all math runs in UTC so the browser's own timezone never
 * shifts a day. "Today" is passed in, already resolved in the user's
 * profile timezone (see todayInTimezone).
 */

/**
 * What a calendar day shows. V1 has no Streak Freezer yet; it plugs in as
 * a further state ("frozen", from streak_freezer_log) plus one LEGEND_ITEMS
 * entry and one CSS class — the grid and cells don't change.
 */
export type DayState = "future" | "none" | "partial" | "studied";

/** Legend under the calendar, in display order. */
export const LEGEND_ITEMS: { state: DayState; label: string }[] = [
  { state: "studied", label: "Studied" },
];

/** month is 1–12. */
export type MonthKey = { year: number; month: number };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function daysInMonth({ year, month }: MonthKey): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthOf(date: string): MonthKey {
  const [year, month] = date.split("-").map(Number);
  return { year, month };
}

export function monthId({ year, month }: MonthKey): string {
  return `${year}-${pad(month)}`;
}

export function addMonths({ year, month }: MonthKey, delta: number): MonthKey {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** < 0 if a is before b, 0 if the same month, > 0 if after. */
export function compareMonths(a: MonthKey, b: MonthKey): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

/** First and last date of the month, for one range query per month. */
export function monthRange(m: MonthKey): { first: string; last: string } {
  return {
    first: toDateString(m.year, m.month, 1),
    last: toDateString(m.year, m.month, daysInMonth(m)),
  };
}

/**
 * The month as calendar cells, weeks starting on Monday: null for the
 * blanks before the 1st and after the last day, so the length is always a
 * multiple of 7.
 */
export function buildMonthGrid(m: MonthKey): (string | null)[] {
  const sundayFirst = new Date(Date.UTC(m.year, m.month - 1, 1)).getUTCDay();
  const leading = (sundayFirst + 6) % 7; // Monday = 0
  const cells: (string | null)[] = Array(leading).fill(null);
  for (let day = 1; day <= daysInMonth(m); day++) {
    cells.push(toDateString(m.year, m.month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * A day counts as studied once its total reaches the streak threshold
 * (app_config.streak_min_minutes_per_day) — the same rule sync_streak uses.
 * Anything above 0 but below it is "partial".
 */
export function getDayState(
  date: string,
  today: string,
  seconds: number,
  minSeconds: number
): DayState {
  if (date > today) return "future";
  if (seconds >= minSeconds && seconds > 0) return "studied";
  if (seconds > 0) return "partial";
  return "none";
}

export function formatMonthLabel({ year, month }: MonthKey): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

/** "August 6" */
export function formatDayLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
