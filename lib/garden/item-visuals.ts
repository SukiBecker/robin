/**
 * Garden object sizing + illustration lookup.
 *
 * Animal Crossing–style goal: objects stay small and unobtrusive, with
 * plenty of visible lawn between them — never dominating the plot. Two
 * independent systems combine into one final on-screen size:
 *
 *  1. A per-CATEGORY max width, as a percentage of the garden plot's own
 *     width (never a native pixel size from the source art) — this is
 *     what actually enforces "flowers stay small, trees can be bigger."
 *  2. Within that category ceiling, size eases up smoothly with
 *     growth_percent (v_garden_objects_with_progress) — 70% of the
 *     category max at growth_percent=0 up to the full 100% once fully
 *     grown. No stepped jumps between growth stages.
 *
 * garden_objects.scale (the user's own manual resize, once that UI
 * exists) multiplies on top of both, unchanged.
 */

export type ItemCategory =
  "flower" | "plant" | "decoration" | "tree" | "extra" | "atmosphere";

/** Max width of an object, as % of the garden plot's own width. */
export const CATEGORY_MAX_WIDTH_PERCENT: Record<ItemCategory, number> = {
  flower: 5,
  plant: 8,
  decoration: 12,
  tree: 18,
  // not placeable per docs/ROBIN.md §8 — sized defensively in case that
  // changes, never actually rendered in the garden today.
  extra: 8,
  atmosphere: 8,
};

/** Fallback for an object whose category didn't resolve (e.g. the
    item_catalog join failed) — a safe, mid-sized default rather than 0
    or a crash. */
const DEFAULT_MAX_WIDTH_PERCENT = 8;

/** Per-item overrides, keyed like ITEM_ILLUSTRATIONS below (item_catalog.name,
    case-insensitive/trimmed) — for items whose art aspect ratio makes the
    category default look wrong. Sizing is by width only, so a tall/narrow
    item (e.g. a lamppost-shaped lantern) ends up towering over everything
    else at a normal decoration width; this scales those down independent
    of the category. */
const ITEM_MAX_WIDTH_OVERRIDE_PERCENT: Record<string, number> = {
  "garden lantern": 3.5,
};

export function categoryMaxWidthPercent(
  category: string | null,
  itemName?: string | null
): number {
  if (itemName) {
    const override =
      ITEM_MAX_WIDTH_OVERRIDE_PERCENT[itemName.trim().toLowerCase()];
    if (override !== undefined) return override;
  }
  if (category && category in CATEGORY_MAX_WIDTH_PERCENT) {
    return CATEGORY_MAX_WIDTH_PERCENT[category as ItemCategory];
  }
  return DEFAULT_MAX_WIDTH_PERCENT;
}

/** 0.7 → 1.0 of the category max as growth_percent goes 0 → 100, linear
    (no jumps). A non-growable object (growth_percent null, e.g. most
    decoration) is always at its full category size. */
export function growthSizeFraction(growthPercent: number | null): number {
  if (growthPercent === null) return 1;
  const clamped = Math.min(100, Math.max(0, growthPercent));
  return 0.7 + 0.3 * (clamped / 100);
}

export type GrowthStageKey = "seed" | "growing" | "grown";

type StageImages = Record<GrowthStageKey, string>;

/**
 * Illustrated items, keyed by item_catalog.name (case-insensitive,
 * trimmed) — deliberately not hard-coded to any one item's rendering
 * path elsewhere. Add an entry here for each new item as its art is
 * produced; anything without an entry (or without a matching stage
 * image) falls back to the abstract placeholder shape in GardenView, so
 * missing art never breaks rendering.
 */
const ITEM_ILLUSTRATIONS: Record<string, Partial<StageImages>> = {
  sunflower: {
    seed: "/garden/items/sunflower-1.png",
    growing: "/garden/items/sunflower-2.png",
    grown: "/garden/items/sunflower-3.png",
  },
  rose: {
    seed: "/garden/items/rose-1.png",
    growing: "/garden/items/rose-2.png",
    grown: "/garden/items/rose-3.png",
  },
  tulip: {
    seed: "/garden/items/tulip-1.png",
    growing: "/garden/items/tulip-2.png",
    grown: "/garden/items/tulip-3.png",
  },
  lavender: {
    seed: "/garden/items/lavender-1.png",
    growing: "/garden/items/lavender-2.png",
    grown: "/garden/items/lavender-3.png",
  },
  peony: {
    seed: "/garden/items/peony-1.png",
    growing: "/garden/items/peony-2.png",
    grown: "/garden/items/peony-3.png",
  },
  daisy: {
    seed: "/garden/items/daisy-1.png",
    growing: "/garden/items/daisy-2.png",
    grown: "/garden/items/daisy-3.png",
  },
  hedge: {
    seed: "/garden/items/hedge-1.png",
    growing: "/garden/items/hedge-2.png",
    grown: "/garden/items/hedge-3.png",
  },
  bush: {
    seed: "/garden/items/busch-1.png",
    growing: "/garden/items/busch-2.png",
    grown: "/garden/items/busch-3.png",
  },
  // Decoration items don't grow (growth_percent stays null → "static" in
  // GardenView), so there's only ever one image. It's stored under `grown`
  // — GardenView maps "static" to that key when looking illustrations up.
  "garden lantern": {
    grown: "/garden/items/lantern.png",
  },
  bench: {
    grown: "/garden/items/bench.png",
  },
  // Weg-Items: statisch vorkomponierte Wegstücke (siehe
  // bloomly_path_items_migration.sql / bloomly_path_items_rename_migration.sql)
  // statt Live-Auto-Tiling — der Spieler wählt die Form manuell, das Bild
  // ist bereits fertig zusammengesetzt. Kurve/Ende decken per
  // garden_objects.rotation alle 4 Ausrichtungen ab (Bild jeweils für
  // Süd+Ost bzw. Ost verbunden gezeichnet, Rasen-Ecke NW — siehe
  // compose_path_tiles.py).
  "weg (gerade)": {
    grown: "/garden/items/path-straight.png",
  },
  "weg (kurve)": {
    grown: "/garden/items/path-curve.png",
  },
  "weg (ende)": {
    grown: "/garden/items/path-end.png",
  },
};

export function getItemIllustration(
  itemName: string | null | undefined,
  stage: GrowthStageKey
): string | null {
  if (!itemName) return null;
  const entry = ITEM_ILLUSTRATIONS[itemName.trim().toLowerCase()];
  return entry?.[stage] ?? null;
}
