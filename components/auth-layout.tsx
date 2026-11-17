import type { CSSProperties, ReactNode } from "react";
import { ROBIN_FEET, RobinPerched, type RobinMood } from "./robin-perched";
import Image from "next/image";
import { Card } from "./card";
import styles from "./auth-layout.module.css";

type AuthLayoutProps = {
  children: ReactNode;
  robinMood?: RobinMood;
};

/**
 * Shared shell for every auth page (signin, signup, reset-password and
 * their confirm steps): paper, the card, and Robin perched on
 * the card's top edge.
 *
 * The card (the shared Card, padding "lg") and its perch are siblings
 * inside .cardFrame, which has the card's exact box — so the perch layer
 * never lives inside the card. Behind everything, a flower bed grows in
 * from each bottom corner (public/images/auth/flowers-*.png).
 */
export function AuthLayout({
  children,
  robinMood = "neutral",
}: AuthLayoutProps) {
  const feet = {
    "--robin-feet-x": ROBIN_FEET.x,
    "--robin-feet-y": ROBIN_FEET.y,
  } as CSSProperties;

  return (
    <div className={styles.page}>
      <Image
        className={`${styles.flowers} ${styles.flowersLeft}`}
        src="/images/auth/flowers-left.png"
        width={1200}
        height={501}
        alt=""
        aria-hidden="true"
        sizes="(max-width: 720px) 0px, 520px"
        fetchPriority="low"
        draggable={false}
      />
      <Image
        className={`${styles.flowers} ${styles.flowersRight}`}
        src="/images/auth/flowers-right.png"
        width={1200}
        height={574}
        alt=""
        aria-hidden="true"
        sizes="(max-width: 720px) 0px, 520px"
        fetchPriority="low"
        draggable={false}
      />

      <div className={styles.cardFrame} style={feet}>
        <Card as="section" padding="lg" className={styles.card}>
          {children}
        </Card>

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
