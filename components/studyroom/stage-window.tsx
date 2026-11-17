import { TabularNumber } from "@/components/journal/tabular-number";
import { RefreshIcon } from "./icons";
import { formatTime, type Phase } from "./session";
import styles from "./studyroom.module.css";

type StageWindowProps = {
  phase: Phase;
  /** Seconds shown in the countdown. */
  seconds: number;
  nextUp: string;
};

/** The glass window on the garden: countdown, what comes next, a quote. */
export function StageWindow({ phase, seconds, nextUp }: StageWindowProps) {
  return (
    <div className={styles.stageWindow}>
      <p className={styles.timer} data-phase={phase}>
        <TabularNumber>{formatTime(seconds)}</TabularNumber>
      </p>
      <p className={styles.nextUp}>
        <span className={styles.nextUpLabel}>Next up:</span> {nextUp}
      </p>

      <hr className={styles.windowDivider} />

      <div className={styles.quoteRow}>
        <p className={styles.quote}>
          “Small steps every day add up to big results.”
        </p>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="New quote"
        >
          <RefreshIcon />
        </button>
      </div>
    </div>
  );
}
