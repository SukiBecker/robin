import { SeedPacketImage } from "@/components/seed-packet-image";
import { getItemIllustration, getShopIllustration } from "@/lib/garden/item-visuals";
import styles from "./item-goods.module.css";

type ItemGoodsProps = {
  name: string;
  category: string | null;
  imageAssetUrl: string | null;
  /** Plants group (isGrowingCategory): shown as a seed packet. */
  grows: boolean;
  className?: string;
};

/**
 * The goods themselves, standing on the bottom edge of their box: a seed
 * packet for plants, a packet-sized box for path styles, the item art for
 * decor. Shared by the shelf and the detail note. Decorative (the
 * surrounding button or heading names the item).
 */
export function ItemGoods({ name, category, imageAssetUrl, grows, className = "" }: ItemGoodsProps) {
  // A Nursery-only image first (path styles: a tied stack of material
  // instead of the floor tile), then image_asset_url, then the garden's
  // own lookup — so without a shop image the Nursery shows the same art as
  // the garden.
  const imageSrc = getShopIllustration(name) ?? imageAssetUrl ?? getItemIllustration(name, "grown");
  // Path styles stand in a seed-packet-sized box, also when they fall back
  // to the garden tile (Naturstein for now): same footprint on the plank.
  const packetSized = category === "path_style";

  return (
    <span className={`${styles.goods} ${className}`} aria-hidden="true">
      {grows ? (
        <SeedPacketImage src={imageSrc} category={category} alt="" className={styles.packet} />
      ) : imageSrc && packetSized ? (
        <span className={styles.packetBox}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc} alt="" className={styles.art} loading="lazy" />
        </span>
      ) : imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageSrc} alt="" className={styles.art} loading="lazy" />
      ) : (
        <span className={styles.placeholder}>{name.trim().charAt(0)}</span>
      )}
    </span>
  );
}
