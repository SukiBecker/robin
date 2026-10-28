import { useRef, useState } from "react";
import { motion, type Easing } from "motion/react";
import {
  DEFAULT_BURST_TUNING,
  type BurstTuning,
} from "@/lib/shop/burst-tuning";
import styles from "./purchase-burst.module.css";

export type BurstVariant = "flower" | "plant" | "decoration";

/** item_catalog.category → particle look. Trees shed leaves too; every
    non-plant category (decor, path styles, extras) gets gold sparkles. */
export function burstVariantFor(category: string | null): BurstVariant {
  if (category === "flower") return "flower";
  if (category === "plant" || category === "tree") return "plant";
  return "decoration";
}

type PurchaseBurstProps = {
  variant: BurstVariant;
  /** Petal colour for flowers (item.attributes.color); ignored otherwise
      and when it isn't a valid CSS colour. Falls back to blossom pink. */
  color?: string;
  onDone: () => void;
};

type Particle = {
  peakX: number;
  peakY: number;
  endX: number;
  endY: number;
  rotate: number;
  delay: number;
  size: number;
  fill: string;
};

// Pop out with the house overshoot, then let gravity take over.
const OVERSHOOT: Easing = [0.34, 1.56, 0.64, 1];
const EASE_OUT: Easing = [0.33, 1, 0.68, 1];
const EASE_IN: Easing = [0.32, 0, 0.67, 0];
/** Share of the duration spent rising to the peak. */
const PEAK_AT = 0.4;

/**
 * A handful of petals / leaves / sparkles that hop out of the item art
 * and drift down — cozy, not confetti. Overlay only (pointer-events: none);
 * calls onDone once the last particle has finished so the owner can
 * unmount it. Callers skip it entirely under prefers-reduced-motion.
 */
export function PurchaseBurst({ variant, color, onDone }: PurchaseBurstProps) {
  const tuning = DEFAULT_BURST_TUNING;
  // Rolled once per burst, so each one looks a little different.
  const [particles] = useState(() =>
    makeParticles(tuning, paletteFor(variant, color))
  );
  const remaining = useRef(particles.length);
  const duration = tuning.duration / 1000;

  function handleParticleDone() {
    remaining.current -= 1;
    if (remaining.current === 0) onDone();
  }

  return (
    <div className={styles.burst} aria-hidden="true">
      {particles.map((particle, index) => (
        <motion.span
          key={index}
          className={styles.particle}
          style={{
            width: particle.size,
            height: particle.size,
            marginLeft: -particle.size / 2,
            marginTop: -particle.size / 2,
            color: particle.fill,
          }}
          initial={{ x: 0, y: 0, rotate: 0, scale: 0.4, opacity: 1 }}
          animate={{
            x: [0, particle.peakX, particle.endX],
            y: [0, particle.peakY, particle.endY],
            rotate: [0, particle.rotate],
            scale: [0.4, 1, 0.85],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration,
            delay: particle.delay,
            x: {
              duration,
              delay: particle.delay,
              times: [0, PEAK_AT, 1],
              ease: [OVERSHOOT, EASE_OUT],
            },
            y: {
              duration,
              delay: particle.delay,
              times: [0, PEAK_AT, 1],
              ease: [OVERSHOOT, EASE_IN],
            },
            rotate: { duration, delay: particle.delay, ease: OVERSHOOT },
            scale: {
              duration,
              delay: particle.delay,
              times: [0, 0.25, 1],
              ease: EASE_OUT,
            },
            opacity: {
              duration,
              delay: particle.delay,
              times: [0, 0.6, 1],
              ease: EASE_IN,
            },
          }}
          onAnimationComplete={handleParticleDone}
        >
          <ParticleShape variant={variant} />
        </motion.span>
      ))}
    </div>
  );
}

function makeParticles(tuning: BurstTuning, palette: string[]): Particle[] {
  const { count, angle, spread, distance, fall, rotation, maxDelay, jitter } =
    tuning;
  const step = count > 1 ? (2 * spread) / (count - 1) : 0;
  // Evenly fanned base angles keep the burst balanced; per-particle jitter
  // (a fraction of the gap to the neighbour) keeps it from looking stamped.
  return Array.from({ length: count }, (_, i) => {
    const base = count > 1 ? angle - spread + step * i : angle;
    const theta =
      ((base + randomBetween(-1, 1) * step * jitter) * Math.PI) / 180;
    const reach = distance * (1 + randomBetween(-1, 1) * jitter * 0.5);
    const peakX = Math.cos(theta) * reach;
    const peakY = Math.sin(theta) * reach;
    return {
      peakX,
      peakY,
      // Keep drifting outwards while falling, landing below the origin.
      endX: peakX * 1.35,
      endY: fall * (1 + randomBetween(-1, 1) * jitter * 0.5),
      rotate:
        (i % 2 === 0 ? 1 : -1) *
        rotation *
        (1 + randomBetween(-1, 1) * jitter * 0.5),
      delay: (Math.random() * maxDelay) / 1000,
      size: Math.round(randomBetween(9, 13)),
      fill: palette[i % palette.length],
    };
  });
}

function paletteFor(variant: BurstVariant, color?: string): string[] {
  if (variant === "flower") {
    const petal =
      color && isCssColor(color) ? color : "var(--color-world-accent)";
    return [
      petal,
      `color-mix(in srgb, ${petal} 55%, white)`,
      `color-mix(in srgb, ${petal} 75%, var(--color-blossom))`,
    ];
  }
  if (variant === "plant") {
    return [
      "var(--color-primary)",
      "var(--color-fern)",
      "var(--color-world-ground)",
    ];
  }
  return [
    "var(--color-coin)",
    "var(--color-accent-gold)",
    "var(--color-coin-deep)",
  ];
}

function isCssColor(value: string): boolean {
  return typeof CSS !== "undefined" && CSS.supports("color", value);
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/** Tiny inline SVGs in currentColor, drawn on a 12×12 grid. */
function ParticleShape({ variant }: { variant: BurstVariant }) {
  if (variant === "flower") {
    // Rounded teardrop petal with a soft highlight.
    return (
      <svg viewBox="0 0 12 12" className={styles.shape}>
        <path
          d="M6 .8C9.2 3.6 10.4 6.6 9 9.4 8 11.4 4 11.4 3 9.4 1.6 6.6 2.8 3.6 6 .8Z"
          fill="currentColor"
          className={styles.body}
        />
        <path
          d="M5.2 4C4.3 5.4 4.1 7 4.6 8.3"
          stroke="white"
          strokeOpacity=".5"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    );
  }
  if (variant === "plant") {
    // Leaf with a pale midrib.
    return (
      <svg viewBox="0 0 12 12" className={styles.shape}>
        <path
          d="M1.5 10.5C1.5 5.2 4.8 1.5 10.5 1.5 10.5 6.8 7.2 10.5 1.5 10.5Z"
          fill="currentColor"
          className={styles.body}
        />
        <path
          d="M2.5 9.5 8.5 3.5"
          stroke="white"
          strokeOpacity=".45"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  // Soft four-point sparkle.
  return (
    <svg viewBox="0 0 12 12" className={styles.shape}>
      <path
        d="M6 0C6.6 3.6 8.4 5.4 12 6 8.4 6.6 6.6 8.4 6 12 5.4 8.4 3.6 6.6 0 6 3.6 5.4 5.4 3.6 6 0Z"
        fill="currentColor"
        className={styles.body}
      />
    </svg>
  );
}
