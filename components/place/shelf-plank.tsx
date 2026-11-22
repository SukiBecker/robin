import styles from "./shelf-plank.module.css";

type ShelfPlankProps = {
  /** Positioning from the parent (where the plank hangs). */
  className?: string;
};

/**
 * The painted wall shelf of a place (world 1: the shed) — a plank with
 * two real ends and their metal brackets, the middle stretching to any
 * width. Its top edge is where things stand. Height via --plank-h.
 * Decorative (aria-hidden). Used by the Nursery shelf and the Studyroom.
 * Original design-src/ui/shelf-plank.png, cut by
 * scripts/make-nursery-assets.mjs.
 */
export function ShelfPlank({ className = "" }: ShelfPlankProps) {
  return <span className={`${styles.plank} ${className}`} aria-hidden="true" />;
}
