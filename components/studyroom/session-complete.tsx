import { useState, type CSSProperties } from "react";
import { Button } from "@/components/journal/button";
import { GameIcon } from "@/components/journal/game-icon";
import { PaperPanel } from "@/components/journal/paper-panel";
import { RobinNote } from "@/components/journal/robin-note";
import { CountUp } from "./count-up";
import { COMPLETE_NOTES } from "./session";
import styles from "./studyroom.module.css";

type SessionCompleteProps = {
  totalBlocks: number;
  secondsStudied: number;
  xpEarned: number;
  coinsEarned: number;
  error: string | null;
  onReturn: () => void;
};

/** The run-complete moment on the stage: one slip of paper with the run's
    totals counting up (XP and coins each with their own icon), Robin's
    note, and the way back. The loud part of the Studyroom — only with
    motion allowed; otherwise everything is simply there. */
export function SessionComplete({
  totalBlocks,
  secondsStudied,
  xpEarned,
  coinsEarned,
  error,
  onReturn,
}: SessionCompleteProps) {
  const [note] = useState(() => COMPLETE_NOTES[Math.floor(Math.random() * COMPLETE_NOTES.length)]);

  return (
    <div className={styles.completeOverlay}>
      <PaperPanel tape="top" padding="lg" className={styles.completeCard}>
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
              <GameIcon name="xp" size={24} className={styles.statIcon} />
              <CountUp value={xpEarned} />
            </dd>
          </div>
          <div className={styles.stat} style={{ "--i": 2 } as CSSProperties}>
            <dt className={styles.statLabel}>Coins</dt>
            <dd className={styles.statValue}>
              <GameIcon name="coin" size={24} className={styles.statIcon} />
              <CountUp value={coinsEarned} />
            </dd>
          </div>
        </dl>

        <RobinNote mood="happy" className={styles.completeNote}>
          {note}
        </RobinNote>

        <Button onClick={onReturn}>Return to Studyroom</Button>

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </PaperPanel>
    </div>
  );
}
