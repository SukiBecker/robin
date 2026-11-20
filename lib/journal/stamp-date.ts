const dayMonth = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/**
 * "Nov 17" for the lower ring of the "Welcome" postmark (Journal empty
 * state, Sign-up success). In UTC, like the stamp dates from the database,
 * so Sign-up and the Journal print the same day for the same account.
 * Invalid input → "" (the ring stays empty).
 */
export function formatStampDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isFinite(date.getTime()) ? dayMonth.format(date) : "";
}
