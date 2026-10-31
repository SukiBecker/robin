"use client";

import type { ReactNode } from "react";
import { AnimatedCounter } from "@/components/animated-counter";
import { CoinIcon } from "@/components/coin-icon";
import { StreakIcon } from "@/components/streak-icon";
import styles from "./garden-hud.module.css";

type GardenHudProps = {
  /** From profiles_with_level — never computed client-side. Null while
      loading (the pills wait rather than flashing a 0). */
  level: number | null;
  coins: number | null;
  streak: number | null;
  onCenter: () => void;
  /** Edit mode on/off — the pen button (shortcut E on the page). */
  editing: boolean;
  onToggleEdit: () => void;
  /** Rendered under the buttons on the right (the mini-map). */
  children?: ReactNode;
};

/** Floating game HUD over the Garden world: stat pills top-left, round
    camera/mode buttons top-right. */
export function GardenHud({
  level,
  coins,
  streak,
  onCenter,
  editing,
  onToggleEdit,
  children,
}: GardenHudProps) {
  return (
    <>
      <div className={styles.stats}>
        {level !== null && (
          <div className={styles.pill} aria-label={`Level ${level}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/level-badge.png" alt="" aria-hidden="true" className={styles.levelBadge} />
            <span className={styles.pillLabel}>Level</span>
            <span className={styles.pillValue}>{level}</span>
          </div>
        )}
        {coins !== null && (
          <div className={styles.pill} aria-label={`${coins} coins`}>
            <CoinIcon size={22} />
            <AnimatedCounter value={coins} className={styles.pillValue} />
          </div>
        )}
        {streak !== null && (
          <div
            className={styles.pill}
            aria-label={`${streak}-day streak`}
            title={`${streak}-day streak`}
          >
            <StreakIcon size={20} />
            <span className={styles.pillValue}>{streak}</span>
          </div>
        )}
      </div>

      <div className={styles.side}>
        <div className={styles.buttons}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onCenter}
            aria-label="Center garden"
            title="Center garden"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="7.5" />
              <circle cx="12" cy="12" r="2.6" className={styles.iconFill} />
              <path d="M12 1.8v3.4M12 18.8v3.4M1.8 12h3.4M18.8 12h3.4" />
            </svg>
          </button>
          <button
            type="button"
            className={`${styles.iconButton} ${editing ? styles.iconButtonActive : ""}`}
            onClick={onToggleEdit}
            aria-pressed={editing}
            aria-label="Edit garden"
            title={editing ? "Done editing (E)" : "Edit garden (E)"}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15.2 4.6l4.2 4.2L9 19.2l-5 .8.8-5z" />
              <path d="M13.2 6.6l4.2 4.2" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
