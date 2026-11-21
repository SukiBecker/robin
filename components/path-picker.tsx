"use client";

import type { InventoryItem } from "@/app/garden/page";
import { getItemIllustration } from "@/lib/garden/item-visuals";
import styles from "./path-picker.module.css";

/** The path styles the player can own, each with the same 3 shapes in
    display order — keyed like item-visuals.ts (item_catalog.name,
    case-insensitive/trimmed). */
const PATH_STYLES: Array<{
  style: string;
  shapes: Array<{ match: string; label: string }>;
}> = [
  {
    style: "Natural stone",
    shapes: [
      { match: "weg (gerade)", label: "Straight" },
      { match: "weg (kurve)", label: "Curve" },
      { match: "weg (ende)", label: "End" },
    ],
  },
  {
    style: "Cobblestone",
    shapes: [
      { match: "steinweg (gerade)", label: "Straight" },
      { match: "steinweg (kurve)", label: "Curve" },
      { match: "steinweg (ende)", label: "End" },
    ],
  },
];

export type PathStyleGroup = {
  style: string;
  /** The owned shape items of this style, in display order. */
  shapes: Array<{ label: string; item: InventoryItem }>;
};

/** Groups the unlocked path-shape items (see loadInventory() in page.tsx)
    by style. A style shows up once the player owns any of its shapes. */
export function pathStyleGroups(items: InventoryItem[]): PathStyleGroup[] {
  return PATH_STYLES.map(({ style, shapes }) => ({
    style,
    shapes: shapes
      .map(({ match, label }) => ({
        label,
        item: items.find(
          (candidate) => candidate.name.trim().toLowerCase() === match
        ),
      }))
      .filter(
        (shape): shape is { label: string; item: InventoryItem } =>
          shape.item !== undefined
      ),
  })).filter((group) => group.shapes.length > 0);
}

/** "Natural stone" / "Curve" for a path-shape item name, or null. */
export function pathShapeLabel(
  itemName: string
): { style: string; shape: string } | null {
  const key = itemName.trim().toLowerCase();
  for (const { style, shapes } of PATH_STYLES) {
    const shape = shapes.find((candidate) => candidate.match === key);
    if (shape) return { style, shape: shape.label };
  }
  return null;
}

type PathShapeMenuProps = {
  group: PathStyleGroup;
  selectedItemId: string | null;
  /** Reuses page.tsx's handleSelectItem — this menu never holds its own
      notion of "which shape is chosen". */
  onSelect: (item: InventoryItem) => void;
  rotation: number;
  onRotate: () => void;
  disabled: boolean;
};

/** The inventory tray's mini menu for the selected path style: its
    shapes plus a rotate button (also the R key on the page). */
export function PathShapeMenu({
  group,
  selectedItemId,
  onSelect,
  rotation,
  onRotate,
  disabled,
}: PathShapeMenuProps) {
  return (
    <div
      className={styles.menu}
      role="group"
      aria-label={`${group.style} shapes`}
    >
      {group.shapes.map(({ label, item }) => {
        const isSelected = selectedItemId === item.itemId;
        const thumbnail = getItemIllustration(item.name, "grown");
        return (
          <button
            key={item.itemId}
            type="button"
            className={`${styles.shape} ${isSelected ? styles.shapeSelected : ""}`}
            onClick={() => {
              // Picking the shape that's already chosen keeps it chosen
              // (handleSelectItem would toggle it off).
              if (!isSelected) onSelect(item);
            }}
            aria-pressed={isSelected}
            disabled={disabled}
          >
            {thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={styles.shapeImage}
                src={thumbnail}
                alt=""
                style={
                  isSelected
                    ? { transform: `rotate(${rotation}deg)` }
                    : undefined
                }
              />
            )}
            <span>{label}</span>
          </button>
        );
      })}
      <RotateButton
        rotation={rotation}
        onRotate={onRotate}
        disabled={disabled}
      />
    </div>
  );
}

type RotateButtonProps = {
  rotation: number;
  onRotate: () => void;
  disabled: boolean;
};

/** Rotate button with the current angle — touch's way to turn what's
    being placed (the R key does the same). */
function RotateButton({
  rotation,
  onRotate,
  disabled,
}: RotateButtonProps) {
  return (
    <button
      type="button"
      className={styles.rotate}
      onClick={onRotate}
      disabled={disabled}
      aria-label={`Rotate (R), now ${rotation}°`}
      title="Rotate (R)"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
        <path d="M19.8 3.8v4.6h-4.6" />
      </svg>
      <span className={styles.rotateValue}>{rotation}°</span>
    </button>
  );
}

/** Just the rotate button, in the same small panel as the path menu —
    for any other rotatable item (bench, pavilion, hedge, …). */
export function RotateMenu(props: RotateButtonProps) {
  return (
    <div
      className={`${styles.menu} ${styles.menuRotateOnly}`}
      role="group"
      aria-label="Rotation"
    >
      <RotateButton {...props} />
    </div>
  );
}
