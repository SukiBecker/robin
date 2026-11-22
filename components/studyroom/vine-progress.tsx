import type { CSSProperties } from "react";
import styles from "./vine-progress.module.css";

type VineProgressProps = {
  /** Study progress of the whole run, 0–1. Holds still in a break. */
  progress: number;
  /** null: no session — only a small shoot bottom left. */
  phase: "focus" | "break" | "complete" | null;
  paused?: boolean;
};

/** Where the blooms open at the end of a run: on the left post (share of
    its height, from the bottom) and along the top rail (share of its
    length, from the left). They open one after another. */
const BLOOMS = [
  { side: "left", at: 0.22 },
  { side: "left", at: 0.55 },
  { side: "left", at: 0.86 },
  { side: "top", at: 0.2 },
  { side: "top", at: 0.5 },
  { side: "top", at: 0.78 },
] as const;

/**
 * The study progress as a vine on the window frame (replaces the
 * progress rail; docs/studyroom-schuppen-plan.md §3.1). It starts bottom
 * left, climbs the left post and then runs along the top rail; the right
 * post stays free (Robin sits there). First half of the run = the post,
 * second half = the rail. Without a session only a small shoot shows
 * where it will grow. At the end of a run blooms open one by one.
 *
 * PLACEHOLDER: a repeating drawn stem with leaves, revealed with
 * clip-path as the run goes on. Later a painted vine.png, revealed by a
 * mask along the path, and painted blooms (vine-bloom.webp).
 *
 * The progress changes once a second in small steps, so nothing is
 * animated except the blooms (only without reduced motion). Phase and
 * percent are not written on the wall (no text on illustration); the
 * slate shows them, screen readers get them here.
 */
export function VineProgress({
  progress,
  phase,
  paused = false,
}: VineProgressProps) {
  const p =
    phase === "complete"
      ? 1
      : phase === null || !Number.isFinite(progress)
        ? 0
        : Math.min(1, Math.max(0, progress));
  const left = Math.min(1, p * 2);
  const top = Math.max(0, p * 2 - 1);
  // Floored, so it never reads 100 % before the run is actually done.
  const percent = phase === "complete" ? 100 : Math.floor(p * 100);
  const state =
    phase === "complete"
      ? "done"
      : paused
        ? "paused"
        : phase === "break"
          ? "break"
          : null;

  return (
    <div
      className={styles.vine}
      data-phase={phase ?? undefined}
      style={{ "--vine-left": left, "--vine-top": top } as CSSProperties}
      {...(phase === null
        ? { "aria-hidden": true }
        : {
            role: "progressbar",
            "aria-label": "Study progress",
            "aria-valuemin": 0,
            "aria-valuemax": 100,
            "aria-valuenow": percent,
            "aria-valuetext": `${percent} %${state ? `, ${state}` : ""}`,
          })}
    >
      <span className={styles.left} />
      <span className={styles.top}>
        {top > 0 && <span className={styles.tip} />}
      </span>
      {phase === "complete" &&
        BLOOMS.map((bloom, i) => (
          <span
            key={i}
            className={styles.bloom}
            data-side={bloom.side}
            style={{ "--at": bloom.at, "--i": i } as CSSProperties}
          />
        ))}
    </div>
  );
}
