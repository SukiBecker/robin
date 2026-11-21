import type { ItemCategory } from "@/lib/garden/item-visuals";

/**
 * Client-side grouping of item_catalog.category values into shop tabs.
 * Purely presentational -- the database categories stay as they are.
 * To add a tab (e.g. "Extras"), append an entry here; the shop page
 * renders whatever this list contains, in this order, and the first
 * entry is the default tab.
 */
/** item_catalog.category values the shop deals in. path_style is
    shop-only (bought once, never placed itself), so it isn't part of the
    garden's ItemCategory. */
type ShopCategory = ItemCategory | "path_style";

export type ShopTab = {
  id: string;
  label: string;
  categories: readonly ShopCategory[];
  emptyMessage: string;
};

const PLANT_CATEGORIES = [
  "flower",
  "plant",
] as const satisfies readonly ShopCategory[];
const DECOR_CATEGORIES = [
  "decoration",
  "path_style",
] as const satisfies readonly ShopCategory[];

/** Plants-group items grow over time once placed (the schema requires a
    growth_duration_seconds for exactly these categories); decor appears
    fully grown right away. */
export function isGrowingCategory(category: string | null): boolean {
  return (
    category !== null &&
    (PLANT_CATEGORIES as readonly string[]).includes(category)
  );
}

export const SHOP_TABS = [
  {
    id: "all",
    label: "All",
    categories: [...PLANT_CATEGORIES, ...DECOR_CATEGORIES],
    emptyMessage: "The shop shelves are empty right now. Check back soon!",
  },
  {
    id: "plants",
    label: "Plants",
    categories: PLANT_CATEGORIES,
    emptyMessage: "No plants in stock yet. New seeds are on their way!",
  },
  {
    id: "decor",
    label: "Decor",
    categories: DECOR_CATEGORIES,
    emptyMessage: "No decorations here yet. Robin is still collecting some!",
  },
] as const satisfies readonly ShopTab[];

export type ShopTabId = (typeof SHOP_TABS)[number]["id"];

export const DEFAULT_SHOP_TAB: ShopTabId = SHOP_TABS[0].id;

/** Items belonging to `tab`, sorted by price ascending (name as tiebreak). */
export function itemsForShopTab<
  T extends { category: string | null; price: number; name: string },
>(items: readonly T[], tab: ShopTab): T[] {
  return items
    .filter(
      (item) =>
        item.category !== null &&
        (tab.categories as readonly string[]).includes(item.category)
    )
    .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
}
