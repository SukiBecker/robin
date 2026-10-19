import type { ElementType, ReactNode } from "react";
import styles from "./card.module.css";

type CardPadding = "sm" | "md" | "lg";

type CardProps = {
  children: ReactNode;
  /** sm = stat tile (Statistics), md = content panel (Settings),
      lg = auth card (extra air on top for Robin's perch). The gap between
      children follows: tight for sm, roomy for md/lg. */
  padding?: CardPadding;
  /** Small caps heading as the first child, e.g. a stat's name. */
  label?: string;
  as?: ElementType;
  className?: string;
};

/** Rounded surface panel with the soft warm shadow (--shadow-panel). */
function CardRoot({ children, padding = "md", label, as: Tag = "div", className = "" }: CardProps) {
  return (
    <Tag className={[styles.card, styles[padding], className].filter(Boolean).join(" ")}>
      {label && <span className={styles.label}>{label}</span>}
      {children}
    </Tag>
  );
}

type CardSectionProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

/** One labelled group inside a card with several, e.g. Settings' Profile
    and Account — separate them with Card.Divider. */
function CardSection({ label, children, className = "" }: CardSectionProps) {
  return (
    <div className={[styles.section, className].filter(Boolean).join(" ")}>
      <span className={styles.label}>{label}</span>
      {children}
    </div>
  );
}

function CardDivider() {
  return <hr className={styles.divider} />;
}

export const Card = Object.assign(CardRoot, {
  Section: CardSection,
  Divider: CardDivider,
});
