"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { TabularNumber } from "./tabular-number";
import styles from "./xp-shared.module.css";

/* Shared pieces of the XP displays (XpSeedRow, XpSeedJar). */

/** Same curve as --xp-ease in the CSS (ease-out cubic), so the number and
    the fill arrive together. */
const XP_DURATION = 600;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Clamps value/max to something drawable: NaN, Infinity, negatives and
    max ≤ 0 never reach the DOM (aria-valuenow stays a real number). */
export function safeXp(value: number, max: number) {
  const m = Number.isFinite(max) && max > 0 ? max : 1;
  const v = Number.isFinite(value) ? Math.max(0, Math.min(m, value)) : 0;
  return { value: v, max: m, ratio: v / m };
}

export const fmtXp = (n: number) => Math.round(n).toLocaleString("en-US");

/** progressbar attributes: the label names the level only, the numbers
    come from aria-valuetext (no double announcement). */
export function xpAria(level: number, value: number, max: number) {
  return {
    role: "progressbar" as const,
    "aria-label": `Level ${level}`,
    "aria-valuemin": 0,
    "aria-valuemax": max,
    "aria-valuenow": value,
    "aria-valuetext": `${fmtXp(value)} of ${fmtXp(max)} XP`,
  };
}

/** Counts to value with ease-out cubic; instant with reduced motion.
    Starts at the current value, so the first render never animates. */
function useCountTo(value: number) {
  const [display, setDisplay] = useState(value);
  const shown = useRef(value);

  useEffect(() => {
    const from = shown.current;
    if (from === value) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shown.current = value;
      setDisplay(value);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / XP_DURATION);
      const next = Math.round(from + (value - from) * easeOutCubic(t));
      shown.current = next;
      setDisplay(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return display;
}

/** "42 / 70 XP" in Fraunces, numbers in TabularNumber, ink. Its own component, so the
    count-up only re-renders these few spans. Decorative (aria-hidden):
    the progressbar's aria-valuetext carries the numbers. */
export function XpAmount({ value, max, className = "" }: { value: number; max: number; className?: string }) {
  const shown = useCountTo(value);
  return (
    <span className={`${styles.amount} ${className}`} aria-hidden>
      <TabularNumber className={styles.value}>{fmtXp(shown)}</TabularNumber>
      {/* a narrow row may drop " / 70" (data-part="max"); "42 XP" always stays */}
      <span className={styles.of} data-part="max">
        {" / "}
        <TabularNumber>{fmtXp(max)}</TabularNumber>
      </span>
      <span className={styles.of}>{" XP"}</span>
    </span>
  );
}

/** One seed (public/ui/seed.webp, watercolour, drawn lying diagonally).
    Sized by the parent's font-size (1em); decorative. Loaded eagerly and
    unoptimised: it sits in the always-visible header, and the 6 KB WebP
    needs no resizing. Printed with multiply plus a fine xp-deep contour,
    so the seed stands out from the paper at ≥ 3:1. */
export function SeedGlyph({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/ui/seed.webp"
      alt=""
      aria-hidden
      width={127}
      height={128}
      loading="eager"
      unoptimized
      className={`${styles.seed} ${className}`}
    />
  );
}
