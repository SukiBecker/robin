import type { ComponentPropsWithoutRef, CSSProperties, Ref } from "react";
import { InkFrame } from "./ink";
import { TabularNumber } from "./tabular-number";
import styles from "./postage-stamp.module.css";

type StampInk = "green" | "rust" | "blue";

type PostageStampProps = Omit<ComponentPropsWithoutRef<"div">, "children" | "role"> & {
  /** Name of the place, e.g. "The Garden". */
  place: string;
  /** Level at which the place opens (worlds.unlock_level). */
  unlockLevel: number;
  /** When the place was reached (v_world_stamps.unlocked_at, ISO). Missing
      or invalid → the stamp is "Not yet issued". */
  establishedAt?: string | null;
  /** Picture in the window: path to a painted image (placeholder: a plant
      PNG of the place). Missing → an empty, hatched window. */
  motif?: string;
  /** Printed frame and value in one of the stamp inks. */
  color?: StampInk;
  /** Small rotation in degrees, clamped to ±3. Default 0: in a row of
      stamps tilt at most one (one tilted element per panel). */
  tilt?: number;
  ref?: Ref<HTMLDivElement>;
};

const MAX_TILT = 3;

const monthYear = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

function formatEstablished(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? monthYear.format(date) : null;
}

/** A postage stamp for one place of the journey (Journal page).
    Issued: a perforated paper stamp, stuck in with a strip of tape, the
    place's picture in a printed frame, "est. Sep 2026" below and the
    unlock level as its value. Not yet issued: only the pencil outline of
    the stamp, "Not yet issued" and the level it opens at.
    PLACEHOLDER material: CSS paper + printed frame; a painted stamp asset
    replaces it later (same props). Always on paper. */
export function PostageStamp({
  place,
  unlockLevel,
  establishedAt,
  motif,
  color = "green",
  tilt,
  className = "",
  style,
  ref,
  ...rest
}: PostageStampProps) {
  const established = formatEstablished(establishedAt);
  const issued = established !== null;
  const angle = Math.max(-MAX_TILT, Math.min(MAX_TILT, tilt ?? 0));
  const level = Number.isFinite(unlockLevel) ? Math.max(1, Math.round(unlockLevel)) : 1;

  const label = issued
    ? `${place} stamp, established ${established}`
    : `${place} stamp, not yet issued, opens at level ${level}`;

  return (
    <div
      {...rest}
      ref={ref}
      role="img"
      aria-label={label}
      className={[styles.stamp, issued ? styles.issued : styles.pending, styles[color], className]
        .filter(Boolean)
        .join(" ")}
      style={angle ? ({ ...style, "--stamp-tilt": `${angle}deg` } as CSSProperties) : style}
    >
      <div className={styles.sheet} aria-hidden="true">
        <div className={styles.frame}>
          <span className={styles.value}>
            Lv <TabularNumber>{level}</TabularNumber>
          </span>
          <div className={styles.window}>
            {issued && motif && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={motif} alt="" className={styles.motif} loading="lazy" />
            )}
          </div>
          <span className={styles.place}>{place}</span>
          <span className={styles.meta}>{issued ? `est. ${established}` : "Not yet issued"}</span>
        </div>
      </div>
      {issued ? <span className={styles.tape} aria-hidden="true" /> : <InkFrame className={styles.pencil} />}
    </div>
  );
}
