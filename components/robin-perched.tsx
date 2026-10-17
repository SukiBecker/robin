import type { CSSProperties } from "react";
import Image from "next/image";
import styles from "./robin-perched.module.css";

export type RobinMood = "neutral" | "happy" | "sad";

type RobinPerchedProps = {
  mood: RobinMood;
  /** Width in px; the canvas is square. */
  size?: number;
  className?: string;
};

const MOODS: RobinMood[] = ["neutral", "happy", "sad"];

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
export function RobinPerched({ mood, size = 96, className }: RobinPerchedProps) {
  return (
    <div
      className={`${styles.stage} ${className ?? ""}`}
      style={{ width: size, "--robin-size": `${size}px` } as CSSProperties}
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
                sizes={`${size}px`}
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
