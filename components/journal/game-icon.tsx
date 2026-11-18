import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import styles from "./game-icon.module.css";

/** Every icon the app knows, each with its watercolor asset. */
export const GAME_ICON_NAMES = [
  "coin",
  "xp",
  "streak",
  "freezer",
  "studyroom",
  "garden",
  "nursery",
  "journal",
  "herbarium",
  "settings",
] as const;

export type GameIconName = (typeof GAME_ICON_NAMES)[number];

/** Watercolor assets (WebP in public/ui/). */
const ASSETS: Record<GameIconName, string> = {
  coin: "/ui/icons/coin.webp",
  xp: "/ui/seed.webp",
  streak: "/ui/icons/streak.webp", // the sun
  freezer: "/ui/icon-freezer.webp",
  studyroom: "/ui/icons/studyroom.webp", // pocket watch
  garden: "/ui/icons/garden.webp", // watering can
  nursery: "/ui/icons/nursery.webp", // seed bag
  journal: "/ui/icons/journal.webp", // leather book
  herbarium: "/ui/icons/herbarium.webp", // pressed-flower card (no page yet)
  settings: "/ui/icons/settings.webp", // pruning shears
};

/* size in rem (follows the user's font size): 16 / 24 / 48 px at 16px root */
const SIZES = { 16: "1rem", 24: "1.5rem", 48: "3rem" } as const;

type GameIconProps = Omit<ComponentPropsWithoutRef<"span">, "children" | "role"> & {
  name: GameIconName;
  /** Edge length in px at a 16px root, set in rem. Default 24. */
  size?: 16 | 24 | 48;
  /** Only when the icon carries meaning on its own. Without it the icon is
      decorative (aria-hidden) — the number or label next to it says it. */
  alt?: string;
};

/* Size rule (2026-11-17): game icons (coin, xp, streak, freezer) must work
   from 16px up; navigation icons (studyroom, garden, nursery, journal,
   herbarium, settings) are used at 24px or larger. The studyroom watch is
   not readable at 16px — don't use it there. */

/** The app's own icons in the asset style (no Lucide). Always sits on paper
    or on the garden; it brings its own colors, so there is nothing to
    theme. */
export function GameIcon({ name, size = 24, alt, className = "", style, ...rest }: GameIconProps) {
  const a11y = alt ? ({ role: "img", "aria-label": alt } as const) : ({ "aria-hidden": true } as const);

  return (
    <span
      {...rest}
      {...a11y}
      className={[styles.icon, className].filter(Boolean).join(" ")}
      style={{ "--icon-size": SIZES[size], ...style } as CSSProperties}
      data-icon={name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.image} src={ASSETS[name]} alt="" draggable={false} />
    </span>
  );
}
