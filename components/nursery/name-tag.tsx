import type { ReactNode } from "react";
import styles from "./name-tag.module.css";

type NameTagProps = {
  children: ReactNode;
  className?: string;
};

/** A manila luggage tag with an item's name — the name plate for decor
    and paths in the Nursery. Painted asset public/ui/luggage-tag.webp
    (original design-src/ui/luggage-tag.png), text is live Fraunces in
    the blank part of the tag. Not the Journal's "Next stop" LuggageTag. */
export function NameTag({ children, className = "" }: NameTagProps) {
  return (
    <span className={`${styles.tag} ${className}`}>
      <span className={styles.name}>{children}</span>
    </span>
  );
}
