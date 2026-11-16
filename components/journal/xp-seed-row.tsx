"use client";

import { useId, useState, type ComponentPropsWithoutRef, type CSSProperties, type Ref } from "react";
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
/* Planting holes: shallow troughs almost as wide as the hole, so a seed
   (0.8 × the hole) lies inside with the rim showing at both ends.
   compact uses flatter ones, so ten small dips don't read as a squiggle. */
const CUPS = {
  large: [
    "M0 6 C0.9 6 1 7.8 2.6 7.8 L7.4 7.8 C9 7.8 9.1 6 10 6",
    "M0 6 C1 6.05 1.1 7.75 2.7 7.85 L7.3 7.75 C8.9 7.75 9.05 6 10 6",
  ],
  compact: [
    "M0 6 C0.9 6 1.1 7.35 2.7 7.35 L7.3 7.35 C8.9 7.35 9.1 6 10 6",
    "M0 6 C1 6.05 1.2 7.3 2.8 7.4 L7.2 7.3 C8.8 7.3 9 6 10 6",
  ],
};
/* Where a resting seed lies in the trough (viewBox units, furrow line at
   y = 6): its underside on the floor, ≈ 1.9 units thick (0.64 × its box,
   box = 0.6 × hole). Soil for a started seed is drawn from its top. */
const SEED_THICK = 1.9;
const SEED_TOP = { large: 7.8 - SEED_THICK, compact: 7.35 - SEED_THICK };

/* Each seed lies a little differently in its trough (small tilts: it lies, it doesn't stand). */
const TILT = [-8, 5, -3, 9, -6, 4, -10, 7, -2, 8];

/** XP as a seed row: an ink furrow with ten planting holes; every full
    tenth of the level puts a seed into the next hole, and the tenth in
    progress shows in the next hole as a half-buried seed in quarters
    (25 / 50 / 75 %), so every session changes something. Level on the
    left ("Lv 8"), a sprout at the end (large: with "Lv 9"), "42 / 70 XP"
    beside.
    Always drawn straight onto paper (PaperPanel or a paper header) — never
    on the garden. A new seed drops into its hole with a small bounce, the
    soil over a started seed sinks quietly (none with reduced motion).
    When the level changes the row shows the new state at once — level-up
    is not this block's moment. */
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
  const tenths = xp.ratio * HOLES + 1e-9;
  const seeds = Math.floor(tenths);
  // the tenth in progress, in quarters (0 = nothing started)
  const quarter = seeds < HOLES ? Math.floor((tenths - seeds) * 4) : 0;
  const id = useId().replace(/:/g, "");
  const cups = CUPS[size];

  // Seeds at index ≥ dropFrom were planted since the last render with a
  // different count — only those drop in. A hole that held a started seed
  // doesn't drop: its soil just goes. First render and level change: none.
  const [prev, setPrev] = useState({ seeds, quarter, level });
  const [dropFrom, setDropFrom] = useState(seeds);
  if (level !== prev.level) {
    setPrev({ seeds, quarter, level });
    setDropFrom(seeds);
  } else if (seeds !== prev.seeds || quarter !== prev.quarter) {
    setPrev({ seeds, quarter, level });
    if (seeds !== prev.seeds) {
      setDropFrom(seeds > prev.seeds ? prev.seeds + (prev.quarter > 0 ? 1 : 0) : seeds);
    }
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

      {/* key={level}: a new level remounts the furrow, so nothing animates
          backwards (seeds vanishing, soil rising) */}
      <span key={`furrow-${level}`} className={styles.furrow} aria-hidden>
        {Array.from({ length: HOLES }, (_, i) => (
          <span key={i} className={styles.cell}>
            <Piece d={SEGMENTS[i % SEGMENTS.length]} className={styles.segment} />
            <span className={styles.hole}>
              <Piece d={cups[i % cups.length]} className={styles.cup} />
              {i === seeds && quarter > 0 && (
                <>
                  <span
                    className={`${styles.seed} ${styles.started}`}
                    style={{ "--seed-tilt": `${TILT[i]}deg` } as CSSProperties}
                  >
                    <SeedGlyph />
                  </span>
                  <Soil id={`${id}-${i}`} cup={cups[i % cups.length]} top={SEED_TOP[size]} quarter={quarter} />
                </>
              )}
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
          {size === "large" && (
            <span className={styles.nextLevel}>
              <span className={styles.lv}>Lv</span> {level + 1}
            </span>
          )}
        </span>
      </span>

      {/* key={level}: the amount jumps to the new level's value instead of
          counting down */}
      <XpAmount key={`amount-${level}`} value={xp.value} max={xp.max} className={styles.amount} />
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

/** Soil over a started seed, clipped to the hollow: the seed shows
    25 / 50 / 75 % above it. The soil level moves by transform only, so a
    change of quarter sinks it quietly. Ink line on top, the hollow's
    outline drawn again over the soil. */
function Soil({ id, cup, top, quarter }: { id: string; cup: string; top: number; quarter: number }) {
  const shown = quarter / 4; // part of the seed above the soil
  return (
    <svg className={styles.soil} viewBox="0 0 10 8" preserveAspectRatio="none">
      <defs>
        <clipPath id={`${id}-hollow`}>
          <path d={`${cup} Z`} />
        </clipPath>
      </defs>
      {/* the clip stays put (outer g), only the soil level moves */}
      <g clipPath={`url(#${id}-hollow)`}>
        <g
          className={styles.soilLevel}
          style={{ transform: `translateY(${shown * SEED_THICK}px)` }}
        >
          <rect className={styles.soilFill} x="0" y={top} width="10" height="4" />
          <path
            className={styles.soilLine}
            d={`M2.2 ${top + 0.12} C3.8 ${top - 0.3} 6.2 ${top - 0.3} 7.8 ${top + 0.12}`}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </g>
      <path className={styles.soilRim} d={cup} vectorEffect="non-scaling-stroke" />
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
