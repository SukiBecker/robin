import type { CSSProperties } from "react";
import { InkRule } from "@/components/journal/ink";
import { TabularNumber } from "@/components/journal/tabular-number";
import styles from "./session-rail.module.css";

type SessionRailProps = {
  /** Study progress of the whole run, 0–1. Holds still during a break. */
  progress: number;
  /** null: no session — just the bare wooden edge, nothing to read. */
  phase: "focus" | "break" | null;
  /** The timer is paused: the word says so; the line stays as it is. */
  paused?: boolean;
  className?: string;
};

/** The progress rail: the potting bench's back edge toward the garden, a
    darker wooden lath across the full width (robin-design §3: linear
    progress, place material). The way to go is a fine chalk line, the way
    done a firm chalk stroke; in a break it is dashed and the word says
    "Break" — so the phases differ by more than colour. Without a session
    it is only the wooden edge. In fullscreen the stage shows the same
    lath at its bottom. */
export function SessionRail({ progress, phase, paused = false, className = "" }: SessionRailProps) {
  if (phase === null) {
    return <div className={`${styles.rail} ${className}`} aria-hidden="true" />;
  }

  const clamped = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  // Floored, so it never reads 100 % before the run is actually done.
  const percent = Math.floor(clamped * 100);
  const isBreak = phase === "break";

  return (
    <div
      className={`${styles.rail} ${className}`}
      data-phase={phase}
      style={{ "--rail-p": clamped } as CSSProperties}
    >
      <span className={styles.phase} aria-hidden>
        {paused ? "Paused" : isBreak ? "Break" : "Focus"}
      </span>
      <div
        className={styles.track}
        role="progressbar"
        aria-label={isBreak ? "Study progress (break)" : "Study progress"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent} %${isBreak ? ", break" : ""}`}
      >
        <InkRule className={styles.line} />
        <InkRule className={styles.done} />
      </div>
      <span className={styles.percent} aria-hidden>
        <TabularNumber>{`${percent}`}</TabularNumber>%
      </span>
    </div>
  );
}
