import type { CSSProperties } from "react";
import { Button } from "@/components/journal/button";
import { GameIcon } from "@/components/journal/game-icon";
import { CountUp } from "./count-up";
import styles from "./studyroom.module.css";

type SessionCompleteProps = {
  totalBlocks: number;
  secondsStudied: number;
  xpEarned: number;
  coinsEarned: number;
  error: string | null;
  onReturn: () => void;
};

/** The run-complete moment, written in chalk on the timer's slate (the
    place's material for numbers): heading, the run's totals counting up —
    XP and coins each with their own icon — and the way back. Robin's
    note for this moment is nailed to the board's frame (TimerBoard). The
    loud part of the Studyroom, but the garden stays free; motion only
    without reduced motion, otherwise everything is simply there. */
export function SessionComplete({
  totalBlocks,
  secondsStudied,
  xpEarned,
  coinsEarned,
  error,
  onReturn,
}: SessionCompleteProps) {
  return (
    <div className={styles.complete}>
      <h2 className={styles.completeHeading}>Session complete</h2>
      <p className={styles.completeMeta}>
        {totalBlocks} {totalBlocks === 1 ? "round" : "rounds"} done
      </p>

      <dl className={styles.completeStats}>
        <div className={styles.stat} style={{ "--i": 0 } as CSSProperties}>
          <dt className={styles.statLabel}>Minutes</dt>
          <dd className={styles.statValue}>
            <CountUp value={Math.floor(secondsStudied / 60)} />
          </dd>
        </div>
        <div className={styles.stat} style={{ "--i": 1 } as CSSProperties}>
          <dt className={styles.statLabel}>XP</dt>
          <dd className={styles.statValue}>
            <GameIcon name="xp" size={24} />
            <CountUp value={xpEarned} />
          </dd>
        </div>
        <div className={styles.stat} style={{ "--i": 2 } as CSSProperties}>
          <dt className={styles.statLabel}>Coins</dt>
          <dd className={styles.statValue}>
            <GameIcon name="coin" size={24} />
            <CountUp value={coinsEarned} />
          </dd>
        </div>
      </dl>

      <div className={styles.completeAction}>
        <Button onClick={onReturn}>Return to Studyroom</Button>
      </div>

      {error && (
        <p role="alert" className={`${styles.error} ${styles.completeError}`}>
          {error}
        </p>
      )}
    </div>
  );
}
