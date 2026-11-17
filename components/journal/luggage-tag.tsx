import type { ComponentPropsWithoutRef, CSSProperties, Ref } from "react";
import { TabularNumber } from "./tabular-number";
import styles from "./luggage-tag.module.css";

type LuggageTagProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  /** The next place, e.g. "Beach". */
  destination: string;
  /** Level at which it opens (worlds.unlock_level). */
  unlockLevel: number;
  /** XP still missing to that level (threshold − profile XP), from the
      server's level_thresholds; never a locally computed level. */
  xpToGo: number;
  /** Small rotation in degrees, clamped to ±3 (a small note). Default −2. */
  tilt?: number;
  ref?: Ref<HTMLDivElement>;
};

const MAX_TILT = 3;
const numberFormat = new Intl.NumberFormat("en-US");

/** "Next stop": a manila luggage tag on a string, with the next place and
    the XP still to go. Journal page only, always on paper.
    PLACEHOLDER material: CSS card (clipped corners, punched hole, drawn
    string); a painted tag asset replaces it later (same props). */
export function LuggageTag({
  destination,
  unlockLevel,
  xpToGo,
  tilt = -2,
  className = "",
  style,
  ref,
  ...rest
}: LuggageTagProps) {
  const angle = Math.max(-MAX_TILT, Math.min(MAX_TILT, tilt));
  const level = Number.isFinite(unlockLevel) ? Math.max(1, Math.round(unlockLevel)) : 1;
  const xp = Number.isFinite(xpToGo) ? Math.max(0, Math.round(xpToGo)) : 0;

  return (
    <div
      {...rest}
      ref={ref}
      className={[styles.tag, className].filter(Boolean).join(" ")}
      style={angle ? ({ ...style, "--tag-tilt": `${angle}deg` } as CSSProperties) : style}
    >
      <svg className={styles.string} viewBox="0 0 60 40" aria-hidden="true" focusable="false">
        <path d="M46 20c-8-3-15-9-22-15C17-1 8-2 1 1" />
        <path d="M46 20c-7 2-13 7-20 9-8 2-15 0-22-4" />
      </svg>
      <div className={styles.card}>
        <span className={styles.ring} aria-hidden="true" />
        <p className={styles.kicker}>Next stop</p>
        <p className={styles.destination}>{destination}</p>
        <p className={styles.toGo}>
          <TabularNumber>{numberFormat.format(xp)}</TabularNumber> XP to go
        </p>
        <p className={styles.level}>opens at Level {level}</p>
      </div>
    </div>
  );
}
