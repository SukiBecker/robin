import type { CSSProperties, ReactNode } from "react";
import { ROBIN_FEET, RobinPerched, type RobinMood } from "./robin-perched";
import { GardenCorner } from "./garden-corner";
import { DEFAULT_AUTH_CORNERS, GROUP_ASPECT, type AuthCorners } from "@/lib/garden/auth-corners";
import styles from "./auth-layout.module.css";

type AuthLayoutProps = {
  children: ReactNode;
  robinMood?: RobinMood;
  /** Plant groups in the bottom corners — swap for seasonal sets. */
  corners?: AuthCorners;
};

/**
 * Shared shell for every auth page (signin, signup, reset-password and
 * their confirm steps): canvas + glows, the card, and Robin perched on
 * the card's top edge.
 *
 * The card and its perch are siblings inside .cardFrame, which has the
 * card's exact box — so the perch layer never lives inside the card and
 * swapping the <section> for a shared Card component later is a one-line
 * change. Behind everything, a garden group grows in from each bottom
 * corner (lib/garden/auth-corners.ts).
 */
export function AuthLayout({
  children,
  robinMood = "neutral",
  corners = DEFAULT_AUTH_CORNERS,
}: AuthLayoutProps) {
  const feet = {
    "--robin-feet-x": ROBIN_FEET.x,
    "--robin-feet-y": ROBIN_FEET.y,
  } as CSSProperties;

  return (
    <div className={styles.page} style={{ "--corner-aspect": GROUP_ASPECT } as CSSProperties}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.glowSecondary} aria-hidden="true" />

      <GardenCorner side="left" items={corners.left} className={styles.corner} />
      <GardenCorner side="right" items={corners.right} className={styles.corner} />

      <div className={styles.cardFrame} style={feet}>
        <section className={styles.card}>{children}</section>

        <div className={styles.perch} aria-hidden="true">
          <span className={`${styles.sprig} ${styles.sprigLeft}`} />
          <span className={`${styles.sprig} ${styles.sprigRight}`} />
          <span className={styles.robinShadow} />
          <div className={styles.robin}>
            <RobinPerched mood={robinMood} />
          </div>
        </div>
      </div>
    </div>
  );
}
