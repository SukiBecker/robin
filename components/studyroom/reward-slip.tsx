import type { CSSProperties } from "react";
import { Button } from "@/components/journal/button";
import { GameIcon } from "@/components/journal/game-icon";
import { PaperPanel } from "@/components/journal/paper-panel";
import { CountUp } from "./count-up";
import { Nail } from "./nail";
import styles from "./studyroom.module.css";

type RewardSlipProps = {
  xp: number;
  coins: number;
  onClose: () => void;
  /** nail (default): a slip nailed onto the timer's slate on the shelf.
      tape: taped over the garden — only in fullscreen, where the shelf is
      hidden and there is no wood to nail into. */
  fixing?: "nail" | "tape";
};

/** What the block that just completed earned: a slip of paper that pops
    onto the board, the XP and then the coins counting up, each with its
    own icon. It closes on its own after a few seconds or with the button.
    The overlay lets clicks through, so nothing under it is blocked. */
export function RewardSlip({
  xp,
  coins,
  onClose,
  fixing = "nail",
}: RewardSlipProps) {
  return (
    <div className={styles.rewardOverlay} data-fixing={fixing}>
      <PaperPanel
        tape={fixing === "tape" ? "top" : "none"}
        padding="sm"
        className={styles.rewardCard}
        role="status"
      >
        {fixing === "nail" && <Nail className={styles.rewardNail} />}
        <p className={styles.rewardLine} style={{ "--i": 0 } as CSSProperties}>
          <GameIcon name="xp" size={48} />
          <span className={styles.rewardValue}>
            +<CountUp value={xp} />{" "}
            <span className={styles.rewardUnit}>XP</span>
          </span>
        </p>
        <p className={styles.rewardLine} style={{ "--i": 1 } as CSSProperties}>
          <GameIcon name="coin" size={48} />
          <span className={styles.rewardValue}>
            +<CountUp value={coins} />{" "}
            <span className={styles.rewardUnit}>Coins</span>
          </span>
        </p>
        <Button variant="quiet" onClick={onClose}>
          Close
        </Button>
      </PaperPanel>
    </div>
  );
}
