"use client";

import { useState, type ComponentPropsWithoutRef, type CSSProperties, type Ref } from "react";
import { SeedGlyph, XpAmount, fmtXp, safeXp, xpAria } from "./xp-shared";
import styles from "./xp-seed-row.module.css";

type XpSeedRowProps = Omit<ComponentPropsWithoutRef<"div">, "children" | "role"> & {
  /** XP inside the current level (0 … max). Not finite → 0. */
  value: number;
  /** XP needed for the next level. Not finite or ≤ 0 → 1. */
  max: number;
  /** Current level, from the server (get_level()), never computed here. */
  level: number;
  /** compact = header (≤ 2rem tall, one line).
      large = Journal (level + amount above, the furrow full width below). */
  size?: "compact" | "large";
  ref?: Ref<HTMLDivElement>;
};

const HOLES = 10;

/* Three hand-drawn furrow pieces (viewBox 0 0 10 8, line at y≈6), used in
   turn so the furrow never repeats exactly. */
const SEGMENTS = [
  "M0 6 C3 5.7 6.5 6.3 10 6",
  "M0 6 C2.5 6.35 7 5.75 10 6",
  "M0 6 C4 6.2 6 5.8 10 6",
];
/* Planting holes: small ink hollows dipping below the furrow. */
const CUPS = [
  "M0 6 C1.6 6 2 7.7 5 7.7 C8 7.7 8.4 6 10 6",
  "M0 6 C1.4 6.1 2.4 7.8 5.2 7.6 C7.8 7.5 8.6 6 10 6",
];
/* Each seed lies a little differently in its hole. */
const TILT = [-18, 12, -6, 22, -14, 8, -24, 16, -4, 20];

/** XP as a seed row: an ink furrow with ten planting holes; every full
    tenth of the level puts a seed into the next hole. Level on the left
    ("Lv 8"), a sprout with the next level at the end, "42 / 70 XP" beside.
    Always drawn straight onto paper (PaperPanel or a paper header) — never
    on the garden. A new seed drops into its hole with a small bounce
    (none with reduced motion). Level-up is not this block's moment. */
export function XpSeedRow({
  value,
  max,
  level,
  size = "compact",
  className = "",
  ref,
  ...rest
}: XpSeedRowProps) {
  const xp = safeXp(value, max);
  const seeds = Math.floor(xp.ratio * HOLES + 1e-9);

  // Seeds at index ≥ dropFrom were planted since the last render with a
  // different count — only those drop in. First render: none.
  const [prevSeeds, setPrevSeeds] = useState(seeds);
  const [dropFrom, setDropFrom] = useState(seeds);
  if (seeds !== prevSeeds) {
    setPrevSeeds(seeds);
    setDropFrom(seeds > prevSeeds ? prevSeeds : seeds);
  }

  return (
    <div
      {...rest}
      ref={ref}
      {...xpAria(level, xp.value, xp.max)}
      className={[styles.row, styles[size], className].filter(Boolean).join(" ")}
      data-digits={digitsClass(xp.max)}
    >
      <span className={styles.level} aria-hidden>
        <span className={styles.lv}>Lv</span>
        <span className={styles.levelNumber}>{level}</span>
      </span>

      <span className={styles.furrow} aria-hidden>
        {Array.from({ length: HOLES }, (_, i) => (
          <span key={i} className={styles.cell}>
            <Piece d={SEGMENTS[i % SEGMENTS.length]} className={styles.segment} />
            <span className={styles.hole}>
              <Piece d={CUPS[i % CUPS.length]} className={styles.cup} />
              {i < seeds && (
                <span
                  className={i >= dropFrom ? `${styles.seed} ${styles.drop}` : styles.seed}
                  style={
                    {
                      "--seed-tilt": `${TILT[i]}deg`,
                      "--drop-delay": `${Math.max(0, i - dropFrom) * 90}ms`,
                    } as CSSProperties
                  }
                >
                  <SeedGlyph />
                </span>
              )}
            </span>
          </span>
        ))}
        <Piece d={SEGMENTS[1]} className={styles.tail} />
        <span className={styles.next}>
          <Sprout />
          <span className={styles.nextNumber}>{level + 1}</span>
        </span>
      </span>

      <XpAmount value={xp.value} max={xp.max} className={styles.amount} />
    </div>
  );
}

/** Width class of the amount, for the narrow-row container queries:
    "70" → short, "340" → mid, "2,400" → long. */
function digitsClass(max: number) {
  const len = fmtXp(max).length;
  return len <= 2 ? "short" : len <= 3 ? "mid" : "long";
}

/** One furrow piece: stretched horizontally, stroke stays even. */
function Piece({ d, className }: { d: string; className: string }) {
  return (
    <svg className={className} viewBox="0 0 10 8" preserveAspectRatio="none">
      <path d={d} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** A small sprout in ink at the end of the row: the next level. */
function Sprout() {
  return (
    <svg className={styles.sprout} viewBox="0 0 20 24">
      <path d="M10.2 23 C10 19 9.6 15.4 10.4 11.6" />
      <path d="M10.4 12.4 C7.6 12.8 4.2 11.4 3.4 7.6 C6.8 7.2 9.6 8.6 10.4 12.4Z" />
      <path d="M10.2 14 C12.4 11 15.8 9.6 17.6 10.6 C16.6 13.6 13.4 14.8 10.2 14Z" />
      <path d="M6.4 23.2 C8.6 22.6 12 22.7 14.2 23.3" />
    </svg>
  );
}
