import type { CSSProperties, ReactNode } from "react";
import { ROBIN_FEET, RobinPerched, type RobinMood } from "./robin-perched";
import styles from "./auth-layout.module.css";

type AuthLayoutProps = {
  children: ReactNode;
  robinMood?: RobinMood;
};

/**
 * Shared shell for every auth page (signin, signup, reset-password and
 * their confirm steps): canvas + glows, the card, and Robin perched on
 * the card's top edge.
 *
 * The card and its perch are siblings inside .cardFrame, which has the
 * card's exact box — so the perch layer never lives inside the card and
 * swapping the <section> for a shared Card component later is a one-line
 * change.
 */
export function AuthLayout({ children, robinMood = "neutral" }: AuthLayoutProps) {
  const feet = {
    "--robin-feet-x": ROBIN_FEET.x,
    "--robin-feet-y": ROBIN_FEET.y,
  } as CSSProperties;

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.glowSecondary} aria-hidden="true" />

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
