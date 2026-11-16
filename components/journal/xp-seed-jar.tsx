"use client";

import { useId, type ComponentPropsWithoutRef, type Ref } from "react";
import { XpAmount, safeXp, xpAria } from "./xp-shared";
import styles from "./xp-seed-jar.module.css";

type XpSeedJarProps = Omit<ComponentPropsWithoutRef<"div">, "children" | "role"> & {
  /** XP inside the current level (0 … max). Not finite → 0. */
  value: number;
  /** XP needed for the next level. Not finite or ≤ 0 → 1. */
  max: number;
  /** Current level, from the server (get_level()), never computed here. */
  level: number;
  ref?: Ref<HTMLDivElement>;
};

/* Geometry in the coordinates of public/ui/seed-jar.webp's source crop
   (design-src/ui/seed-jar.png cropped to 610 × 946). Seeds fill the
   inside from FILL_BOTTOM (above the glass floor) up to FILL_TOP (the
   shoulder, just under the string). */
const W = 610;
const H = 946;
const FILL_TOP = 385;
const FILL_BOTTOM = 880;
const FILL_RANGE = FILL_BOTTOM - FILL_TOP;

/* Inside of the glass body, and the painted paper tag cut out of it
   (evenodd), so the seeds never colour the tag. */
const INSIDE =
  "M78 330 C46 362 30 404 30 452 L30 792 C30 852 62 890 132 896 L478 896 C548 890 580 852 580 792 L580 452 C580 404 564 362 532 330Z " +
  "M268 402 L568 416 L604 556 L290 584Z";

/* The top of the seed pile: a little heaped, never a flat liquid line. */
const PILE =
  "M0 398 C30 380 60 382 88 394 C116 378 150 380 176 392 C206 376 240 378 266 390 C296 375 330 377 356 391 C386 377 420 380 446 392 C476 378 510 381 536 393 C566 380 594 384 610 396 V1000 H0Z";

/** XP as a jar of seeds: seed-jar.webp with a fill of seeds (seed.webp as
    a pattern) printed into the glass with multiply, clipped to the inside
    of the jar. The fill rises with the value (only transform animates;
    the seeds stay put, the pile edge rises through them). The level sits
    on the tag at the neck, "42 / 70 XP" beside. The jar is corked, so no
    seed falls in from the top. Always on paper, never on the garden.
    One size only (jar 7.5rem), for the Journal page; the header uses
    XpSeedRow. */
export function XpSeedJar({
  value,
  max,
  level,
  className = "",
  ref,
  ...rest
}: XpSeedJarProps) {
  const xp = safeXp(value, max);
  const id = useId().replace(/:/g, "");

  // At 0 the heaped pile edge (≈ 25 units) is pushed fully below the floor.
  const shift = xp.ratio > 0 ? (1 - xp.ratio) * FILL_RANGE : FILL_RANGE + 30;

  return (
    <div
      {...rest}
      ref={ref}
      {...xpAria(level, xp.value, xp.max)}
      className={className ? `${styles.jarRow} ${className}` : styles.jarRow}
    >
      <span className={styles.jarBox} aria-hidden>
        <svg className={styles.jar} viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <clipPath id={`${id}-inside`}>
              <path d={INSIDE} clipRule="evenodd" />
            </clipPath>
            <mask id={`${id}-level`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
              <path
                className={styles.pile}
                d={PILE}
                fill="#fff"
                style={{ transform: `translateY(${shift}px)` }}
              />
            </mask>
            {/* seeds lying every which way on a copper ground */}
            <pattern id={`${id}-seeds`} width="260" height="220" patternUnits="userSpaceOnUse">
              <rect className={styles.patternGround} width="260" height="220" />
              <image href="/ui/seed.webp" x="-10" y="-14" width="92" height="92" transform="rotate(0 36 32)" />
              <image href="/ui/seed.webp" x="70" y="4" width="92" height="92" transform="rotate(64 116 50)" />
              <image href="/ui/seed.webp" x="150" y="-6" width="92" height="92" transform="rotate(-28 196 40)" />
              <image href="/ui/seed.webp" x="18" y="70" width="92" height="92" transform="rotate(-58 64 116)" />
              <image href="/ui/seed.webp" x="104" y="82" width="92" height="92" transform="rotate(22 150 128)" />
              <image href="/ui/seed.webp" x="178" y="60" width="92" height="92" transform="rotate(80 224 106)" />
              <image href="/ui/seed.webp" x="48" y="138" width="92" height="92" transform="rotate(40 94 184)" />
              <image href="/ui/seed.webp" x="140" y="150" width="92" height="92" transform="rotate(-70 186 196)" />
              <image href="/ui/seed.webp" x="206" y="130" width="92" height="92" transform="rotate(8 252 176)" />
            </pattern>
          </defs>

          <image href="/ui/seed-jar.webp" x="0" y="0" width={W} height={H} />

          <g clipPath={`url(#${id}-inside)`} className={styles.fillLayer}>
            <rect
              x="0"
              y="0"
              width={W}
              height={H}
              fill={`url(#${id}-seeds)`}
              mask={`url(#${id}-level)`}
            />
          </g>
        </svg>
        <span className={styles.tag}>{level}</span>
      </span>

      <XpAmount value={xp.value} max={xp.max} className={styles.amount} />
    </div>
  );
}
