import type { ComponentPropsWithoutRef, CSSProperties, Ref } from "react";
import { TabularNumber } from "./tabular-number";
import styles from "./luggage-tag.module.css";

type TagContent =
  | {
      /** The next place, e.g. "Beach". */
      destination: string;
      /** Level at which it opens (worlds.unlock_level). */
      unlockLevel: number;
      /** XP still missing to that level (threshold − profile XP), from the
          server's level_thresholds; never a locally computed level. */
      xpToGo: number;
      arrived?: false;
    }
  | {
      /** Every place is reached: the tag says so instead of a next stop. */
      arrived: true;
      destination?: string;
      unlockLevel?: never;
      xpToGo?: never;
    };

type LuggageTagProps = Omit<ComponentPropsWithoutRef<"div">, "children"> &
  TagContent & {
    /** Small rotation in degrees, clamped to ±3 (a small note). Default −2. */
    tilt?: number;
    /** Tied to something (the seed jar's neck): the twine runs from the
        element's top-left corner — the knot — down to the hole, and the
        tag swings from that corner. Place the element so its top-left
        corner sits on the knot. Length via --tag-string-reach (across)
        and --tag-string-drop (down). Without it: a loose loop of string. */
    tied?: boolean;
    ref?: Ref<HTMLDivElement>;
  };

const MAX_TILT = 3;
const numberFormat = new Intl.NumberFormat("en-US");

/** "Next stop": a manila luggage tag on a string, with the next place and
    the XP still to go — or, once every place is reached, "All places
    reached". Journal page only, always on paper.
    PLACEHOLDER material: CSS card (clipped corners, punched hole, drawn
    string); a painted tag asset replaces it later (same props). */
export function LuggageTag(props: LuggageTagProps) {
  const {
    destination,
    unlockLevel,
    xpToGo,
    arrived = false,
    tilt = -2,
    tied = false,
    className = "",
    style,
    ref,
    ...rest
  } = props;
  const angle = Math.max(-MAX_TILT, Math.min(MAX_TILT, tilt));
  const level =
    unlockLevel !== undefined && Number.isFinite(unlockLevel) ? Math.max(1, Math.round(unlockLevel)) : 1;
  const xp = xpToGo !== undefined && Number.isFinite(xpToGo) ? Math.max(0, Math.round(xpToGo)) : 0;

  return (
    <div
      {...rest}
      ref={ref}
      className={[styles.tag, tied ? styles.tied : "", className].filter(Boolean).join(" ")}
      style={angle ? ({ ...style, "--tag-tilt": `${angle}deg` } as CSSProperties) : style}
    >
      {tied ? (
        // Knot (0,0) to hole (100,100): two strands, a little slack.
        <svg
          className={styles.twine}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M0 0C22 30 55 62 100 100" vectorEffect="non-scaling-stroke" />
          <path d="M3 2C34 22 64 58 100 100" vectorEffect="non-scaling-stroke" />
        </svg>
      ) : (
        <svg className={styles.string} viewBox="0 0 60 40" aria-hidden="true" focusable="false">
          <path d="M46 20c-8-3-15-9-22-15C17-1 8-2 1 1" />
          <path d="M46 20c-7 2-13 7-20 9-8 2-15 0-22-4" />
        </svg>
      )}
      <div className={styles.card}>
        <span className={styles.ring} aria-hidden="true" />
        {arrived ? (
          <>
            <p className={styles.kicker}>Last stop</p>
            <p className={styles.destination}>{destination ?? "All places reached"}</p>
            <p className={styles.toGo}>New places are on their way.</p>
          </>
        ) : (
          <>
            <p className={styles.kicker}>Next stop</p>
            <p className={styles.destination}>{destination}</p>
            <p className={styles.toGo}>
              <TabularNumber>{numberFormat.format(xp)}</TabularNumber> XP to go
            </p>
            <p className={styles.level}>opens at Level {level}</p>
          </>
        )}
      </div>
    </div>
  );
}
