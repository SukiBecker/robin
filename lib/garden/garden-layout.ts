/**
 * Pure placement-layout math shared between GardenView's real rendering
 * and the Garden page's click-to-place hover preview, so the two can
 * never silently drift apart the way they used to (see the Fountain
 * WYSIWYG bug: the preview drew an exact footprint box while the actual
 * placement rendered a differently-sized, differently-anchored image).
 * Both call these same functions instead of each re-deriving the numbers.
 */

import { categoryMaxWidthPercent, growthSizeFraction } from "./item-visuals";

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/** Near-big/far-small depth cue: objects lower in the plot (higher pos_y)
    render up to 34% larger. Precise-placement items skip this entirely
    (see garden-view.tsx) since they must stay exactly footprint-sized. */
export function depthScaleForPosY(pos_y: number): number {
  return 0.82 + (clampPercent(pos_y) / 100) * 0.34;
}

/** On-screen width, as % of the plot's own width, for an "organic"
    (non-precise-placement) object — category ceiling × footprint ×
    growth × depth × the object's own manual scale. See
    lib/garden/item-visuals.ts for the category/growth pieces. */
export function organicWidthPercent(params: {
  category: string | null;
  itemName: string | null;
  footprintWidth: number;
  growthPercent: number | null;
  scale: number;
  pos_y: number;
}): number {
  return (
    categoryMaxWidthPercent(params.category, params.itemName) *
    params.footprintWidth *
    growthSizeFraction(params.growthPercent) *
    depthScaleForPosY(params.pos_y) *
    params.scale
  );
}

export type FootprintBoxRect = {
  leftPercent: number;
  topPercent: number;
  widthPercent: number;
  heightPercent: number;
};

/** The exact top-left-anchored box a footprintWidth x footprintHeight
    item reserves on a gridWidth x gridHeight plot, as plot-relative
    percentages. This is the one formula every precise-placement
    rendering (GardenView) and preview (the Garden page's hover box)
    both use, so a precise item's placement always exactly matches what
    its preview showed. */
export function footprintBoxRect(
  grid_x: number,
  grid_y: number,
  footprintWidth: number,
  footprintHeight: number,
  gridWidth: number,
  gridHeight: number
): FootprintBoxRect {
  return {
    leftPercent: (grid_x / gridWidth) * 100,
    topPercent: (grid_y / gridHeight) * 100,
    widthPercent: (footprintWidth / gridWidth) * 100,
    heightPercent: (footprintHeight / gridHeight) * 100,
  };
}
