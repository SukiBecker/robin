/**
 * Garden world coordinates.
 *
 * Everything about a placed object's position is in WORLD CELLS:
 * grid_x/grid_y (integer, the collision cell — enforced server-side by
 * place_garden_object()) and pos_x/pos_y (float, the visual anchor). They
 * don't depend on viewport, zoom or CELL_PX. The world's size is the
 * server's own grid (worlds.grid_width/grid_height, 60x60 since
 * sql/garden-world-coordinates.sql).
 *
 * On screen, a cell is CELL_PX at zoom 1 and always square. Around the
 * playable world sits a decorative edge band (EDGE_CELLS wide) that the
 * camera can see but nothing can be placed in; the rendered "canvas" is
 * the world plus that band.
 */

/** On-screen size of one grid cell at zoom 1. */
export const CELL_PX = 44;

/** Width of the decorative hedge/tree band around the playable world. */
export const EDGE_CELLS = 5;

/** Extra thicket drawn below the canvas (cells). In edit mode the camera
    may scroll the world up by the inventory tray's height (insetBottom),
    which would otherwise show the bare page under the canvas. 12 cells
    (528px) cover the tallest tray (~310px on phones, path menu wrapped)
    even at the smallest zoom (0.75 -> ~415 canvas px). */
export const APRON_CELLS = 12;

/** The plot size item-visuals.ts's category widths were tuned against
    (they're "% of a 20-cell-wide plot"). Fixed, so object sizes don't
    change with the world size. */
export const SIZE_REFERENCE_CELLS = 20;

export type CellRect = { x: number; y: number; cols: number; rows: number };

/** The original garden in the middle of the 60x60 world — where the
    camera starts, where Center flies to, and the Studyroom's fixed view.
    A constant on purpose, so that view is easy to change or make
    configurable later. */
export const HOME_REGION: CellRect = { x: 20, y: 20, cols: 20, rows: 20 };

/** Canvas size in px at zoom 1 (world + edge band on every side). */
export function canvasSizePx(gridWidth: number, gridHeight: number) {
  return {
    width: (gridWidth + 2 * EDGE_CELLS) * CELL_PX,
    height: (gridHeight + 2 * EDGE_CELLS) * CELL_PX,
  };
}

/** World cell -> canvas px at zoom 1. */
export function worldToCanvasPx(cells: number): number {
  return (cells + EDGE_CELLS) * CELL_PX;
}

/** Canvas px at zoom 1 -> world cell (float). */
export function canvasPxToWorld(px: number): number {
  return px / CELL_PX - EDGE_CELLS;
}

export function regionCenter(region: CellRect): { x: number; y: number } {
  return { x: region.x + region.cols / 2, y: region.y + region.rows / 2 };
}
