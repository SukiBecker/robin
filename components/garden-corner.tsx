import type { CSSProperties } from "react";
import Image from "next/image";
import type { CornerItem } from "@/lib/garden/auth-corners";
import styles from "./garden-corner.module.css";

type GardenCornerProps = {
  side: "left" | "right";
  items: CornerItem[];
  className?: string;
};

/**
 * One decorative plant group anchored to a bottom corner. Pure decoration:
 * hidden from assistive tech, no pointer events. Size and the "never
 * reaches the card" limit come from the parent (see auth-layout.module.css);
 * this only lays the items out inside the box. Config: lib/garden/auth-corners.ts.
 */
export function GardenCorner({ side, items, className }: GardenCornerProps) {
  return (
    <div
      className={`${styles.corner} ${styles[side]} ${className ?? ""}`}
      aria-hidden="true"
    >
      {items.map((it) => (
        <Image
          key={it.src}
          className={styles.item}
          src={it.src}
          width={it.width}
          height={it.height}
          alt=""
          // the group is at most ~420px wide on desktop
          sizes={`${Math.ceil(it.w * 4.2)}px`}
          fetchPriority="low"
          draggable={false}
          style={
            {
              "--x": `${it.x}%`,
              "--w": `${it.w}%`,
              "--bottom": `${it.bottom}%`,
              zIndex: it.z,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
