import { forwardRef, type ReactNode } from "react";
import { formatDayLabel } from "@/lib/statistics/calendar";
import { formatStudyTime } from "@/lib/statistics/format";
import type { DayData } from "@/lib/statistics/use-month-data";
import { XpIcon } from "./xp-icon";
import styles from "./day-summary.module.css";

type DaySummaryProps = {
  date: string;
  day: DayData;
  onClose: () => void;
  /** popover = floats at the day (desktop), inline = under the calendar. */
  variant: "popover" | "inline";
  style?: React.CSSProperties;
};

/**
 * Mini summary of one calendar day. Rows are a list on purpose: V2's
 * "tasks completed" (todos) becomes one more entry, nothing else changes.
 */
export const DaySummary = forwardRef<HTMLDivElement, DaySummaryProps>(function DaySummary(
  { date, day, onClose, variant, style },
  ref
) {
  const headingId = `day-summary-${date}`;

  const rows: { key: string; icon: ReactNode; text: string }[] = [
    { key: "time", icon: <ClockIcon />, text: `${formatStudyTime(day.seconds, "today")} studied` },
  ];
  if (day.xp !== null) {
    rows.push({ key: "xp", icon: <XpIcon size={18} />, text: `+${day.xp} XP` });
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-labelledby={headingId}
      tabIndex={-1}
      className={`${styles.panel} ${styles[variant]}`}
      style={style}
    >
      <div className={styles.header}>
        <h3 id={headingId} className={styles.date}>
          {formatDayLabel(date)}
        </h3>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close summary">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <ul className={styles.rows}>
        {rows.map((row) => (
          <li key={row.key} className={styles.row}>
            <span className={styles.icon}>{row.icon}</span>
            {row.text}
          </li>
        ))}
      </ul>
    </div>
  );
});

function ClockIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M10 6v4.2l2.8 1.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
