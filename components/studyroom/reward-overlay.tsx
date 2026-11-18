import type { CSSProperties } from "react";
import { Button } from "@/components/journal/button";
import { GameIcon } from "@/components/journal/game-icon";
import { PaperPanel } from "@/components/journal/paper-panel";
import { CountUp } from "./count-up";
import styles from "./studyroom.module.css";

type RewardOverlayProps = {
  xp: number;
  coins: number;
  onClose: () => void;
};

/** What the block that just completed earned: a slip of paper with tape
    on the garden — it pops in, the XP and then the coins count up. It
    closes on its own after a few seconds or with the button. */
export function RewardOverlay({ xp, coins, onClose }: RewardOverlayProps) {
  return (
    <div className={styles.rewardOverlay}>
      <PaperPanel tape="top" padding="md" className={styles.rewardCard} role="status">
        <p className={styles.rewardLine} style={{ "--i": 0 } as CSSProperties}>
          <GameIcon name="xp" size={48} className={styles.rewardIcon} />
          <span className={styles.rewardValue}>
            +<CountUp value={xp} /> <span className={styles.rewardUnit}>XP</span>
          </span>
        </p>
        <p className={styles.rewardLine} style={{ "--i": 1 } as CSSProperties}>
          <GameIcon name="coin" size={48} className={styles.rewardIcon} />
          <span className={styles.rewardValue}>
            +<CountUp value={coins} /> <span className={styles.rewardUnit}>Coins</span>
          </span>
        </p>
        <Button variant="quiet" onClick={onClose}>
          Close
        </Button>
      </PaperPanel>
    </div>
  );
}
