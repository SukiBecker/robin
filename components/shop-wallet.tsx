import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AnimatedCounter } from "@/components/animated-counter";
import { CoinIcon } from "@/components/coin-icon";
import { shake } from "@/lib/motion/shake";
import {
  PURCHASE_FEEDBACK_DELAY,
  usePurchaseEvents,
} from "@/lib/shop/purchase-events";
import styles from "./shop-wallet.module.css";

type ShopWalletProps = {
  /** profiles.coins as last fetched from the server; null = not loaded. */
  coins: number | null;
};

type SpendFloater = { id: number; amount: number };

/**
 * Shop header coin pill. The number counts to each new server value; every
 * purchase also floats its own "−price" up and out beside the pill. Each
 * floater has its own id, so quick buys overlap instead of resetting.
 * A buy refused for missing coins shakes the pill. Under reduced motion
 * there's neither — the counter just switches to the new value.
 */
export function ShopWallet({ coins }: ShopWalletProps) {
  const reduceMotion = useReducedMotion();
  const pillRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const [floaters, setFloaters] = useState<SpendFloater[]>([]);
  const floaterTimers = useRef(new Set<number>());

  useEffect(() => {
    const timers = floaterTimers.current;
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  usePurchaseEvents((event) => {
    if (reduceMotion) return;
    if (event.type === "error") {
      // Only coin trouble is about the wallet; a level error isn't.
      if (event.reason === "coins") shake(pillRef.current);
      return;
    }
    if (event.pricePaid <= 0) return;
    const { pricePaid } = event;
    // "−price" lands in the coin slot of the success sequence, together
    // with the counter (whose value the page applies at the same delay).
    const timer = window.setTimeout(() => {
      floaterTimers.current.delete(timer);
      const id = nextId.current++;
      setFloaters((current) => [...current, { id, amount: pricePaid }]);
    }, PURCHASE_FEEDBACK_DELAY.coins);
    floaterTimers.current.add(timer);
  });

  function removeFloater(id: number) {
    setFloaters((current) => current.filter((floater) => floater.id !== id));
  }

  return (
    <div
      ref={pillRef}
      className={styles.walletPill}
      aria-label={`${coins ?? 0} coins`}
    >
      <span className={styles.walletValue}>
        <CoinIcon size={28} />
        {coins === null ? (
          "—"
        ) : (
          <AnimatedCounter value={coins} duration={600} />
        )}
      </span>
      <span className={styles.floaterLayer} aria-hidden="true">
        {floaters.map((floater) => (
          <motion.span
            key={floater.id}
            className={styles.floater}
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: -24, opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.215, 0.61, 0.355, 1] }}
            onAnimationComplete={() => removeFloater(floater.id)}
          >
            −{floater.amount}
          </motion.span>
        ))}
      </span>
    </div>
  );
}
