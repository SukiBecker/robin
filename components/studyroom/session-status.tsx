import { CoinIcon } from "@/components/coin-icon";
import { XpIcon } from "@/components/xp-icon";
import type { ProfileSummary } from "./session";
import styles from "./studyroom.module.css";

type SessionStatusProps = {
  profile: ProfileSummary;
  level: number;
};

/** XP, coins and level line shown under the timer and on the complete screen. */
export function SessionStatus({ profile, level }: SessionStatusProps) {
  return (
    <p className={styles.statusBar}>
      <span>
        <XpIcon size={14} /> <strong>{profile.xp}</strong>
      </span>
      <span>
        <CoinIcon size={14} /> <strong>{profile.coins}</strong>
      </span>
      <span>
        Level <strong>{level}</strong>
      </span>
    </p>
  );
}
