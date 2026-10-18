/**
 * Garden corners behind the auth card — one group per bottom corner,
 * described as data so a season (or a world) can swap them without
 * touching AuthLayout: add another AuthCorners object and pass it in.
 *
 * Every item is placed inside its group's box (aspect GROUP_ASPECT,
 * width : height), in percent of that box:
 *   x      — left edge, % of group width
 *   w      — item width, % of group width (height follows the image)
 *   bottom — % of group height; negative sinks the item below the
 *            screen edge so the group reads as growing in from it
 *   z      — stacking within the group (back to front)
 * Items may overflow the box on the outer and bottom sides (that's the
 * crop); the box itself is clipped, so nothing ever reaches toward the
 * card past the group's inner edge.
 */

export const GROUP_ASPECT = 1.3;

export type CornerItem = {
  src: string;
  /** Intrinsic pixel size of the asset, for next/image. */
  width: number;
  height: number;
  x: number;
  w: number;
  bottom: number;
  z: number;
};

export type AuthCorners = {
  left: CornerItem[];
  right: CornerItem[];
};

const item = (
  name: string,
  width: number,
  height: number,
  place: Pick<CornerItem, "x" | "w" | "bottom" | "z">
): CornerItem => ({ src: `/garden/items/${name}.png`, width, height, ...place });

/** Default (spring/summer) set: left is lavender + tulips around a full
    bush, right is peony, rose and daisies around a lighter bush. */
export const DEFAULT_AUTH_CORNERS: AuthCorners = {
  left: [
    item("busch-3", 400, 359, { x: -10, w: 64, bottom: -9, z: 1 }),
    item("lavender-3", 400, 373, { x: 48, w: 42, bottom: -7, z: 2 }),
    item("tulip-3", 387, 400, { x: 20, w: 30, bottom: -11, z: 3 }),
  ],
  right: [
    item("busch-2", 352, 400, { x: 52, w: 54, bottom: -7, z: 1 }),
    item("peony-3", 400, 390, { x: 22, w: 40, bottom: -9, z: 2 }),
    item("rose-2", 387, 400, { x: 66, w: 30, bottom: -11, z: 3 }),
    item("daisy-3", 351, 400, { x: 4, w: 26, bottom: -10, z: 3 }),
  ],
};
