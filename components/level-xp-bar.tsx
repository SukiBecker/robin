"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatedCounter } from "./animated-counter";
import { TnumFallback } from "./tnum-fallback";
import styles from "./level-xp-bar.module.css";

type LevelXpBarProps = {
  level: number;
  /** XP earned inside the current level. */
  current: number;
  /** XP needed to finish the current level. */
  next: number;
  /** Fill of the current level, 0–100. */
  percent: number;
  className?: string;
};

type Shown = Omit<LevelXpBarProps, "className">;

// Level-up sequence timings (ms). FILL matches the CSS width transition.
const FILL_MS = 800;
const GLOW_MS = 400;

function clampPercent(percent: number) {
  return Math.min(100, Math.max(0, percent));
}

/**
 * Always-visible level/XP bar (nav bar): seed icon with a small "Lv X"
 * badge, a light track whose copper fill is the focal point, and the
 * "current / next XP" count beside it. Track and fill are pure CSS; only
 * the seed is an illustrated asset (cropped from docs/Level_Bar.png, same
 * treatment as components/xp-icon.tsx).
 *
 * Level-up: fill runs to 100% → short glow pulse → fill snaps to 0 and
 * grows to the new level's remainder, and the level number ticks over.
 */
export function LevelXpBar({ level, current, next, percent, className = "" }: LevelXpBarProps) {
  const [shown, setShown] = useState<Shown>({ level, current, next, percent });
  const [glowing, setGlowing] = useState(false);
  // Off for exactly one frame while the fill snaps back to 0 on level-up.
  const [animateWidth, setAnimateWidth] = useState(true);
  const prevLevel = useRef(level);

  useEffect(() => {
    const target = { level, current, next, percent };
    const leveledUp = level > prevLevel.current;
    prevLevel.current = level;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!leveledUp || reduceMotion) {
      setShown(target);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    let raf = 0;

    // 1) Finish the old level.
    setShown((prev) => ({ ...prev, current: prev.next, percent: 100 }));
    // 2) Glow pulse once it's full.
    timers.push(setTimeout(() => setGlowing(true), FILL_MS));
    timers.push(
      setTimeout(() => {
        // 3) Snap to an empty bar for the new level (no transition) ...
        setGlowing(false);
        setAnimateWidth(false);
        setShown({ ...target, current: 0, percent: 0 });
        // ... then grow to the remainder on the next frame.
        raf = requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            setAnimateWidth(true);
            setShown(target);
          })
        );
      }, FILL_MS + GLOW_MS)
    );

    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
    };
  }, [level, current, next, percent]);

  const fillPercent = clampPercent(shown.percent);

  return (
    <div
      className={[styles.root, glowing ? styles.glowing : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      <span className={styles.badge} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/level-badge.png" alt="" className={styles.badgeImage} />
        <span className={styles.level}>
          Lv <AnimatedCounter value={shown.level} duration={400} />
        </span>
      </span>

      <div
        className={styles.track}
        role="progressbar"
        aria-label="Level progress"
        aria-valuemin={0}
        aria-valuemax={next}
        aria-valuenow={current}
        aria-valuetext={`Level ${level}, ${current} of ${next} XP`}
      >
        <div
          className={[
            styles.fill,
            fillPercent > 0 ? styles.fillVisible : "",
            animateWidth ? "" : styles.noTransition,
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ width: `${fillPercent}%` }}
        />
      </div>

      <span className={styles.xp} aria-hidden="true">
        {/* current never exceeds next, so next's digit count is the widest
            the ticking counter gets (≤ 4 digits with the live thresholds). */}
        <TnumFallback digits={String(shown.next).length}>
          <AnimatedCounter value={shown.current} />
        </TnumFallback>{" "}
        / {shown.next} XP
      </span>
    </div>
  );
}
