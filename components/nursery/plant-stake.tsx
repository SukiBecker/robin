import { GameIcon } from "@/components/journal/game-icon";
import styles from "./plant-stake.module.css";

type PlantStakeProps = {
  /** item_catalog.price — shown as real text, never painted in. */
  price: number;
  className?: string;
};

const numberFormat = new Intl.NumberFormat("en-US");

/** The price on a plant stake that sticks in front of the packet
    (robin-design §3 Nursery). Coin icon + price in Fraunces as live
    text on the board.
    PLACEHOLDER material: dashed board on a dashed stick, same footprint
    the painted plant-stake.webp will get (design-src/ui/plant-stake.png
    is still missing). */
export function PlantStake({ price, className = "" }: PlantStakeProps) {
  const value = Number.isFinite(price) ? Math.max(0, Math.round(price)) : 0;
  return (
    <span
      className={`${styles.stake} ${className}`}
      role="img"
      aria-label={`${value} ${value === 1 ? "coin" : "coins"}`}
    >
      <span className={styles.board}>
        <GameIcon name="coin" size={16} />
        <span className={styles.price}>{numberFormat.format(value)}</span>
      </span>
      <span className={styles.stick} aria-hidden="true" />
    </span>
  );
}
