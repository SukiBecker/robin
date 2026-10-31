/**
 * The decorative band around the playable world: an irregular ring of
 * hedges and bushes, with bigger, darker "trees" further out, so the
 * world ends in a natural thicket instead of a hard edge.
 *
 * PLACEHOLDER ART: uses the shop's grown bush/hedge illustrations until
 * dedicated edge assets exist (trees, a tileable thicket hedge, a
 * wild-meadow transition). Swap EDGE_ART when they land.
 *
 * Deterministic: a fixed seed, so every visit (and every player) sees the
 * same edge, and nothing reshuffles on re-render.
 */

import { APRON_CELLS, EDGE_CELLS } from "./world";

const EDGE_ART = {
  bush: { src: "/garden/items/busch-3.png", aspect: 359 / 400 },
  hedge: { src: "/garden/items/hedge-3.png", aspect: 166 / 400 },
  // Placeholder for trees: the bush, drawn much larger and darker.
  tree: { src: "/garden/items/busch-3.png", aspect: 359 / 400 },
} as const;

export type EdgeSprite = {
  id: string;
  src: string;
  /** Bottom-center anchor in world cells (negative / beyond the grid =
      inside the edge band). */
  x: number;
  y: number;
  /** Width in cells; height follows the art's own aspect ratio. */
  width: number;
  height: number;
  mirrored: boolean;
  /** Further-out rows render darker, as if under the canopy. */
  tone: "near" | "mid" | "far";
};

/** Small seeded PRNG (mulberry32) — stable output for a given seed. */
function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Row = {
  tone: EdgeSprite["tone"];
  /** Distance range from the playable edge, in cells. */
  depth: [number, number];
  width: [number, number];
  /** Step between sprites, as a fraction of the sprite's width. */
  spacing: number;
  art: (random: () => number, horizontal: boolean) => keyof typeof EDGE_ART;
};

const ROWS: Row[] = [
  {
    tone: "near",
    // Flush with the playable edge: no strip of bare lawn in front of the
    // hedge that looks plantable but isn't.
    depth: [0, 0.2],
    width: [2, 2.8],
    spacing: 0.62,
    // Hedge pieces only read right running left-right (top/bottom sides).
    art: (random, horizontal) => (horizontal && random() < 0.45 ? "hedge" : "bush"),
  },
  { tone: "mid", depth: [1.6, 2.6], width: [2.6, 3.6], spacing: 0.6, art: () => "bush" },
  { tone: "far", depth: [3.2, 4.6], width: [3.8, 5.4], spacing: 0.55, art: () => "tree" },
];

export function edgeSprites(cols: number, rows: number, seed = 7): EdgeSprite[] {
  const random = seededRandom(seed);
  const between = ([min, max]: [number, number]) => min + random() * (max - min);
  const sprites: EdgeSprite[] = [];

  type Side = "top" | "bottom" | "left" | "right";
  const sides: Side[] = ["top", "bottom", "left", "right"];

  for (const side of sides) {
    const horizontal = side === "top" || side === "bottom";
    // Top/bottom run past the corners so the ring closes; left/right
    // only cover the world's own height.
    const [start, end] = horizontal ? [-EDGE_CELLS, cols + EDGE_CELLS] : [0, rows];

    ROWS.forEach((row, rowIndex) => {
      let t = start + random() * 1.2;
      while (t < end) {
        const artKey = row.art(random, horizontal);
        const art = EDGE_ART[artKey];
        const width = between(row.width) * (artKey === "hedge" ? 1.25 : 1);
        const height = width * art.aspect;
        const depth = between(row.depth);

        let x: number;
        let y: number;
        if (side === "top") {
          x = t;
          y = -depth; // grows upward, away from the world
        } else if (side === "bottom") {
          x = t;
          // Grows upward, toward the world — pushed down by (nearly) its
          // own height so its top just meets the last row of cells.
          y = rows + depth + height * 0.92;
        } else {
          // Inner edge of the sprite on the world's edge (minus depth).
          x = side === "left" ? -depth - width * 0.45 : cols + depth + width * 0.45;
          y = t + height * 0.6;
        }

        sprites.push({
          id: `${side}-${rowIndex}-${sprites.length}`,
          src: art.src,
          x,
          y,
          width,
          height,
          mirrored: random() < 0.5,
          tone: row.tone,
        });
        t += width * row.spacing * (0.8 + random() * 0.4);
      }
    });
  }

  // Below the bottom band: a few more rows of dark trees over the apron
  // (see APRON_CELLS), so the thicket keeps going when the camera scrolls
  // past the world for the edit-mode tray. Own random sequence, so the
  // band above keeps exactly its old layout.
  const apronRandom = seededRandom(seed + 1);
  const apronBetween = ([min, max]: [number, number]) =>
    min + apronRandom() * (max - min);
  for (let depth = EDGE_CELLS + 0.6; depth < EDGE_CELLS + APRON_CELLS; depth += 2.4) {
    let t = -EDGE_CELLS + apronRandom() * 1.5;
    while (t < cols + EDGE_CELLS) {
      const art = EDGE_ART.tree;
      const width = apronBetween([4, 5.6]);
      const height = width * art.aspect;
      sprites.push({
        id: `apron-${sprites.length}`,
        src: art.src,
        x: t,
        y: rows + depth + apronBetween([0, 0.8]) + height * 0.92,
        width,
        height,
        mirrored: apronRandom() < 0.5,
        tone: "far",
      });
      t += width * 0.55 * (0.8 + apronRandom() * 0.4);
    }
  }

  return sprites;
}
