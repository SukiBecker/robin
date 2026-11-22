"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { PaperPanel } from "@/components/journal/paper-panel";
import styles from "./shelf.module.css";

/** Painted plank as a 3-slice (original design-src/ui/shelf-plank.png,
    cut by scripts/make-nursery-assets.mjs): both ends hold a metal
    bracket and stay fixed, the plain-grain middle stretches. Each piece
    is 128 px high, the ends 124 px wide (see .plank in shelf.module.css). */
const SHELF_PLANK_SRC = {
  left: "/ui/shelf-plank-left.webp",
  middle: "/ui/shelf-plank-middle.webp",
  right: "/ui/shelf-plank-right.webp",
} as const;

const PLANK_STYLE = {
  "--plank-left": `url(${SHELF_PLANK_SRC.left})`,
  "--plank-middle": `url(${SHELF_PLANK_SRC.middle})`,
  "--plank-right": `url(${SHELF_PLANK_SRC.right})`,
} as CSSProperties;

/* Slot widths per item. Two per plank from 320 px (288 px inside the
   16 px gutters), up to six on wide screens. */
const NARROW_BREAKPOINT = 600;
const MIN_SLOT = { narrow: 128, wide: 168 } as const;
const GAP = { narrow: 12, wide: 24 } as const;

type ShelfProps<T> = {
  items: readonly T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** Accessible name of the whole list, e.g. "Plants". */
  label: string;
};

/**
 * The Nursery's wall shelf: items stand in rows on planks, with a paper
 * label strip under each plank. The number per
 * plank follows the shelf's own width (measured), so every plank has two
 * real ends instead of a grid with a background. One list for screen
 * readers; the rows are only layout.
 */
export function Shelf<T>({ items, getKey, renderItem, label }: ShelfProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState<number | null>(null);
  const [narrow, setNarrow] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth;
      const isNarrow = width < NARROW_BREAKPOINT;
      const min = isNarrow ? MIN_SLOT.narrow : MIN_SLOT.wide;
      const gap = isNarrow ? GAP.narrow : GAP.wide;
      setNarrow(isNarrow);
      setColumns(Math.max(1, Math.floor((width + gap) / (min + gap))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const perRow = columns ?? 2;
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += perRow) {
    rows.push(items.slice(i, i + perRow));
  }

  return (
    <div
      ref={ref}
      role="list"
      aria-label={label}
      className={`${styles.shelf} ${narrow ? styles.narrow : ""}`}
      style={{ "--shelf-columns": perRow } as CSSProperties}
      // Hidden until measured, so the first paint never shows the
      // fallback column count jumping to the real one.
      data-measured={columns !== null || undefined}
    >
      {rows.map((row, index) => (
        <div key={index} className={styles.row}>
          {/* Label strip: a paper strip pinned under the plank, behind its
              brackets — names, meta and Buy sit on paper, never on the
              wall. */}
          <PaperPanel className={styles.strip} tape="corners" aria-hidden="true">
            {null}
          </PaperPanel>
          <span className={styles.plank} style={PLANK_STYLE} aria-hidden="true" />
          {row.map((item) => (
            <div key={getKey(item)} role="listitem" className={styles.slot}>
              {renderItem(item)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
