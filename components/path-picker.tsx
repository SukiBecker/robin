"use client";

import { useEffect, useRef, useState } from "react";
import type { InventoryItem } from "@/app/garden/page";
import { getItemIllustration } from "@/lib/garden/item-visuals";
import styles from "./path-picker.module.css";

/** The path styles the player can own, each with the same 3 shapes in
    display order — keyed like item-visuals.ts (item_catalog.name,
    case-insensitive/trimmed). A style's group is only rendered once the
    player owns at least one of its shape items (see `items` below, which
    already arrives pre-filtered to owned path-shape items). */
const PATH_STYLES: Array<{
  style: string;
  shapes: Array<{ match: string; label: string }>;
}> = [
  {
    style: "Naturstein",
    shapes: [
      { match: "weg (gerade)", label: "Gerade" },
      { match: "weg (kurve)", label: "Kurve" },
      { match: "weg (ende)", label: "Ende" },
    ],
  },
  {
    style: "Steinweg",
    shapes: [
      { match: "steinweg (gerade)", label: "Gerade" },
      { match: "steinweg (kurve)", label: "Kurve" },
      { match: "steinweg (ende)", label: "Ende" },
    ],
  },
];

type PathPickerProps = {
  /** The subset of inventory already filtered to the (up to 3) unlocked
      path-shape items — see loadInventory() in page.tsx. Empty when the
      player hasn't unlocked any path style yet, in which case this
      component renders nothing. */
  items: InventoryItem[];
  selectedItem: { itemId: string; isGrown: boolean } | null;
  /** Reuses page.tsx's handleSelectItem verbatim — same toggle-to-deselect
      behavior, same placementRotation reset. This component never holds
      its own notion of "which shape is chosen." */
  onSelect: (item: InventoryItem) => void;
  disabled: boolean;
  /** garden.module.css's .inventoryChip / .inventoryChipSelected, passed
      down so the trigger button matches the other inventory chips exactly
      without duplicating that styling here. */
  triggerClassName: string;
  triggerSelectedClassName: string;
};

export function PathPicker({
  items,
  selectedItem,
  onSelect,
  disabled,
  triggerClassName,
  triggerSelectedClassName,
}: PathPickerProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Closes on any click outside the trigger+popover — the same
  // "click elsewhere closes it" behavior as a native <select>/menu.
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  if (items.length === 0) return null;

  const isPathSelected = items.some(
    (item) =>
      selectedItem?.itemId === item.itemId &&
      selectedItem.isGrown === item.isGrown
  );

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={`${triggerClassName} ${
          isPathSelected ? triggerSelectedClassName : ""
        }`}
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
      >
        {isPathSelected ? "✓ " : ""}Wege
      </button>

      {open && (
        <div className={styles.popover}>
          {PATH_STYLES.map(({ style, shapes }) => {
            const tiles = shapes
              .map(({ match, label }) => ({
                label,
                item: items.find(
                  (candidate) => candidate.name.trim().toLowerCase() === match
                ),
              }))
              .filter(
                (tile): tile is { label: string; item: InventoryItem } =>
                  tile.item !== undefined
              );
            if (tiles.length === 0) return null;

            return (
              <div key={style} className={styles.styleGroup}>
                <span className={styles.styleLabel}>{style}</span>
                <div className={styles.tiles}>
                  {tiles.map(({ label, item }) => {
                    const isSelected =
                      selectedItem?.itemId === item.itemId &&
                      selectedItem.isGrown === item.isGrown;
                    const thumbnail = getItemIllustration(item.name, "grown");

                    return (
                      <button
                        key={item.itemId}
                        type="button"
                        className={`${styles.tile} ${
                          isSelected ? styles.tileSelected : ""
                        }`}
                        onClick={() => {
                          onSelect(item);
                          setOpen(false);
                        }}
                        disabled={disabled}
                      >
                        {thumbnail && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            className={styles.tileImage}
                            src={thumbnail}
                            alt=""
                          />
                        )}
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
