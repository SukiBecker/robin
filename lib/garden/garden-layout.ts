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
function organicWidthPercent(params: {
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

/** The footprint (in cells) an item occupies at a given rotation: at
    90°/270° width and height swap (the hedge, 2x1, becomes 1x2). Must
    match public.garden_footprint_swapped() in
    sql/garden-move-rotation.sql, which place_garden_object() and
    move_garden_object() use for their bounds and collision checks.
    The drawn width follows it too (organicWidthCells' footprintWidth),
    so a sideways hedge fills its 1x2 footprint like the upright one
    fills its 2x1. */
export function footprintForRotation(
  width: number,
  height: number,
  rotation: number
): { width: number; height: number } {
  const normalized = ((Math.round(rotation) % 360) + 360) % 360;
  return normalized === 90 || normalized === 270
    ? { width: height, height: width }
    : { width, height };
}

export type GrowthStage = "static" | "seed" | "growing" | "grown";

/** The 3 growth stages (plus "static" for things that never grow, e.g.
    decorations and path tiles), from v_garden_objects_with_progress's
    growth_percent. Used for the art per stage and the info bubble. */
export function growthStage(growthPercent: number | null): GrowthStage {
  if (growthPercent === null) return "static";
  if (growthPercent >= 100) return "grown";
  if (growthPercent <= 0) return "seed";
  return "growing";
}
