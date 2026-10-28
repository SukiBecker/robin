import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AnimatedCounter } from "@/components/animated-counter";
import { CoinIcon } from "@/components/coin-icon";
import { usePurchaseEvents } from "@/lib/shop/purchase-events";
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
 */
export function ShopWallet({ coins }: ShopWalletProps) {
  const reduceMotion = useReducedMotion();
  const nextId = useRef(0);
  const [floaters, setFloaters] = useState<SpendFloater[]>([]);

  usePurchaseEvents(({ pricePaid }) => {
    if (pricePaid <= 0) return;
    const id = nextId.current++;
    setFloaters((current) => [...current, { id, amount: pricePaid }]);
  });

  function removeFloater(id: number) {
    setFloaters((current) => current.filter((floater) => floater.id !== id));
  }

  return (
    <div className={styles.walletPill} aria-label={`${coins ?? 0} coins`}>
      <span className={styles.walletValue}>
        <CoinIcon size={28} />
        {coins === null ? "—" : <AnimatedCounter value={coins} duration={600} />}
      </span>
      <span className={styles.floaterLayer} aria-hidden="true">
        {floaters.map((floater) => (
          <motion.span
            key={floater.id}
            className={styles.floater}
            initial={{ y: 0, opacity: 1 }}
            // Reduced motion: fade in place, no rise.
            animate={{ y: reduceMotion ? 0 : -24, opacity: 0 }}
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
