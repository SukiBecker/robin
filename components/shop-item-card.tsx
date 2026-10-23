import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { LockIcon } from "@/components/lock-icon";
import { getItemIllustration } from "@/lib/garden/item-visuals";
import styles from "./shop-item-card.module.css";

type ShopItemCardProps = {
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
  buying?: boolean;
  disabled?: boolean;
  onBuy: () => void;
};

export function ShopItemCard({
  name,
  price,
  imageAssetUrl,
  locked = false,
  unlockLevel,
  unlimited = false,
  grows = false,
  buying = false,
  disabled = false,
  onBuy,
}: ShopItemCardProps) {
  // image_asset_url is still unset for most catalog rows, while the garden
  // looks illustrations up by name (lib/garden/item-visuals.ts) — fall back
  // to that same lookup's fully-grown image so the shop never shows
  // different art than what ends up in the garden.
  const imageSrc = imageAssetUrl ?? getItemIllustration(name, "grown");

  return (
    <article
      className={`${styles.card} ${locked ? styles.locked : ""}`}
      aria-label={
        locked ? `${name}, locked until level ${unlockLevel}` : undefined
      }
    >
      <div className={styles.imageWell}>
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc} alt="" className={styles.image} loading="lazy" />
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
      </div>

      <h3 className={styles.name}>{name}</h3>

      <p className={styles.price} aria-label={`${price} coins`}>
        <CoinIcon size={22} />
        <span>{price}</span>
      </p>

      {locked ? (
        <p className={styles.unlockSign}>Unlock at Level {unlockLevel}</p>
      ) : (
        <Button
          variant="tonal"
          size="sm"
          className={styles.buyButton}
          onClick={onBuy}
          disabled={disabled}
        >
          {buying ? "Buying…" : "Buy"}
        </Button>
      )}
    </article>
  );
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
