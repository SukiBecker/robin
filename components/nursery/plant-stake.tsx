import { GameIcon } from "@/components/journal/game-icon";
import styles from "./plant-stake.module.css";

type PlantStakeProps = {
  /** item_catalog.price — shown as real text, never painted in. */
  price: number;
  className?: string;
};

const numberFormat = new Intl.NumberFormat("en-US");

/** The price on a plant stake in front of the packet (robin-design §3
    Nursery). Painted stake public/ui/plant-stake.webp (original
    design-src/ui/plant-stake.png); coin icon + price in Fraunces as live
    text, burnt into the board in wood-ink. Only the top of the stick
    shows — the rest is "in" the shelf. */
export function PlantStake({ price, className = "" }: PlantStakeProps) {
  const value = Number.isFinite(price) ? Math.max(0, Math.round(price)) : 0;
  return (
    <span
      className={`${styles.stake} ${className}`}
      role="img"
      aria-label={`${value} ${value === 1 ? "coin" : "coins"}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.wood} src="/ui/plant-stake.webp" alt="" />
      <span className={styles.board}>
        <GameIcon name="coin" size={16} />
        <span className={styles.price}>{numberFormat.format(value)}</span>
      </span>
    </span>
  );
}
