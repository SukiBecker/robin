import type { CSSProperties, ReactNode } from "react";
import { ROBIN_FEET, RobinPerched, type RobinMood } from "./robin-perched";
import Image from "next/image";
import { Card } from "./card";
import { JournalSpread } from "./journal/journal-spread";
import desk from "./journal/desk.module.css";
import styles from "./auth-layout.module.css";

type AuthLayoutProps = {
  robinMood?: RobinMood;
} & (
  | {
      /** Card form: everything on one card. */
      children: ReactNode;
      left?: never;
      right?: never;
    }
  | {
      /** Journal form (robin-design §2, Journal level): the open book
          (JournalSpread), with these two pages. Below 48rem book width
          one page, left above right. */
      left: ReactNode;
      right: ReactNode;
      children?: never;
    }
);

/**
 * Shared shell for every auth page (signin, signup, reset-password and
 * their confirm steps): paper, the card, and Robin perched on
 * the card's top edge. With `left`/`right` instead of children the card
 * becomes the open journal (JournalSpread) lying on the walnut desk
 * (desk.module.css, shared with /journal) and Robin sits on the book's
 * top edge instead (Sign-up for now; the others follow).
 *
 * The card (the shared Card, padding "lg") and its perch are siblings
 * inside .cardFrame, which has the card's exact box — so the perch layer
 * never lives inside the card. Card form only: a flower bed grows in from
 * each bottom corner (public/images/auth/flowers-*.png) and two leaf
 * sprigs from the card's edge; the desk has neither.
 */
export function AuthLayout({
  children,
  left,
  right,
  robinMood = "neutral",
}: AuthLayoutProps) {
  const journal = left !== undefined || right !== undefined;
  const feet = {
    "--robin-feet-x": ROBIN_FEET.x,
    "--robin-feet-y": ROBIN_FEET.y,
  } as CSSProperties;

  return (
    <div
      className={`${styles.page} ${journal ? desk.desk : ""}`}
      data-journal={journal || undefined}
    >
      {!journal && (
        <>
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
        </>
      )}

      <div className={styles.cardFrame} style={feet}>
        {journal ? (
          <JournalSpread
            className={`${styles.card} ${desk.bookOnDesk}`}
            left={left}
            right={right}
          />
        ) : (
          <Card as="section" padding="lg" className={styles.card}>
            {children}
          </Card>
        )}

        <div className={styles.perch} aria-hidden="true">
          {/* Leaf sprigs grow from the card's edge only — never out of
              the book on the desk. */}
          {!journal && (
            <>
              <span className={`${styles.sprig} ${styles.sprigLeft}`} />
              <span className={`${styles.sprig} ${styles.sprigRight}`} />
            </>
          )}
          <span className={styles.robinShadow} />
          <div className={styles.robin}>
            <RobinPerched mood={robinMood} />
          </div>
        </div>
      </div>
    </div>
  );
}
