/**
 * Seed vs. grown for inventory slots.
 *
 * Only flowers and plants have a real seed state: they're bought as
 * seeds and grow once placed. Decoration also has is_grown = false on
 * every row, but it never grows, so it must not look like a seed. Trees
 * grow over the streak instead and have no seed state either. Extra and
 * atmosphere items aren't placeable at all.
 *
 * No imports on purpose: `npm test` runs this file straight in Node.
 */

/** Categories that are bought as seeds and grow once placed. */
const SEED_CATEGORIES = new Set(["flower", "plant"]);

/** item_catalog fields the decision needs. */
export type SeedStateCatalogItem = { category: string | null };

/** inventory fields the decision needs. */
export type SeedStateInventoryRow = { is_grown: boolean };

/** True when the slot should show the seed packet: a flower or plant
    whose inventory row isn't grown yet. */
export function isSeedState(
  item: SeedStateCatalogItem,
  inventoryRow: SeedStateInventoryRow
): boolean {
  return (
    item.category !== null &&
    SEED_CATEGORIES.has(item.category) &&
    !inventoryRow.is_grown
  );
}

/** Seed, grown, or null for things without a growth state (everything
    that isn't a flower or plant). */
export function growthStateLabel(
  item: SeedStateCatalogItem,
  inventoryRow: SeedStateInventoryRow
): "seed" | "grown" | null {
  if (item.category === null || !SEED_CATEGORIES.has(item.category)) {
    return null;
  }
  return inventoryRow.is_grown ? "grown" : "seed";
}

/**
 * growth_duration_seconds as a readable duration, rounded to whole
 * minutes (at least 1). "long" is for sentences and tooltips
 * ("3 h", "45 min", "1 h 30 min", "2 d 4 h"); "short" fits the 76px
 * slot ("3h", "45m", "1h 30m", "2d 4h").
 */
export function formatGrowthDuration(
  seconds: number,
  style: "long" | "short" = "long"
): string {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const units =
    style === "long"
      ? { d: " d", h: " h", m: " min" }
      : { d: "d", h: "h", m: "m" };
  const parts: string[] = [];
  if (days) parts.push(`${days}${units.d}`);
  if (hours) parts.push(`${hours}${units.h}`);
  // Minutes only matter below a day — "2 d 4 h 7 min" is noise.
  if (minutes && !days) parts.push(`${minutes}${units.m}`);
  return parts.join(" ");
}
