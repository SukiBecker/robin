import type { ComponentPropsWithoutRef, CSSProperties, ElementType, ReactNode } from "react";
import styles from "./place-backdrop.module.css";

/** worlds.slug of the places that have a backdrop so far. */
export type PlaceWorld = "garden";

type PlaceMaterial = {
  /** Seamless wall tile (WebP in public/ui/). */
  image: string;
  /** Rendered tile edge; half the asset's pixels for 2x sharpness. */
  tile: string;
  /** Mid tone of the tile, shown until the image has loaded. */
  fallback: string;
};

/** The wall of each place (robin-design §4, "Material pro Welt"). The
    roles stay the same per place, only the material changes. */
const PLACE_BACKDROPS: Record<PlaceWorld, PlaceMaterial> = {
  // World 1: the gardener's shed — green-painted vertical boards
  // (public/ui/shed-wall.webp, 1254 px, original design-src/ui/shed-wall.png).
  garden: {
    image: "/ui/shed-wall.webp",
    tile: "39.1875rem", // 627 px
    fallback: "#9DAC73",
  },
};

type PlaceBackdropProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  world: PlaceWorld;
  /** Element to render; default div. */
  as?: ElementType;
  children?: ReactNode;
};

/**
 * The place's own wall behind a place-level page (Nursery now, Studyroom
 * later). Fills its own box only — the Journal frame and the navigation
 * above stay paper. Text never sits directly on it: put it on paper
 * (PaperPanel, Label) or on an object of the place.
 */
export function PlaceBackdrop({
  world,
  as: Tag = "div",
  className = "",
  style,
  children,
  ...rest
}: PlaceBackdropProps) {
  const material = PLACE_BACKDROPS[world];
  return (
    <Tag
      {...rest}
      data-world={world}
      className={`room-backdrop ${styles.backdrop} ${className}`}
      style={
        {
          ...style,
          "--place-image": `url(${material.image})`,
          "--place-tile": material.tile,
          "--place-fallback": material.fallback,
        } as CSSProperties
      }
    >
      {children}
    </Tag>
  );
}
