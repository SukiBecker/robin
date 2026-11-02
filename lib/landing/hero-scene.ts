/**
 * The landing page's static garden: a fixed little plot composed from the
 * same item art the real Garden uses. There's no user yet, so nothing is
 * loaded — this list is the whole scene.
 *
 * Layout follows the Garden's rules (lib/garden): a square cell grid,
 * illustrations standing on their bottom-center, depth-sorted by y, and
 * near objects drawn bigger (depthScaleForPosY). Sizes come from the same
 * category widths (categoryMaxWidthPercent), scaled up because this plot
 * shows HERO_COLS cells instead of the 20-cell plot those are tuned for.
 */

import { categoryMaxWidthPercent } from "@/lib/garden/item-visuals";
import { depthScaleForPosY } from "@/lib/garden/garden-layout";
import { SIZE_REFERENCE_CELLS } from "@/lib/garden/world";

/** Plot size in cells. public/landing/hero-lawn.jpg is cropped from the
    Garden's lawn texture at exactly this many cells, so grass reads at
    the same scale as in the app. */
export const HERO_COLS = 12;
export const HERO_ROWS = 8.4;

const HERO_ZOOM = SIZE_REFERENCE_CELLS / HERO_COLS;

export type HeroImage = { src: string; width: number; height: number };

export type HeroPathTile = { col: number; row: number; image: HeroImage };

export type HeroObject = {
  key: string;
  /** Matches item_catalog.name — only used for the per-item size overrides. */
  name: string;
  category: "flower" | "plant" | "decoration";
  image: HeroImage;
  /** Bottom-center anchor, in % of the plot. */
  x: number;
  y: number;
  /** Footprint width in cells (bigger decorations span more than one). */
  footprint?: number;
  mirrored?: boolean;
};

const img = (src: string, width: number, height: number): HeroImage => ({ src, width, height });

const STONE = img("/garden/items/path-straight-stone.png", 1254, 1254);
const ROSE = img("/garden/items/rose-3.png", 398, 400);
const TULIP = img("/garden/items/tulip-3.png", 387, 400);
const DAISY = img("/garden/items/daisy-3.png", 351, 400);
const LAVENDER = img("/garden/items/lavender-3.png", 400, 373);
const PEONY = img("/garden/items/peony-3.png", 400, 390);
const SUNFLOWER = img("/garden/items/sunflower-3.png", 399, 400);
const BUSH_1 = img("/garden/items/busch-1.png", 288, 400);
const BUSH_3 = img("/garden/items/busch-3.png", 400, 359);
const HEDGE_1 = img("/garden/items/hedge-1.png", 400, 155);
const HEDGE_2 = img("/garden/items/hedge-2.png", 400, 171);
const BENCH = img("/garden/items/bench.png", 400, 300);
const LANTERN = img("/garden/items/lantern.png", 98, 400);
const FOUNTAIN = img("/garden/items/fountain.png", 1226, 1254);

/** A stone path from the front edge up to a small plaza before the bench. */
export const HERO_PATH: HeroPathTile[] = [
  { col: 5, row: 7.4, image: STONE },
  { col: 5, row: 6.4, image: STONE },
  { col: 5, row: 5.4, image: STONE },
  { col: 4, row: 4.4, image: STONE },
  { col: 5, row: 4.4, image: STONE },
  { col: 6, row: 4.4, image: STONE },
];

export const HERO_OBJECTS: HeroObject[] = [
  // back: hedge row framing the plot
  { key: "hedge-a", name: "hedge", category: "plant", image: HEDGE_1, x: 9, y: 22, footprint: 2.2 },
  { key: "hedge-b", name: "hedge", category: "plant", image: HEDGE_2, x: 30, y: 21, footprint: 2.2 },
  { key: "hedge-c", name: "hedge", category: "plant", image: HEDGE_2, x: 71, y: 21, footprint: 2.2, mirrored: true },
  { key: "hedge-d", name: "hedge", category: "plant", image: HEDGE_1, x: 92, y: 22, footprint: 2.2, mirrored: true },
  { key: "sunflower-a", name: "sunflower", category: "flower", image: SUNFLOWER, x: 50, y: 25 },
  { key: "sunflower-b", name: "sunflower", category: "flower", image: SUNFLOWER, x: 57, y: 26, mirrored: true },

  // middle: bench + lantern on the plaza, fountain to the left
  { key: "bench", name: "bench", category: "decoration", image: BENCH, x: 45.8, y: 56.5 },
  { key: "lantern", name: "garden lantern", category: "decoration", image: LANTERN, x: 61.5, y: 56 },
  { key: "fountain", name: "fountain", category: "decoration", image: FOUNTAIN, x: 18, y: 58, footprint: 1.4 },
  { key: "bush-a", name: "bush", category: "plant", image: BUSH_3, x: 84, y: 48 },
  { key: "lavender-a", name: "lavender", category: "flower", image: LAVENDER, x: 74, y: 55 },
  { key: "lavender-b", name: "lavender", category: "flower", image: LAVENDER, x: 79, y: 60 },
  { key: "peony", name: "peony", category: "flower", image: PEONY, x: 36, y: 38 },

  // front: flower beds either side of the path
  { key: "rose-a", name: "rose", category: "flower", image: ROSE, x: 30, y: 78 },
  { key: "rose-b", name: "rose", category: "flower", image: ROSE, x: 24, y: 86, mirrored: true },
  { key: "tulip-a", name: "tulip", category: "flower", image: TULIP, x: 36, y: 92 },
  { key: "daisy-a", name: "daisy", category: "flower", image: DAISY, x: 9, y: 82 },
  { key: "tulip-b", name: "tulip", category: "flower", image: TULIP, x: 63, y: 80 },
  { key: "daisy-b", name: "daisy", category: "flower", image: DAISY, x: 70, y: 90, mirrored: true },
  { key: "peony-b", name: "peony", category: "flower", image: PEONY, x: 80, y: 82 },
  { key: "bush-b", name: "bush", category: "plant", image: BUSH_1, x: 93, y: 96 },

  // Reserved: the garden gate for the planned loading animation (Robin
  // flies through it) goes here once its art exists — see GardenHero's
  // `overlay` slot for where the animation itself mounts.
];

/** On-screen width of an object, in % of the plot — the Garden's sizing
    (category × footprint × depth), zoomed to this plot's cell count. */
export function heroObjectWidthPercent(object: HeroObject): number {
  return (
    categoryMaxWidthPercent(object.category, object.name) *
    (object.footprint ?? 1) *
    depthScaleForPosY(object.y) *
    HERO_ZOOM
  );
}
