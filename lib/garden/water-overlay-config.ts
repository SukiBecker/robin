/**
 * Per-item config for the ambient CSS "moving water" overlay (see
 * components/water-ripple-overlay.tsx) — keyed by item_catalog.name
 * (case-insensitive/trimmed), same lookup pattern as
 * lib/garden/item-visuals.ts's ITEM_ILLUSTRATIONS. GardenView renders
 * <WaterRippleOverlay> on top of an item's <img> only when an entry
 * exists here, so adding a future water item (a waterfall, another
 * fountain variant, ...) is just a new entry, never a GardenView code
 * change.
 *
 * ripplePoints are eyeballed against public/garden/items/fountain.png's
 * actual splash points — the bright foam clusters where each of its
 * water jets lands (the top bowl's single jet, plus the two clearly
 * visible front streams into the lower basin; the two rear streams are
 * mostly hidden behind the central column in this art, so they're
 * skipped rather than placing a ring somewhere no splash is visible).
 * Coordinates are percentages of the item's OWN rendered box — see
 * RipplePoint's doc comment — so they stay correct at any garden zoom
 * level without needing the plot's actual pixel size.
 */
import type { RipplePoint } from "@/components/water-ripple-overlay";

export type WaterOverlayConfig = {
  ripplePoints: RipplePoint[];
  sweepAngleDeg?: number;
};

const WATER_OVERLAY_CONFIG: Record<string, WaterOverlayConfig> = {
  "water fountain": {
    ripplePoints: [
      // upper bowl, center jet
      { xPercent: 51, yPercent: 34, delaySeconds: 0, scale: 0.75 },
      // lower basin, front-left stream
      { xPercent: 33, yPercent: 65, delaySeconds: 0.5, scale: 1 },
      // lower basin, front-right stream
      { xPercent: 71, yPercent: 65, delaySeconds: 1, scale: 1 },
    ],
    sweepAngleDeg: 120,
  },
};

export function getWaterOverlayConfig(
  itemName: string | null | undefined
): WaterOverlayConfig | null {
  if (!itemName) return null;
  return WATER_OVERLAY_CONFIG[itemName.trim().toLowerCase()] ?? null;
}
