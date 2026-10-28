import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import styles from "./inventory-badge.module.css";

type InventoryBadgeProps = {
  /** Owned quantity from the server. 0 renders nothing, but keep the badge
      mounted anyway so the first buy (0 → 1) still pops. */
  quantity: number;
  /** One-time purchases (path styles) read "Owned" instead of a count. */
  unlimited?: boolean;
  title?: string;
};

const POP_SPRING = { type: "spring", stiffness: 500, damping: 12 } as const;

export function InventoryBadge({
  quantity,
  unlimited = false,
  title,
}: InventoryBadgeProps) {
  const reduceMotion = useReducedMotion();

  // Pop only when the quantity goes UP — not on first render (page load,
  // tab switch) and not when it drops (item placed in the garden). State is
  // adjusted during render (React's "storing info from previous renders"
  // pattern); key={quantity} below remounts the pill so `initial` replays.
  const [prevQuantity, setPrevQuantity] = useState(quantity);
  const [poppedAt, setPoppedAt] = useState<number | null>(null);
  if (quantity !== prevQuantity) {
    setPoppedAt(quantity > prevQuantity ? quantity : null);
    setPrevQuantity(quantity);
  }

  if (quantity <= 0) return null;

  const pop = poppedAt === quantity && !reduceMotion;

  return (
    <motion.span
      key={quantity}
      className={styles.badge}
      title={title}
      initial={pop ? { scale: 1.35 } : false}
      animate={{ scale: 1 }}
      transition={POP_SPRING}
    >
      {unlimited ? (
        "Owned"
      ) : (
        <>
          <span aria-hidden="true">×</span>
          {quantity}
          <span className={styles.visuallyHidden}> owned</span>
        </>
      )}
    </motion.span>
  );
}
