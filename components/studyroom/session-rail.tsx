import type { CSSProperties } from "react";
import { InkRule } from "@/components/journal/ink";
import { TabularNumber } from "@/components/journal/tabular-number";
import styles from "./session-rail.module.css";

type SessionRailProps = {
  /** Study progress of the whole run, 0–1. Holds still during a break. */
  progress: number;
  phase: "focus" | "break";
  /** The timer is paused: the word says so; the line stays as it is. */
  paused?: boolean;
  className?: string;
};

/** The progress rail on the garden's bottom edge: a narrow strip of paper
    with a drawn ink line. Focus draws the done part as a firm green
    stroke; a break shows it dashed in muted ink, plus the word — so the
    phases differ by more than colour. Text stays on the paper, never on
    the garden. */
export function SessionRail({ progress, phase, paused = false, className = "" }: SessionRailProps) {
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
