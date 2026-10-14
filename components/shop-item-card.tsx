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
    <article className={`${styles.card} ${locked ? styles.locked : ""}`}>
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
