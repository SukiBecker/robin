import type { CSSProperties, ReactNode, Ref } from "react";
import { Button } from "@/components/journal/button";
import { GameIcon } from "@/components/journal/game-icon";
import { PaperPanel } from "@/components/journal/paper-panel";
import { formatDayLabel } from "@/lib/statistics/calendar";
import { formatStudyTime } from "@/lib/statistics/format";
import type { DayData } from "@/lib/statistics/use-month-data";
import styles from "./day-note.module.css";

type DayNoteProps = {
  date: string;
  day: DayData;
  onClose: () => void;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
};

/** One calendar day as a small note taped into the journal: study time,
    to-dos done, XP — and the feather when a freezer kept the streak. Rows
    are a list, so more facts can join later without changing the note. */
export function DayNote({ date, day, onClose, className = "", style, ref }: DayNoteProps) {
  const headingId = `day-note-${date}`;
  const rows: { key: string; icon?: ReactNode; text: string }[] = [];

  if (day.seconds > 0) {
    rows.push({ key: "time", text: `${formatStudyTime(day.seconds, "today")} studied` });
  }
  if (day.frozen) {
    rows.push({
      key: "freezer",
      icon: <GameIcon name="freezer" size={16} />,
      text: "A freezer kept your streak",
    });
  }
  if (day.todos !== null && day.todos > 0) {
    rows.push({ key: "todos", text: `${day.todos} ${day.todos === 1 ? "to-do" : "to-dos"} done` });
  }
  if (day.xp !== null && day.xp > 0) {
    rows.push({ key: "xp", icon: <GameIcon name="xp" size={16} />, text: `+${day.xp} XP` });
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-labelledby={headingId}
      tabIndex={-1}
      className={`${styles.note} ${className}`}
      style={style}
    >
      <PaperPanel padding="sm" tape="top" tilt={1} className={styles.paper}>
        <h3 id={headingId} className={styles.date}>
          {formatDayLabel(date)}
        </h3>
        <ul className={styles.rows}>
          {rows.map((row) => (
            <li key={row.key} className={styles.row}>
              {row.icon ?? <span className={styles.bullet} aria-hidden="true" />}
              {row.text}
            </li>
          ))}
        </ul>
        <Button variant="quiet" onClick={onClose} className={styles.close}>
          Close
        </Button>
      </PaperPanel>
    </div>
  );
}
