"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import styles from "./shelf.module.css";

/** Painted plank (3-slice: fixed ends, tiled middle). null = dashed
    placeholder until design-src/ui/shelf-plank.png exists; then convert
    it to public/ui/shelf-plank.webp, set this path and tune the end
    slice in shelf.module.css (.plankAsset). */
const SHELF_PLANK_SRC: string | null = null;

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
 * The Nursery's wall shelf: items stand in rows on planks. The number per
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
          <span
            className={`${styles.plank} ${SHELF_PLANK_SRC ? styles.plankAsset : styles.plankPlaceholder}`}
            style={
              SHELF_PLANK_SRC
                ? ({ "--plank-src": `url(${SHELF_PLANK_SRC})` } as CSSProperties)
                : undefined
            }
            aria-hidden="true"
          />
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
