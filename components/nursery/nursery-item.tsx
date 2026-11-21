import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Button } from "@/components/journal/button";
import { Label } from "@/components/journal/label";
import { InventoryBadge } from "@/components/inventory-badge";
import { PurchaseBurst, type BurstVariant } from "@/components/purchase-burst";
import { SeedPacketImage } from "@/components/seed-packet-image";
import { getItemIllustration } from "@/lib/garden/item-visuals";
import { shake } from "@/lib/motion/shake";
import type { OwnedCount } from "@/lib/shop/owned-counts";
import { usePurchaseEvents } from "@/lib/shop/purchase-events";
import { NameTag } from "./name-tag";
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
      with a wax seal carrying the level; no Buy. */
  locked?: boolean;
  unlockLevel?: number;
  /** attributes.unlimited_placement — bought once, placeable any number
      of times (path styles). */
  unlimited?: boolean;
  /** Plants group (isGrowingCategory): shown as a seed packet. */
  grows?: boolean;
  /** Player's current inventory for this item; undefined = not owned. */
  owned?: OwnedCount;
  burstVariant: BurstVariant;
  burstColor?: string;
  /** purchase_item() is in flight for this item. */
  buying?: boolean;
  onBuy: () => void;
};

/**
 * One item on the Nursery shelf (robin-design §3 Nursery). Above the
 * plank: a seed packet (plants) or the item itself (decor, paths), with
 * the price on a plant stake in front. Below the plank, on the paper
 * wall: the name (paper label for plants, luggage tag for decor) and Buy
 * as the secondary ink button — the wooden sign is kept for a later
 * detail view. Purchase feedback (burst, bounce, hint, badge) is the
 * same as before; only the look changed.
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
  buying = false,
  onBuy,
}: NurseryItemProps) {
  const ownedTotal = owned?.total ?? 0;
  const showOwned = !locked && ownedTotal > 0;
  const ownedDetail =
    grows && owned ? formatSeedGrown(owned.seed, owned.grown) : null;

  // Purchase feedback: a particle burst over the art plus a tiny bounce
  // of the stage, once per successful buy. Each burst has its own id and
  // unmounts itself, so quick repeat buys overlap instead of restarting.
  const reduceMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const nextBurstId = useRef(0);
  const [bursts, setBursts] = useState<number[]>([]);

  function celebrate() {
    if (locked || reduceMotion) return;
    const id = nextBurstId.current++;
    setBursts((current) => [...current, id]);
    stageRef.current?.animate(
      [
        { scale: 1, easing: "cubic-bezier(0.33, 1, 0.68, 1)" },
        {
          scale: 1.04,
          offset: 0.35,
          easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        },
        { scale: 1 },
      ],
      { duration: 380 }
    );
  }

  // Success: "Bought ✓" for ~1 s — information, so it stays under reduced
  // motion. Error: shake plus a hint bubble above the button.
  const buyShakeRef = useRef<HTMLSpanElement>(null);
  const [justBought, setJustBought] = useState(false);
  const [hint, setHint] = useState<{ id: number; text: string } | null>(null);
  const nextHintId = useRef(0);
  const boughtTimer = useRef<number | undefined>(undefined);
  const hintTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(boughtTimer.current);
      window.clearTimeout(hintTimer.current);
    },
    []
  );

  usePurchaseEvents((event) => {
    if (event.itemId !== itemId) return;
    window.clearTimeout(hintTimer.current);
    if (event.type === "success") {
      setHint(null);
      setJustBought(true);
      window.clearTimeout(boughtTimer.current);
      boughtTimer.current = window.setTimeout(() => setJustBought(false), 1000);
      celebrate();
    } else {
      setJustBought(false);
      setHint({ id: nextHintId.current++, text: event.message });
      hintTimer.current = window.setTimeout(() => setHint(null), 3500);
      if (!reduceMotion) shake(buyShakeRef.current);
    }
  });

  // image_asset_url is still unset for most catalog rows; fall back to the
  // garden's own lookup so the Nursery shows the same art as the garden.
  const imageSrc = imageAssetUrl ?? getItemIllustration(name, "grown");

  return (
    <article
      className={`${styles.item} ${locked ? styles.locked : ""}`}
      aria-label={
        locked ? `${name}, locked until level ${unlockLevel}` : undefined
      }
    >
      <div ref={stageRef} className={styles.stage}>
        <div className={styles.goods}>
          {grows ? (
            <SeedPacketImage
              src={imageSrc}
              category={category}
              alt={`Seed packet: ${name}`}
              className={styles.packet}
            />
          ) : imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageSrc} alt="" className={styles.decor} loading="lazy" />
          ) : (
            <span className={styles.placeholder} aria-hidden="true">
              {name.trim().charAt(0)}
            </span>
          )}
        </div>

        <PlantStake price={price} className={styles.stake} />

        {locked && unlockLevel !== undefined && (
          <WaxSeal level={unlockLevel} className={styles.seal} />
        )}

        {/* Mounted even at 0 so the first buy (0 → 1) still pops. */}
        {!locked && (
          <InventoryBadge
            quantity={ownedTotal}
            unlimited={unlimited}
            title={ownedDetail ?? undefined}
          />
        )}

        {bursts.map((id) => (
          <PurchaseBurst
            key={id}
            variant={burstVariant}
            color={burstColor}
            onDone={() =>
              setBursts((current) => current.filter((burst) => burst !== id))
            }
          />
        ))}
      </div>

      <div className={styles.below}>
        <h3 className={styles.heading}>
          {grows ? (
            <Label className={styles.nameLabel}>{name}</Label>
          ) : (
            <NameTag>{name}</NameTag>
          )}
        </h3>

        {unlimited && !locked && (
          <p className={styles.meta}>Place as often as you like</p>
        )}
        {showOwned && ownedDetail && (
          <p className={styles.meta}>
            {ownedDetail.split(" · ").map((part, index) => (
              <span key={part}>
                {index > 0 && " · "}
                <span className={styles.metaPart}>{part}</span>
              </span>
            ))}
          </p>
        )}

        {!locked && (
          <div className={styles.buyArea}>
            {hint && (
              // Keyed so a repeated error re-runs the fade-in.
              <p key={hint.id} className={styles.hintBubble} role="status">
                {hint.text}
              </p>
            )}
            <span ref={buyShakeRef} className={styles.buyShake}>
              <Button
                variant="secondary"
                onClick={onBuy}
                loading={buying}
                aria-label={justBought ? `Bought ${name}` : `Buy ${name}`}
              >
                {justBought ? (
                  <>
                    Bought <span aria-hidden="true">✓</span>
                  </>
                ) : (
                  "Buy"
                )}
              </Button>
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

/** "2 seeds · 1 grown"; a bucket at 0 is left out ("3 seeds"). */
function formatSeedGrown(seed: number, grown: number): string {
  const parts: string[] = [];
  if (seed > 0) parts.push(`${seed} ${seed === 1 ? "seed" : "seeds"}`);
  if (grown > 0) parts.push(`${grown} grown`);
  return parts.join(" · ");
}
