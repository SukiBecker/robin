import { useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { FocusFrame } from "@/components/journal/ink";
import { Label } from "@/components/journal/label";
import { InventoryBadge } from "@/components/inventory-badge";
import { PurchaseBurst, type BurstVariant } from "@/components/purchase-burst";
import type { OwnedCount } from "@/lib/shop/owned-counts";
import { usePurchaseEvents } from "@/lib/shop/purchase-events";
import { formatSeedGrown } from "./item-facts";
import { ItemGoods } from "./item-goods";
import { PlantStake } from "./plant-stake";
import { WaxSeal } from "./wax-seal";
import styles from "./nursery-item.module.css";

type NurseryItemProps = {
  /** item_catalog.id — matches purchase events to this item. */
  itemId: string;
  name: string;
  category: string | null;
  price: number;
  /** item_catalog.image_asset_url — the same asset the garden renders. */
  imageAssetUrl: string | null;
  /** Item level above the player's: stays visible, slightly desaturated,
      with a wax seal carrying the level. Still opens its note. */
  locked?: boolean;
  unlockLevel?: number;
  /** attributes.unlimited_placement — bought once (path styles). */
  unlimited?: boolean;
  /** Plants group (isGrowingCategory): shown as a seed packet. */
  grows?: boolean;
  /** Player's current inventory for this item; undefined = not owned. */
  owned?: OwnedCount;
  burstVariant: BurstVariant;
  burstColor?: string;
  /** Opens the detail note; gets the button so focus can return to it. */
  onOpen: (trigger: HTMLButtonElement) => void;
};

/**
 * One item on the Nursery shelf (robin-design §3 Nursery): the goods on
 * the plank with the price on a stake in front, and a small paper label
 * with the name stuck to the plank's front edge. The whole item is a
 * button that opens its detail note (ItemNote), where buying happens.
 * A successful buy still celebrates here, on the shelf: burst + bounce.
 */
export function NurseryItem({
  itemId,
  name,
  category,
  price,
  imageAssetUrl,
  locked = false,
  unlockLevel,
  unlimited = false,
  grows = false,
  owned,
  burstVariant,
  burstColor,
  onOpen,
}: NurseryItemProps) {
  const ownedTotal = owned?.total ?? 0;
  const ownedDetail = grows && owned ? formatSeedGrown(owned.seed, owned.grown) : null;

  // Purchase feedback on the shelf: a particle burst over the goods plus a
  // tiny bounce, once per successful buy. Each burst has its own id and
  // unmounts itself, so quick repeat buys overlap instead of restarting.
  const reduceMotion = useReducedMotion();
  const stageRef = useRef<HTMLSpanElement>(null);
  const nextBurstId = useRef(0);
  const [bursts, setBursts] = useState<number[]>([]);

  usePurchaseEvents((event) => {
    if (event.itemId !== itemId || event.type !== "success") return;
    if (locked || reduceMotion) return;
    const id = nextBurstId.current++;
    setBursts((current) => [...current, id]);
    stageRef.current?.animate(
      [
        { scale: 1, easing: "cubic-bezier(0.33, 1, 0.68, 1)" },
        { scale: 1.04, offset: 0.35, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
        { scale: 1 },
      ],
      { duration: 380 }
    );
  });

  const label = locked
    ? `${name}, locked until level ${unlockLevel}`
    : `${name}, ${price} ${price === 1 ? "coin" : "coins"}${
        ownedTotal > 0 ? (unlimited ? ", owned" : `, ${ownedTotal} owned`) : ""
      }`;

  return (
    <button
      type="button"
      className={`${styles.item} ${locked ? styles.locked : ""}`}
      aria-label={label}
      aria-haspopup="dialog"
      onClick={(event) => onOpen(event.currentTarget)}
    >
      <span ref={stageRef} className={styles.stage}>
        <ItemGoods
          name={name}
          category={category}
          imageAssetUrl={imageAssetUrl}
          grows={grows}
          className={styles.goods}
        />

        <PlantStake price={price} className={styles.stake} />

        {locked && unlockLevel !== undefined && <WaxSeal level={unlockLevel} className={styles.seal} />}

        {/* Mounted even at 0 so the first buy (0 → 1) still pops. */}
        {!locked && <InventoryBadge quantity={ownedTotal} unlimited={unlimited} title={ownedDetail ?? undefined} />}

        {bursts.map((id) => (
          <PurchaseBurst
            key={id}
            variant={burstVariant}
            color={burstColor}
            onDone={() => setBursts((current) => current.filter((burst) => burst !== id))}
          />
        ))}
      </span>

      {/* Shelf label: stuck to the plank's front edge, wraps instead of
          growing wider than its slot. */}
      <Label className={styles.nameLabel}>{name}</Label>

      <FocusFrame className={styles.focusFrame} />
    </button>
  );
}
