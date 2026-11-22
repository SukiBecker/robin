"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Button } from "@/components/journal/button";
import { GameIcon } from "@/components/journal/game-icon";
import { PaperPanel } from "@/components/journal/paper-panel";
import { RobinNote } from "@/components/journal/robin-note";
import { shake } from "@/lib/motion/shake";
import type { OwnedCount } from "@/lib/shop/owned-counts";
import { usePurchaseEvents } from "@/lib/shop/purchase-events";
import { formatSeedGrown, formatStudyTime } from "./item-facts";
import { ItemGoods } from "./item-goods";
import { RobinPerch, type PerchMood } from "./robin-perch";
import styles from "./item-note.module.css";

export type ItemNoteItem = {
  id: string;
  name: string;
  category: string | null;
  price: number;
  unlockLevel: number;
  imageAssetUrl: string | null;
  /** attributes.unlimited_placement — bought once (path styles). */
  unlimited: boolean;
  /** Plants group (isGrowingCategory). */
  grows: boolean;
  /** item_catalog.growth_duration_seconds (study time); plants only. */
  growthSeconds: number | null;
};

type ItemNoteProps = {
  item: ItemNoteItem;
  locked: boolean;
  owned?: OwnedCount;
  /** profiles.coins as last fetched from the server; null = unknown. */
  coins: number | null;
  /** purchase_item() is in flight for this item. */
  buying: boolean;
  onBuy: () => void;
  /** Called once the note has closed (Esc, outside click, Close). The
      caller moves focus back to the item. */
  onClose: () => void;
};

const numberFormat = new Intl.NumberFormat("en-US");

/**
 * The detail note of a Nursery item: a paper note taped up over the shelf
 * (robin-design §3 Nursery). Native modal <dialog>: focus moves into it
 * and stays there, Esc and a click outside close it, the page behind is
 * inert. Desktop: centred; below 600px: a slip from the bottom.
 * The main action is the wooden sign (place level): Buy. Locked items get
 * Robin's note instead, an owned path style a plain "Owned" line.
 */
export function ItemNote({ item, locked, owned, coins, buying, onBuy, onClose }: ItemNoteProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const shortId = useId();
  const reduceMotion = useReducedMotion();

  // Opened on mount; the parent unmounts the note after onClose.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // Button feedback, as on the old shelf button. Success: "Bought ✓" for
  // ~1 s (information, so it stays under reduced motion). Error: a hint
  // under the sign plus a shake.
  const buyShakeRef = useRef<HTMLSpanElement>(null);
  const [justBought, setJustBought] = useState(false);
  // Robin is happy for ~2 s after a successful buy (same event as the
  // burst); sad while a buy failed for lack of coins.
  const [happy, setHappy] = useState(false);
  const [refusedForCoins, setRefusedForCoins] = useState(false);
  const happyTimer = useRef<number | undefined>(undefined);
  const [hint, setHint] = useState<{ id: number; text: string } | null>(null);
  const nextHintId = useRef(0);
  const boughtTimer = useRef<number | undefined>(undefined);
  const hintTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(boughtTimer.current);
      window.clearTimeout(hintTimer.current);
      window.clearTimeout(happyTimer.current);
    },
    []
  );

  usePurchaseEvents((event) => {
    if (event.itemId !== item.id) return;
    window.clearTimeout(hintTimer.current);
    if (event.type === "success") {
      setHint(null);
      setRefusedForCoins(false);
      setHappy(true);
      window.clearTimeout(happyTimer.current);
      happyTimer.current = window.setTimeout(() => setHappy(false), 2000);
      setJustBought(true);
      window.clearTimeout(boughtTimer.current);
      boughtTimer.current = window.setTimeout(() => setJustBought(false), 1000);
    } else {
      setJustBought(false);
      if (event.reason === "coins") setRefusedForCoins(true);
      setHint({ id: nextHintId.current++, text: event.message });
      hintTimer.current = window.setTimeout(() => setHint(null), 3500);
      if (!reduceMotion) shake(buyShakeRef.current);
    }
  });

  const ownedTotal = owned?.total ?? 0;
  const ownedUnlimited = item.unlimited && ownedTotal > 0;
  const ownedLine = locked
    ? null
    : item.grows
      ? owned && ownedTotal > 0
        ? formatSeedGrown(owned.seed, owned.grown)
        : null
      : !item.unlimited && ownedTotal > 0
        ? `${ownedTotal} owned`
        : null;
  // Missing coins from the server's last value. purchase_item() re-checks
  // on every buy, this only greys the sign out early.
  const short = coins !== null ? item.price - coins : 0;
  const tooFewCoins = !locked && !ownedUnlimited && short > 0 && !justBought;

  // Robin's mood: happy right after a buy, sad while coins are short (or
  // the server refused for coins and the wallet hasn't caught up), else
  // neutral — also for locked items and owned path styles.
  const canBuy = !locked && !ownedUnlimited;
  const mood: PerchMood = !canBuy
    ? "neutral"
    : happy
      ? "happy"
      : tooFewCoins || (refusedForCoins && short > 0)
        ? "sad"
        : "neutral";

  function close() {
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      // A click on the dialog box itself (not on the note) is outside.
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <PaperPanel tape="top" padding="md" className={styles.note}>
        <RobinPerch mood={mood}className={styles.robinPerch} />
        <div className={`${styles.hero} ${locked ? styles.heroLocked : ""}`}>
          <ItemGoods
            name={item.name}
            category={item.category}
            imageAssetUrl={item.imageAssetUrl}
            grows={item.grows}
          />
        </div>

        <h2 id={titleId} className={styles.title}>
          {item.name}
        </h2>

        <p className={styles.price}>
          <GameIcon name="coin" size={24} />
          <span>{numberFormat.format(item.price)}</span>
          <span className={styles.visuallyHidden}> coins</span>
        </p>

        {(item.grows && item.growthSeconds) || ownedLine || (item.unlimited && !ownedUnlimited) ? (
          <ul className={styles.facts}>
            {item.grows && item.growthSeconds ? (
              <li>Grows with {formatStudyTime(item.growthSeconds)} of study</li>
            ) : null}
            {item.unlimited && !ownedUnlimited && !locked && <li>Buy once, place as often as you like</li>}
            {ownedLine && <li>You have {ownedLine}</li>}
          </ul>
        ) : null}

        <div className={styles.action}>
          {locked ? (
            <RobinNote surface="paper" className={styles.robin}>
              Unlocks at Level {item.unlockLevel}.
            </RobinNote>
          ) : ownedUnlimited ? (
            <p className={styles.owned}>Owned · place as often as you like</p>
          ) : (
            <>
              <span ref={buyShakeRef} className={styles.buyShake}>
                <Button
                  variant="primary"
                  onClick={onBuy}
                  loading={buying}
                  disabled={tooFewCoins}
                  aria-describedby={tooFewCoins ? shortId : undefined}
                >
                  {justBought ? (
                    <>
                      Bought <span aria-hidden="true">✓</span>
                    </>
                  ) : (
                    "Buy"
                  )}
                </Button>
              </span>
              {tooFewCoins && (
                <p id={shortId} className={styles.hint}>
                  You need {short} more {short === 1 ? "coin" : "coins"}
                </p>
              )}
              {hint && (
                // Keyed so a repeated error re-runs the fade-in.
                <p key={hint.id} className={styles.hint} role="status">
                  {hint.text}
                </p>
              )}
            </>
          )}
        </div>

        <Button variant="quiet" onClick={close} className={styles.close}>
          Close
        </Button>
      </PaperPanel>
    </dialog>
  );
}
