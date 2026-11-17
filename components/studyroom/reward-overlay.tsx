import { CoinIcon } from "@/components/coin-icon";
import { XpIcon } from "@/components/xp-icon";
import styles from "./studyroom.module.css";

type RewardOverlayProps = {
  xp: number;
  coins: number;
  onClose: () => void;
};

/** What the block that just completed earned; closed by a click. */
export function RewardOverlay({ xp, coins, onClose }: RewardOverlayProps) {
  return (
    <button
      type="button"
      className={styles.rewardOverlay}
      onClick={onClose}
      aria-label="Close"
    >
      <span className={styles.rewardCard} role="status">
        <span className={styles.rewardValue} data-currency="xp">
          <XpIcon size={28} /> +{xp} XP
        </span>
        <span className={styles.rewardValue} data-currency="coins">
          <CoinIcon size={28} /> +{coins} Coins
        </span>
      </span>
    </button>
  );
}
