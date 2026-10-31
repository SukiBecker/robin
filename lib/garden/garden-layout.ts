/**
 * Pure placement-layout math shared between GardenScene's real rendering
 * and the Garden page's click-to-place hover preview, so the two can
 * never silently drift apart the way they used to (see the Fountain
 * WYSIWYG bug: the preview drew an exact footprint box while the actual
 * placement rendered a differently-sized, differently-anchored image).
 * Both call these same functions instead of each re-deriving the numbers.
 */

import { categoryMaxWidthPercent, growthSizeFraction } from "./item-visuals";
import { HOME_REGION, SIZE_REFERENCE_CELLS } from "./world";

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/** Near-big/far-small depth cue: objects lower in the plot (higher pos_y)
    render up to 34% larger. Precise-placement items skip this entirely
    (see garden-scene.tsx) since they must stay exactly footprint-sized. */
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

/** organicWidthPercent as a width in world cells. Depth comes from where
    the anchor sits within HOME_REGION (clamped), which for anything in the
    original garden is exactly the plot-% pos_y it always used — so
    existing objects keep their size. */
export function organicWidthCells(params: {
  category: string | null;
  itemName: string | null;
  footprintWidth: number;
  growthPercent: number | null;
  scale: number;
  /** The object's bottom-center anchor, in world cells. */
  worldY: number;
}): number {
  const homePosY = ((params.worldY - HOME_REGION.y) / HOME_REGION.rows) * 100;
  return (
    (organicWidthPercent({ ...params, pos_y: homePosY }) / 100) *
    SIZE_REFERENCE_CELLS
  );
}

/** The bottom edge, in world cells, that depth sorting uses: further
    down = drawn in front. An organic object's anchor (pos_y) already IS
    its bottom (it stands on it), so that's the edge; a precise-placement
    item is top-left anchored, so its bottom is pos_y + its footprint
    height. */
export function objectBottomY(object: {
  pos_y: number;
  footprint_height: number;
  isPrecisePlacement: boolean;
}): number {
  return object.isPrecisePlacement
    ? object.pos_y + object.footprint_height
    : object.pos_y;
}
