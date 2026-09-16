"use client";

import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { Quicksand } from "next/font/google";
import type { GardenObject } from "@/lib/garden/use-garden-objects";
import {
  categoryMaxWidthPercent,
  getItemIllustration,
  getRotationIllustration,
  growthSizeFraction,
} from "@/lib/garden/item-visuals";
import styles from "./garden-view.module.css";

const bodyFont = Quicksand({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-body",
});

type GardenViewProps = {
  objects: GardenObject[] | null;
  /** worlds.grid_width/grid_height (see useGardenObjects()) — needed to
      size and position path tiles exactly to their grid cell. Optional:
      omitting it just means path tiles fall back to the regular
      category-based sizing (a caller that never renders path tiles, if
      any ever exist, doesn't need to pass these). */
  gridWidth?: number | null;
  gridHeight?: number | null;
  /** Caps the plot's rendered size (any valid CSS max-width value, e.g.
      "min(75vh, 760px)"). The plot is always square-cropped to its own
      grid's aspect ratio (gridWidth/gridHeight — 1:1 for the current
      20x20 garden) via aspect-ratio, so capping width also caps height;
      there's no separate height prop anymore. Omit for "as wide as the
      parent allows" (e.g. the Garden page, capped only by .shell's own
      max-width). See the square-plot note below for why this replaced a
      plain fixed height. */
  maxSize?: string;
  cursor?: string;
  onContainerClick?: (event: MouseEvent<HTMLDivElement>) => void;
  onObjectClick?: (event: MouseEvent<HTMLDivElement>, objectId: string) => void;
  /** Placement hover preview (Garden page only — Studyroom doesn't pass
      these). Wired straight to the plot div so callers can translate the
      cursor position into a grid cell the same way onContainerClick
      already does for the click position. */
  onContainerMouseMove?: (event: MouseEvent<HTMLDivElement>) => void;
  onContainerMouseLeave?: (event: MouseEvent<HTMLDivElement>) => void;
  busyObjectId?: string | null;
  /** Overlaid inside the (relatively positioned) garden container — used
      by the Studyroom page to keep timer/session controls in the foreground
      above the garden background. */
  children?: ReactNode;
};

/**
 * Renders a user's garden objects at their pos_x/pos_y (as percentages of
 * this container), styled with an Animal Crossing–style "looking slightly
 * down" feel: near-the-bottom objects render bigger, warmer and in front
 * of far-the-top ones, plus a soft ground-contact shadow under each.
 *
 * Sizing is category-based, never a native pixel size from the source
 * art — see lib/garden/item-visuals.ts — so objects stay small/unobtrusive
 * with plenty of visible lawn between them, the way Animal Crossing reads,
 * rather than dominating the plot. A multi-cell item (item_catalog's
 * footprint_width, e.g. a 3x1 hedge) renders proportionally wider so it
 * visibly fills the grid cells it actually reserves — see
 * app/garden/page.tsx's placement/collision logic for that grid. Illustrated
 * items render their actual growth-stage art; anything without art yet
 * falls back to an abstract shape so new item rows never break rendering.
 *
 * Shared by the Garden page (interactive: place/remove) and the Studyroom
 * page (read-only background) so both render the exact same data the same
 * way.
 *
 * The container itself stays a flat, untransformed 2D plane — the depth
 * illusion is per-object (see depthScale), never a 3D transform on the
 * container — so pos_x/pos_y click math in the Garden page keeps working
 * unchanged.
 *
 * Square plot: the plot's aspect-ratio always matches gridWidth/gridHeight
 * (1:1 for the current 20x20 garden), rather than a fixed independent
 * pixel height. This isn't cosmetic — a rotated (90°/270°) path tile's
 * on-screen footprint swaps width/height, so it only still exactly fills
 * its own grid cell if that cell (and therefore the whole plot) is
 * actually square; a non-square plot made rotated tiles visibly gap or
 * overlap their neighbors. See maxSize for capping the rendered size.
 */
export function GardenView({
  objects,
  gridWidth = null,
  gridHeight = null,
  maxSize,
  cursor = "default",
  onContainerClick,
  onObjectClick,
  onContainerMouseMove,
  onContainerMouseLeave,
  busyObjectId = null,
  children,
}: GardenViewProps) {
  const aspectRatio = gridWidth && gridHeight ? gridWidth / gridHeight : 1;

  return (
    <div
      onClick={onContainerClick}
      onMouseMove={onContainerMouseMove}
      onMouseLeave={onContainerMouseLeave}
      className={`${styles.plot} ${bodyFont.variable}`}
      style={{ aspectRatio, maxWidth: maxSize, cursor }}
    >
      {objects?.length === 0 && (
        <p className={styles.emptyState}>Nothing planted yet.</p>
      )}

      {objects?.map((object) => {
        const stage = growthStage(object.growth_percent);
        // Path tiles must render at one exact, constant size regardless of
        // pos_y — two adjacent path pieces at slightly different depths
        // would otherwise be scaled to different pixel sizes and their
        // edges would never line up, no matter how good the art is. Every
        // other object keeps the near-big/far-small depth cue.
        const depthScale = object.isPathTile
          ? 1
          : 0.82 + (clampPercent(object.pos_y) / 100) * 0.34;
        // Grid-cell size as % of the plot's own width/height — the
        // actual, existing "grid unit" this app has, just expressed as a
        // percentage because the plot container itself is fluid-width.
        // Null until gridWidth/gridHeight resolve, which in practice is
        // always before objects does (see useGardenObjects()'s init()).
        //
        // Width-% and height-% are NOT interchangeable: the plot's height
        // prop is a fixed pixel value (e.g. "600px" on the Garden page)
        // independent of its fluid width, so for a non-square plot (the
        // common case) a percentage of width and the same percentage of
        // height resolve to different pixel amounts. A path tile's
        // <img> used to rely on width:100%/height:auto (i.e. it always
        // rendered perfectly square, following the source art), sized off
        // ONLY cellWidthPercent — fine for two tiles side by side in the
        // same row (both use the same width-based cell size), but two
        // tiles stacked in the same column landed with a gap or overlap,
        // because the vertical step between rows (cellHeightPercent, off
        // the plot's actual height) didn't match how tall each square
        // tile had actually rendered (off the plot's width). Both a width
        // and a height are set explicitly below specifically to fix this.
        const cellWidthPercent = gridWidth ? 100 / gridWidth : null;
        const cellHeightPercent = gridHeight ? 100 / gridHeight : null;

        // A multi-cell object (e.g. a 3x1 hedge) renders proportionally
        // wider so it visibly fills the grid cells place_garden_object()
        // reserved for it — footprint_width defaults to 1 (a normal
        // single-cell item), so this is a no-op for everything else.
        //
        // Path tiles are sized off the grid cell itself (not the
        // category's small-decoration width) and skip growth/scale
        // entirely — they're static, always full-size, and must fill
        // their cell exactly or adjacent tiles' edges won't line up.
        const widthPercent = object.isPathTile
          ? (cellWidthPercent ??
              categoryMaxWidthPercent(object.category, object.item_name)) *
            object.footprint_width
          : categoryMaxWidthPercent(object.category, object.item_name) *
            object.footprint_width *
            growthSizeFraction(object.growth_percent) *
            depthScale *
            object.scale;
        // Only meaningful for path tiles (see the height:100% override on
        // their <img> below) — every other object keeps relying on
        // height:auto off its own intrinsic aspect ratio.
        const heightPercent = cellHeightPercent
          ? cellHeightPercent * object.footprint_height
          : widthPercent;
        // Decoration objects never grow (stage "static"), so there's only
        // ever one image for them — stored under the "grown" key.
        //
        // A handful of items (currently just the bench) draw each of the
        // 4 rotation values as distinct art (front/back/side) instead of
        // CSS-rotating one image in place — getRotationIllustration
        // returns non-null only for those, and takes over both which
        // image renders and whether it's mirrored (see rotateTransform
        // and the <img> style below).
        const rotationIllustration = getRotationIllustration(
          object.item_name,
          object.rotation
        );
        const illustration =
          rotationIllustration?.src ??
          getItemIllustration(object.item_name, stage === "static" ? "grown" : stage);
        const clickable = Boolean(onObjectClick);
        const busy = busyObjectId === object.id;

        // Path tiles: top-left anchored to their own grid cell (grid_x/
        // grid_y, not the jittered pos_x/pos_y a small floating object
        // uses) and no centering transform — edge-flush placement so two
        // adjacent tiles' borders coincide exactly. Every other object
        // keeps the existing "centered on pos_x, bottom-anchored at
        // pos_y" look, appropriate for a small thing standing on the
        // grass rather than a tile that IS the ground.
        // garden_objects.rotation, player-set at placement time (see
        // app/garden/page.tsx's rotate control) — a Kurve/Ende piece only
        // has art drawn for one orientation, the other 3 come from this.
        // An item with its own rotation art (rotationIllustration above)
        // encodes orientation in the chosen image instead, so it skips
        // this CSS rotation entirely — applying both would double-rotate.
        const rotateTransform = rotationIllustration
          ? ""
          : `rotate(${object.rotation}deg)`;

        const wrapStyle: CSSProperties = object.isPathTile
          ? {
              // Deliberately 1px larger than the cell (centered via the
              // -0.5px offset below), not flush to it. Verified live: the
              // layout math itself is subpixel-exact (getBoundingClientRect
              // on two neighboring tiles gives bit-identical edges, even at
              // a deliberately non-round container width) — this isn't a
              // layout gap. The hairline was paint-time antialiasing: an
              // <img> edge that lands on a non-pixel-aligned coordinate
              // gets softened toward whatever's behind it (the grass), and
              // that fade is a hairline right where two tiles meet. A
              // ~1px overlap is the standard fix for tiled art: it can't
              // fully close a fade that isn't there, but it guarantees the
              // neighbor's own opaque pixels cover any that is.
              left: `calc(${(object.grid_x / (gridWidth ?? 1)) * 100}% - 0.5px)`,
              top: `calc(${(object.grid_y / (gridHeight ?? 1)) * 100}% - 0.5px)`,
              width: `calc(${widthPercent}% + 1px)`,
              height: `calc(${heightPercent}% + 1px)`,
              zIndex: Math.round(clampPercent(object.pos_y) * 10),
              transform: rotateTransform,
              // .objectWrap's own transform-origin is "center bottom" —
              // right for a small object rotating/tilting around its own
              // ground-contact point, wrong here: a path tile's box
              // already sits flush on its own cell, so it must rotate
              // around its true center, or a 90°/270° turn pivots the box
              // half a cell off-axis and neighboring tiles' seams gap or
              // overlap (found via the mock rotation test — see chat).
              transformOrigin: "center",
            }
          : {
              left: `${object.pos_x}%`,
              top: `${object.pos_y}%`,
              width: `${widthPercent}%`,
              zIndex: Math.round(clampPercent(object.pos_y) * 10),
              // Rotates around .objectWrap's own "center bottom" origin —
              // exactly right here: it's the same ground-contact point the
              // translate already anchored to pos_y, so the object turns
              // in place around where it visually "stands".
              transform: `translate(-50%, -100%) ${rotateTransform}`,
            };

        return (
          <div
            key={object.id}
            className={`${styles.objectWrap} ${clickable ? styles.objectClickable : ""} ${
              busy ? styles.objectBusy : ""
            }`}
            style={wrapStyle}
            onClick={
              onObjectClick
                ? (event) => onObjectClick(event, object.id)
                : undefined
            }
            title={`${object.item_name ?? "item"} — growth_percent: ${
              object.growth_percent ?? "n/a"
            }${onObjectClick ? " — click to remove" : ""}`}
          >
            {/* A ground-contact shadow makes no sense under a tile that
                IS the ground. */}
            {!object.isPathTile && <div className={styles.objectShadow} />}
            {illustration ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={styles.objectImage}
                src={illustration}
                alt=""
                // .objectImage's height:auto (follow intrinsic aspect) is
                // right for every other object, but a path tile must
                // stretch to fill the wrap's own explicit height/width
                // (see heightPercent above) so it exactly fills its grid
                // cell even when the cell itself isn't square. A mirrored
                // rotation asset (e.g. the bench's one side image reused,
                // flipped, for its other side) gets scaleX(-1) here too.
                style={{
                  ...(object.isPathTile ? { height: "100%" } : undefined),
                  ...(rotationIllustration?.mirrored
                    ? { transform: "scaleX(-1)" }
                    : undefined),
                }}
              />
            ) : (
              <div
                className={styles.object}
                data-stage={stage}
                data-shape={stage === "static" ? "prop" : "organic"}
              />
            )}
          </div>
        );
      })}

      {children}
    </div>
  );
}

type GrowthStage = "static" | "seed" | "growing" | "grown";

function growthStage(growthPercent: number | null): GrowthStage {
  if (growthPercent === null) return "static"; // not growable, e.g. decoration
  if (growthPercent >= 100) return "grown";
  if (growthPercent <= 0) return "seed";
  return "growing";
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}
