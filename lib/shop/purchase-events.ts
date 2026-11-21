import { useEffect, useRef } from "react";

/** Why purchase_item() refused a buy, as far as the UI cares. */
export type PurchaseErrorReason = "coins" | "level" | "other";

/** Fired once per purchase_item() call, after the server answered —
    never optimistically. */
export type PurchaseEvent =
  | {
      type: "success";
      itemId: string;
      /** purchases.price_paid from the server's response. */
      pricePaid: number;
    }
  | {
      type: "error";
      itemId: string;
      reason: PurchaseErrorReason;
      /** Short, friendly, user-facing explanation. */
      message: string;
    };

/**
 * One orchestrated success moment instead of everything at once (ms after
 * the success event): burst + card bounce + "Bought ✓" at 0, then the
 * owned badge pops, then the coins drop ("−price" and the counter).
 * Not applied under prefers-reduced-motion — values just update.
 */
export const PURCHASE_FEEDBACK_DELAY = {
  badge: 250,
  coins: 500,
} as const;

type PurchaseListener = (event: PurchaseEvent) => void;

// Fire-and-forget channel for purchase feedback (wallet "−price" and shake,
// card burst/bounce, button states). Feedback effects subscribe where they
// render, so the purchase flow doesn't need to know or prop-drill to any of
// them. Coins and inventory themselves stay server state, not part of this.
const listeners = new Set<PurchaseListener>();

export function emitPurchase(event: PurchaseEvent) {
  for (const listener of listeners) listener(event);
}

function onPurchase(listener: PurchaseListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Subscribes for the component's lifetime; always calls the latest listener. */
export function usePurchaseEvents(listener: PurchaseListener) {
  const listenerRef = useRef(listener);
  useEffect(() => {
    listenerRef.current = listener;
  });
  useEffect(() => onPurchase((event) => listenerRef.current(event)), []);
}
