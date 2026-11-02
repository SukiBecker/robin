"use client";

import { useState } from "react";
import { formatStudyTime, type StudyTimeMode } from "@/lib/statistics/format";
import styles from "./study-time-stat.module.css";

const MODES: { id: StudyTimeMode; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "total", label: "Total" },
];

type StudyTimeStatProps = {
  todaySeconds: number;
  totalSeconds: number;
  /** app_config.streak_min_minutes_per_day — when today starts to count. */
  streakMinMinutes: number;
  /** With no streak, the streak tile already says how to start one. */
  streak: number;
};

/** "Time studied" with a Today | Total switch. Today is blossom, Total fern
    (--color-blossom / --color-fern), so the two never read as one number. */
export function StudyTimeStat({
  todaySeconds,
  totalSeconds,
  streakMinMinutes,
  streak,
}: StudyTimeStatProps) {
  const [mode, setMode] = useState<StudyTimeMode>("today");
  const seconds = mode === "today" ? todaySeconds : totalSeconds;

  return (
    <div className={styles.stat}>
      <div className={styles.header}>
        <span className={styles.label}>Time studied</span>
        <div className={styles.pills} role="radiogroup" aria-label="Time range">
          {MODES.map((m) => (
            <label
              key={m.id}
              className={`${styles.pill} ${mode === m.id ? styles[`${m.id}Selected`] : ""}`}
            >
              <input
                type="radio"
                name="study-time-mode"
                value={m.id}
                checked={mode === m.id}
                onChange={() => setMode(m.id)}
                className={styles.radio}
              />
              {m.label}
            </label>
          ))}
        </div>
      </div>

      {/* key re-mounts the value on switch → short crossfade, not a jump */}
      <span
        key={mode}
        className={`${styles.value} ${seconds === 0 ? styles.valueEmpty : styles[mode]}`}
        aria-live="polite"
      >
        {formatStudyTime(seconds, mode)}
      </span>

      <p className={styles.hint}>
        {mode === "today"
          ? todayHint(todaySeconds, streakMinMinutes, streak)
          : totalSeconds === 0
            ? "Every session you finish adds up here."
            : "All your finished sessions, added up."}
      </p>
    </div>
  );
}

function todayHint(todaySeconds: number, streakMinMinutes: number, streak: number): string {
  const remaining = Math.ceil((streakMinMinutes * 60 - todaySeconds) / 60);
  if (remaining <= 0) return "Today counts for your streak.";
  if (todaySeconds === 0) {
    return streak === 0
      ? "Nothing logged yet today."
      : `${streakMinMinutes} min today keeps your streak growing.`;
  }
  return `${remaining} min to go until today counts for your streak.`;
}
