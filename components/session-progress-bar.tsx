import styles from "./session-progress-bar.module.css";

type SessionPhase = "study" | "break";

type SessionProgressBarProps = {
  /** Progress of the current phase, 0–1. */
  progress: number;
  phase: SessionPhase;
  className?: string;
};

/**
 * Slim progress bar for a running study session, meant to sit over the
 * garden: a frosted-glass track (same pill shape as components/level-xp-bar)
 * with a warm cream fill. The break phase uses a muted fill so pause reads
 * clearly apart from study. No numbers inside — the timer shows those.
 */
export function SessionProgressBar({ progress, phase, className = "" }: SessionProgressBarProps) {
  const percent = Math.min(1, Math.max(0, progress)) * 100;

  return (
    <div
      className={[styles.track, className].filter(Boolean).join(" ")}
      role="progressbar"
      aria-label={phase === "break" ? "Break progress" : "Study progress"}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
    >
      <div
        className={[
          styles.fill,
          phase === "break" ? styles.fillBreak : "",
          percent > 0 ? styles.fillVisible : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
