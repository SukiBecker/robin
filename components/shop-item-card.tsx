import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { InventoryBadge } from "@/components/inventory-badge";
import { LockIcon } from "@/components/lock-icon";
import { PurchaseBurst, type BurstVariant } from "@/components/purchase-burst";
import { getItemIllustration } from "@/lib/garden/item-visuals";
import { shake } from "@/lib/motion/shake";
import type { OwnedCount } from "@/lib/shop/owned-counts";
import { usePurchaseEvents } from "@/lib/shop/purchase-events";
import styles from "./shop-item-card.module.css";

type ShopItemCardProps = {
  /** item_catalog.id — matches purchase events to this card. */
  itemId: string;
  name: string;
  price: number;
  /** item_catalog.image_asset_url — the same asset the garden renders. */
  imageAssetUrl: string | null;
  /** Item level above the player's: muted card, lock over the art,
      and a static "Unlock at Level X" sign instead of the Buy button. */
  locked?: boolean;
  unlockLevel?: number;
  /** attributes.unlimited_placement — bought once, placeable any number
      of times (path styles). */
  unlimited?: boolean;
  /** Plants group — grows over time after placing, unlike decor. */
  grows?: boolean;
  /** Player's current inventory for this item; undefined = not owned.
      Shown as a count pill on the plinth's top-right (never on locked
      cards), plus a seed/grown caption for growing items. */
  owned?: OwnedCount;
  /** Particle look of the purchase burst, from item.category. */
  burstVariant: BurstVariant;
  /** Petal colour for flower bursts (item.attributes.color). */
  burstColor?: string;
  /** purchase_item() is in flight for this item: spinner, disabled. */
  buying?: boolean;
  onBuy: () => void;
};

export function ShopItemCard({
  itemId,
  name,
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
}: ShopItemCardProps) {
  const ownedTotal = owned?.total ?? 0;
  const showOwned = !locked && ownedTotal > 0;
  const ownedDetail =
    grows && owned ? formatSeedGrown(owned.seed, owned.grown) : null;

  // Purchase feedback: a particle burst over the art plus a tiny card
  // bounce, once per successful buy. Each burst has its own id and
  // unmounts itself, so quick repeat buys overlap instead of restarting.
  const reduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLElement>(null);
  const nextBurstId = useRef(0);
  const [bursts, setBursts] = useState<number[]>([]);

  function celebrate() {
    if (locked || reduceMotion) return;
    const id = nextBurstId.current++;
    setBursts((current) => [...current, id]);
    // The standalone `scale` property composes with the hover lift's
    // `transform` instead of overriding it.
    cardRef.current?.animate(
      [
        { scale: 1, easing: "cubic-bezier(0.33, 1, 0.68, 1)" },
        {
          scale: 1.03,
          offset: 0.35,
          easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        },
        { scale: 1 },
      ],
      { duration: 380 }
    );
  }

  // Button feedback. Success: "Bought ✓" in solid green for ~1 s — that's
  // information, so it stays under reduced motion. Error: shake plus a warm
  // hint bubble above the button; no badge, coin or burst feedback.
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

  // image_asset_url is still unset for most catalog rows, while the garden
  // looks illustrations up by name (lib/garden/item-visuals.ts) — fall back
  // to that same lookup's fully-grown image so the shop never shows
  // different art than what ends up in the garden.
  const imageSrc = imageAssetUrl ?? getItemIllustration(name, "grown");

  return (
    <article
      ref={cardRef}
      className={`${styles.card} ${locked ? styles.locked : ""}`}
      aria-label={
        locked ? `${name}, locked until level ${unlockLevel}` : undefined
      }
    >
      <div className={styles.imageStage}>
        <div className={styles.imageWell}>
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt=""
              className={styles.image}
              loading="lazy"
            />
          ) : (
            <span className={styles.placeholder} aria-hidden="true">
              {name.trim().charAt(0)}
            </span>
          )}
          {locked && (
            <span className={styles.lockBadge}>
              <LockIcon size={56} />
            </span>
          )}
          {(unlimited || grows) && (
            <div className={styles.tags}>
              {unlimited && (
                <span className={`${styles.tag} ${styles.tagUnlimited}`}>
                  <span aria-hidden="true" className={styles.tagGlyph}>
                    ∞
                  </span>
                  Unlimited
                </span>
              )}
              {grows && (
                <span className={`${styles.tag} ${styles.tagGrows}`}>
                  <SproutIcon />
                  Grows
                </span>
              )}
            </div>
          )}
          {/* Mounted even at 0 so the first buy (0 → 1) still pops. */}
          {!locked && (
            <InventoryBadge
              quantity={ownedTotal}
              unlimited={unlimited}
              title={ownedDetail ?? undefined}
            />
          )}
        </div>
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

      <h3 className={styles.name}>{name}</h3>
      {showOwned && ownedDetail && (
        <p className={styles.ownedDetail}>{ownedDetail}</p>
      )}

      <p className={styles.price} aria-label={`${price} coins`}>
        <CoinIcon size={22} />
        <span>{price}</span>
      </p>

      {locked ? (
        <p className={styles.unlockSign}>Unlock at Level {unlockLevel}</p>
      ) : (
        <div className={styles.buyArea}>
          {hint && (
            // Keyed so a repeated error re-runs the fade-in.
            <p key={hint.id} className={styles.hintBubble} role="status">
              {hint.text}
            </p>
          )}
          <span ref={buyShakeRef} className={styles.buyShake}>
            <Button
              variant="tonal"
              size="sm"
              className={`${styles.buyButton} ${justBought ? styles.buyButtonBought : ""}`}
              onClick={onBuy}
              loading={buying}
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

/** Small UI-chrome sprout for the "Grows" tag — vector on purpose, so it
    stays secondary to the illustrated item art. */
function SproutIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={styles.tagIcon}
    >
      <path
        d="M8 15V8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M8 9C8 5.5 5.5 3.5 2 3.5 2 7 4.5 9 8 9Z" fill="currentColor" />
      <path
        d="M8 7.5C8 4.5 10.2 2 14 2 14 5.5 11.5 7.5 8 7.5Z"
        fill="currentColor"
        opacity="0.75"
      />
    </svg>
  );
}
