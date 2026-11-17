import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { XpIcon } from "@/components/xp-icon";
import { SessionStatus } from "./session-status";
import type { ProfileSummary } from "./session";
import styles from "./studyroom.module.css";

type SessionCompleteProps = {
  totalBlocks: number;
  secondsStudied: number;
  xpEarned: number;
  coinsEarned: number;
  profile: ProfileSummary | null;
  level: number | null;
  error: string | null;
  onReturn: () => void;
};

/** The run-complete screen on the stage: totals of the whole run. */
export function SessionComplete({
  totalBlocks,
  secondsStudied,
  xpEarned,
  coinsEarned,
  profile,
  level,
  error,
  onReturn,
}: SessionCompleteProps) {
  return (
    <div className={styles.completeOverlay}>
      <div className={styles.completeCard}>
        <h2 className={styles.completeHeading}>Congratulations!</h2>
        <p className={styles.completeMeta}>
          {totalBlocks} {totalBlocks === 1 ? "block" : "blocks"} completed
        </p>

        <div className={styles.completeStats}>
          <div className={styles.statTile}>
            <span className={styles.statLabel}>Minutes</span>
            <span className={styles.statValue} data-currency="minutes">
              {Math.floor(secondsStudied / 60)}
            </span>
          </div>
          <div className={styles.statTile}>
            <span className={styles.statLabel}>XP</span>
            <span className={styles.statValue} data-currency="xp">
              <XpIcon size={16} /> {xpEarned}
            </span>
          </div>
          <div className={styles.statTile}>
            <span className={styles.statLabel}>Coins</span>
            <span className={styles.statValue} data-currency="coins">
              <CoinIcon size={16} /> {coinsEarned}
            </span>
          </div>
        </div>

        <Button onClick={onReturn}>Return to Studyroom</Button>

        {profile && level !== null && (
          <SessionStatus profile={profile} level={level} />
        )}

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
