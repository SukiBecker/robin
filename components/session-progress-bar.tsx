import styles from "./session-progress-bar.module.css";

type SessionPhase = "study" | "break";

type SessionProgressBarProps = {
  /** Progress, 0–1. */
  progress: number;
  phase: SessionPhase;
  /** Show the floored percentage beside the bar. */
  showPercent?: boolean;
  className?: string;
};

/**
 * Slim progress bar for a running study session, meant to sit over the
 * garden: a frosted-glass track (pill shape)
 * with a warm cream fill. The break phase uses a muted fill so pause reads
 * clearly apart from study. The optional percentage sits beside the track
 * (never on it); the track shrinks to make room.
 */
export function SessionProgressBar({
  progress,
  phase,
  showPercent = false,
  className = "",
}: SessionProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  // Floored, so it never reads 100 % before the run is actually done.
  const percent = Math.floor(clamped * 100);

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      <div
        className={styles.track}
        role="progressbar"
        aria-label={phase === "break" ? "Study progress (break)" : "Study progress"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className={[
            styles.fill,
            phase === "break" ? styles.fillBreak : "",
            clamped > 0 ? styles.fillVisible : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ width: `${clamped * 100}%` }}
        />
      </div>

      {showPercent && (
        <span
          className={[styles.percent, phase === "break" ? styles.percentBreak : ""]
            .filter(Boolean)
            .join(" ")}
          aria-hidden="true"
        >
          {percent}%
        </span>
      )}
    </div>
  );
}
