/** How many of one item the player owns, split by inventory bucket. */
export type OwnedCount = {
  /** quantity where is_grown = false */
  seed: number;
  /** quantity where is_grown = true */
  grown: number;
  total: number;
};

/**
 * Folds inventory rows into one OwnedCount per item_id. Rows with
 * quantity <= 0 count as not owned, so an item with only such rows gets
 * no entry at all — callers can treat a missing key as "not owned".
 */
export function buildOwnedCounts(
  rows: ReadonlyArray<{ itemId: string; isGrown: boolean; quantity: number }>
): Record<string, OwnedCount> {
  const counts: Record<string, OwnedCount> = {};
  for (const row of rows) {
    if (row.quantity <= 0) continue;
    const entry = (counts[row.itemId] ??= { seed: 0, grown: 0, total: 0 });
    if (row.isGrown) {
      entry.grown += row.quantity;
    } else {
      entry.seed += row.quantity;
    }
    entry.total += row.quantity;
  }
  return counts;
}
