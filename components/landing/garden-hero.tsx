import Image from "next/image";
import type { ReactNode } from "react";
import {
  HERO_COLS,
  HERO_OBJECTS,
  HERO_PATH,
  HERO_ROWS,
  heroObjectWidthPercent,
} from "@/lib/landing/hero-scene";
import styles from "./garden-hero.module.css";

// Rendered width of the plot, for next/image `sizes` (see .stage).
const STAGE_MAX_PX = 620;
const PHONE_QUERY = "(max-width: 760px)";

type GardenHeroProps = {
  className?: string;
  /** Top layer above the garden, for the planned intro (Robin flying
      through the gate). Empty for now; the scene doesn't change for it. */
  overlay?: ReactNode;
};

/** Static garden plot for the landing page, from the real item art. */
export function GardenHero({ className = "", overlay }: GardenHeroProps) {
  const objects = [...HERO_OBJECTS].sort((a, b) => a.y - b.y);

  return (
    <div
      className={`${styles.stage} ${className}`}
      style={{ aspectRatio: `${HERO_COLS} / ${HERO_ROWS}` }}
      role="img"
      aria-label="A small garden with a stone path, a bench, a lantern, a fountain and flower beds"
    >
      <div className={styles.lawn}>
        <Image
          src="/landing/hero-lawn.jpg"
          alt=""
          fill
          priority
          sizes={`${PHONE_QUERY} 100vw, ${STAGE_MAX_PX}px`}
          className={styles.lawnImage}
        />
      </div>

      {HERO_PATH.map((tile) => (
        <div
          key={`${tile.col}-${tile.row}`}
          className={styles.pathTile}
          style={{
            left: `${(tile.col / HERO_COLS) * 100}%`,
            top: `${(tile.row / HERO_ROWS) * 100}%`,
            width: `${100 / HERO_COLS}%`,
          }}
        >
          <Image
            src={tile.image.src}
            alt=""
            width={tile.image.width}
            height={tile.image.height}
            loading="eager"
            sizes={`${PHONE_QUERY} ${Math.ceil(100 / HERO_COLS)}vw, ${Math.ceil(STAGE_MAX_PX / HERO_COLS)}px`}
          />
        </div>
      ))}

      {objects.map((object) => {
        const width = heroObjectWidthPercent(object);
        return (
          <div
            key={object.key}
            className={styles.object}
            style={{
              left: `${object.x - width / 2}%`,
              bottom: `${100 - object.y}%`,
              width: `${width}%`,
              zIndex: Math.round(object.y),
            }}
          >
            <div className={styles.shadow} />
            <Image
              src={object.image.src}
              alt=""
              width={object.image.width}
              height={object.image.height}
              // above the fold: no lazy pop-in (only the lawn gets priority)
              loading="eager"
              sizes={`${PHONE_QUERY} ${Math.ceil(width)}vw, ${Math.ceil((STAGE_MAX_PX * width) / 100)}px`}
              className={styles.objectImage}
              style={object.mirrored ? { transform: "scaleX(-1)" } : undefined}
            />
          </div>
        );
      })}

      <div className={styles.vignette} aria-hidden="true" />
      <div className={styles.overlay}>{overlay}</div>
    </div>
  );
}
