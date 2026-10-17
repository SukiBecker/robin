import type { CSSProperties } from "react";
import Image from "next/image";
import styles from "./robin-perched.module.css";

export type RobinMood = "neutral" | "happy" | "sad";

type RobinPerchedProps = {
  mood: RobinMood;
  /** Width in px; the canvas is square. Omit to size Robin from CSS
      instead: the stage then takes its width from an inherited
      --robin-size (default 96px), e.g. for breakpoint-dependent sizes. */
  size?: number;
  className?: string;
};

const MOODS: RobinMood[] = ["neutral", "happy", "sad"];

/** Where Robin's feet stand on the canvas, as fractions of its width and
    height. Every animation pivots here; anything that places Robin on a
    surface (e.g. AuthLayout's card perch) should anchor here too. */
export const ROBIN_FEET = { x: 0.56, y: 0.94 } as const;

/** Upper bound for the image `sizes` hint when Robin is sized from CSS. */
const CSS_SIZED_MAX = 96;

/**
 * Robin sitting, with three moods. Separate from RobinMascot (the flying,
 * layered bird): this one is three full illustrations on identical
 * 480x480 canvases, stacked and crossfaded so a mood change never flashes
 * an empty frame. All three are loaded up front for the same reason.
 *
 * Motion is CSS only (see the module). The one-shot moves (happy hop, sad
 * sink) restart on every switch into that mood without any JS: switching
 * changes data-mood, which changes animation-name/transform, which is
 * what restarts them.
 *
 * Purely decorative — whatever renders Robin carries the meaning in text.
 */
export function RobinPerched({ mood, size, className }: RobinPerchedProps) {
  const style = {
    "--robin-feet": `${ROBIN_FEET.x * 100}% ${ROBIN_FEET.y * 100}%`,
    ...(size !== undefined && { "--robin-size": `${size}px` }),
  } as CSSProperties;

  return (
    <div
      className={`${styles.stage} ${className ?? ""}`}
      style={style}
      data-mood={mood}
      aria-hidden="true"
    >
      <div className={styles.pose}>
        <div className={styles.hop}>
          <div className={styles.idle}>
            {MOODS.map((m) => (
              <Image
                key={m}
                className={styles.frame}
                src={`/mascot/robin-${m}.png`}
                alt=""
                fill
                sizes={`${size ?? CSS_SIZED_MAX}px`}
                priority
                draggable={false}
                data-active={m === mood}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
