import { useEffect, useRef } from "react";

/** Fired once per successful purchase_item() call — never optimistically. */
export type PurchaseEvent = {
  itemId: string;
  /** purchases.price_paid from the server's response. */
  pricePaid: number;
};

type PurchaseListener = (event: PurchaseEvent) => void;

// Fire-and-forget channel for purchase feedback (wallet "−price", later
// coin flights/particles). Feedback effects subscribe where they render,
// so the purchase flow doesn't need to know or prop-drill to any of them.
// Coins and inventory themselves stay server state, not part of this.
const listeners = new Set<PurchaseListener>();

export function emitPurchase(event: PurchaseEvent) {
  for (const listener of listeners) listener(event);
}

export function onPurchase(listener: PurchaseListener): () => void {
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
