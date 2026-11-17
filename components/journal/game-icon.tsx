import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import styles from "./game-icon.module.css";

/** Every icon the app knows. Six have their asset; nursery, journal,
    herbarium and settings are slots (placeholder) until their watercolor
    icon exists. */
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

/** Icons with a finished watercolor asset (WebP in public/ui/). */
const ASSETS: Partial<Record<GameIconName, string>> = {
  coin: "/ui/icons/coin.webp",
  xp: "/ui/seed.webp",
  streak: "/ui/icons/streak.webp", // the sun
  freezer: "/ui/icon-freezer.webp",
  studyroom: "/ui/icons/studyroom.webp", // pocket watch
  garden: "/ui/icons/garden.webp", // watering can
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

/** The app's own icons in the asset style (no Lucide). Always sits on paper
    or on the garden; it brings its own colors, so there is nothing to
    theme. A name without an asset yet renders a neutral placeholder
    (dashed square, initial), so layouts can already be built with it. */
export function GameIcon({ name, size = 24, alt, className = "", style, ...rest }: GameIconProps) {
  const src = ASSETS[name];
  const a11y = alt ? ({ role: "img", "aria-label": alt } as const) : ({ "aria-hidden": true } as const);

  return (
    <span
      {...rest}
      {...a11y}
      className={[styles.icon, src ? "" : styles.placeholder, className].filter(Boolean).join(" ")}
      style={{ "--icon-size": SIZES[size], ...style } as CSSProperties}
      data-icon={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.image} src={src} alt="" draggable={false} />
      ) : (
        <span className={styles.initial}>{name.charAt(0)}</span>
      )}
    </span>
  );
}
