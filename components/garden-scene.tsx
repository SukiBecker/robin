"use client";

import {
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import type { GardenObject } from "@/lib/garden/use-garden-objects";
import { getItemIllustration, getRotationIllustration } from "@/lib/garden/item-visuals";
import {
  footprintForRotation,
  growthStage,
  objectBottomY,
  organicWidthCells,
} from "@/lib/garden/garden-layout";
import { getWaterOverlayConfig } from "@/lib/garden/water-overlay-config";
import { edgeSprites, type EdgeSprite } from "@/lib/garden/world-edge";
import {
  APRON_CELLS,
  canvasSizePx,
  CELL_PX,
  EDGE_CELLS,
  worldToCanvasPx,
  type CellRect,
} from "@/lib/garden/world";
import { WaterRippleOverlay } from "./water-ripple-overlay";
import styles from "./garden-scene.module.css";

/** Extra size (world px) path tiles get so neighbors overlap. */
const PATH_OVERLAP_PX = 1.5;

/** Interactive camera, owned by the caller (see useGardenCamera): the
    scene only attaches the refs and input handlers. */
export type GardenSceneCamera = {
  viewportRef: RefObject<HTMLDivElement | null>;
  worldRef: RefObject<HTMLDivElement | null>;
  handlers: {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
    onClickCapture: (event: MouseEvent<HTMLDivElement>) => void;
  };
};

type GardenSceneProps = {
  objects: GardenObject[] | null;
  /** The world's size in cells (worlds.grid_width/grid_height). Null
      while unknown (or if the world failed to load): a fixed view then
      still renders an empty lawn around its region, so overlays like the
      Studyroom panel keep working. */
  gridWidth: number | null;
  gridHeight: number | null;
  /** Either an interactive camera, or a fixed, non-interactive view of
      `region` scaled to fill the scene's width (e.g. the Studyroom
      background). */
  camera: GardenSceneCamera | { region: CellRect };
  className?: string;
  /** Placement input — the raw events; callers convert the position with
      their camera (useGardenCamera's screenToCanvas). Fired over the
      whole canvas, edge band included, so a caller can show a blocked
      preview over the hedge instead of going silent there. */
  onWorldClick?: (event: MouseEvent<HTMLDivElement>) => void;
  onWorldMouseMove?: (event: MouseEvent<HTMLDivElement>) => void;
  onWorldMouseLeave?: () => void;
  onObjectClick?: (event: MouseEvent<HTMLDivElement>, objectId: string) => void;
  /** Accessible label/tooltip for a clickable object, e.g. "Rose — details". */
  objectActionLabel?: string;
  busyObjectId?: string | null;
  /** "edit" dims the lawn, draws faint cell lines over the playable area
      and frames objects on hover (the Garden page's edit mode). */
  mode?: "view" | "edit";
  /** The object a bubble/menu is open for — kept highlighted. */
  focusedObjectId?: string | null;
  /** The object currently being moved: drawn as a faded ghost at its old
      spot while the preview follows the cursor. */
  movingObjectId?: string | null;
  cursor?: string;
  /** Rendered in world space (px at zoom 1, origin = world cell 0,0),
      above the objects — e.g. the placement preview. */
  worldOverlay?: ReactNode;
  /** Rendered in screen space over the scene, e.g. the Studyroom panel. */
  children?: ReactNode;
};

/**
 * Renders a garden world: lawn, a natural hedge/tree edge, path tiles and
 * placed objects — depth-sorted by their bottom edge, each with a soft
 * tinted ground shadow. Positions come straight from world cells
 * (lib/garden/world.ts) times CELL_PX; the camera then moves/scales the
 * whole canvas with one transform.
 *
 * Shared by the Garden page (interactive camera, placing/removing) and the
 * Studyroom (fixed HOME_REGION view, read-only).
 */
export function GardenScene({
  objects,
  gridWidth: gridWidthProp,
  gridHeight: gridHeightProp,
  camera,
  className = "",
  onWorldClick,
  onWorldMouseMove,
  onWorldMouseLeave,
  onObjectClick,
  objectActionLabel = "details",
  busyObjectId = null,
  mode = "view",
  focusedObjectId = null,
  movingObjectId = null,
  cursor,
  worldOverlay,
  children,
}: GardenSceneProps) {
  const ownViewportRef = useRef<HTMLDivElement>(null);
  const ownWorldRef = useRef<HTMLDivElement>(null);
  const interactive = "viewportRef" in camera;
  const viewportRef = interactive ? camera.viewportRef : ownViewportRef;
  const worldRef = interactive ? camera.worldRef : ownWorldRef;
  const fixedRegion = interactive ? null : camera.region;
  const gridWidth =
    gridWidthProp ?? (fixedRegion ? fixedRegion.x * 2 + fixedRegion.cols : 0);
  const gridHeight =
    gridHeightProp ?? (fixedRegion ? fixedRegion.y * 2 + fixedRegion.rows : 0);

  const canvas = canvasSizePx(gridWidth, gridHeight);

  // Fixed view: scale the region to the scene's width (the scene's own
  // aspect-ratio matches the region, so the height fits too).
  useEffect(() => {
    if (!fixedRegion) return;
    const viewport = ownViewportRef.current;
    if (!viewport) return;
    const { x, y, cols } = fixedRegion;

    const observer = new ResizeObserver(() => {
      const world = ownWorldRef.current;
      if (!world) return;
      const scale = viewport.clientWidth / (cols * CELL_PX);
      world.style.transform = `translate3d(${-worldToCanvasPx(x) * scale}px, ${
        -worldToCanvasPx(y) * scale
      }px, 0) scale(${scale})`;
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [fixedRegion]);

  const edge = useMemo(() => edgeSprites(gridWidth, gridHeight), [gridWidth, gridHeight]);

  const pathTiles = useMemo(
    () => (objects ?? []).filter((object) => object.isPathTile),
    [objects]
  );

  // Objects and edge sprites share one depth order: whatever's bottom edge
  // is further down is drawn in front. Ties fall back to x, then id, so
  // the order never flickers between renders.
  const standing = useMemo(() => {
    type Entry =
      | { kind: "object"; bottom: number; x: number; id: string; object: GardenObject }
      | { kind: "edge"; bottom: number; x: number; id: string; sprite: EdgeSprite };
    const entries: Entry[] = [
      ...(objects ?? [])
        .filter((object) => !object.isPathTile)
        .map((object) => ({
          kind: "object" as const,
          bottom: objectBottomY(object),
          x: object.pos_x,
          id: object.id,
          object,
        })),
      ...edge.map((sprite) => ({
        kind: "edge" as const,
        bottom: sprite.y,
        x: sprite.x,
        id: sprite.id,
        sprite,
      })),
    ];
    return entries.sort(
      (a, b) => a.bottom - b.bottom || a.x - b.x || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    );
  }, [objects, edge]);

  return (
    <div
      ref={viewportRef}
      className={`${styles.viewport} ${interactive ? styles.interactive : ""} ${className}`}
      data-mode={mode}
      style={fixedRegion ? { aspectRatio: `${fixedRegion.cols} / ${fixedRegion.rows}` } : undefined}
      {...(interactive ? camera.handlers : {})}
    >
      <div
        ref={worldRef}
        className={styles.canvas}
        style={{ width: canvas.width, height: canvas.height, cursor }}
        onClick={onWorldClick}
        onMouseMove={onWorldMouseMove}
        onMouseLeave={onWorldMouseLeave}
      >
        {/* Thicket continuing below the canvas (APRON_CELLS) — only seen
            when edit mode lets the camera scroll past the world's bottom
            edge. The lawn tiles carry on seamlessly from the canvas. First in
            the canvas, so the edge sprites (in the world) draw over it; the
            shade over both comes after the vignette below. */}
        {interactive && (
          <div
            className={styles.apron}
            style={{
              top: canvas.height,
              height: APRON_CELLS * CELL_PX,
              backgroundPosition: `0 ${-canvas.height}px`,
            }}
            aria-hidden="true"
          />
        )}
        <div
          className={styles.world}
          style={{
            left: EDGE_CELLS * CELL_PX,
            top: EDGE_CELLS * CELL_PX,
            width: gridWidth * CELL_PX,
            height: gridHeight * CELL_PX,
          }}
        >
          {/* Path tiles are the ground: always beneath everything else. */}
          <div className={styles.pathLayer}>{pathTiles.map(renderObject)}</div>
          {/* Edit mode: dims the lawn and paths (not the standing objects,
              which stay bright as the things being edited) and draws the
              cell lines over the playable area only. */}
          {mode === "edit" && <div className={styles.editGrid} aria-hidden="true" />}
          {/* DOM order = depth order (see `standing`), no z-index needed. */}
          <div className={styles.objectLayer}>
            {standing.map((entry) =>
              entry.kind === "object" ? renderObject(entry.object) : renderEdge(entry.sprite)
            )}
          </div>
          {worldOverlay && <div className={styles.overlayLayer}>{worldOverlay}</div>}
        </div>
        <div className={styles.vignette} aria-hidden="true" />
        {interactive && (
          <div
            className={styles.apronShade}
            style={{ top: canvas.height, height: APRON_CELLS * CELL_PX }}
            aria-hidden="true"
          />
        )}
      </div>

      {objects?.length === 0 && <p className={styles.emptyState}>Nothing planted yet.</p>}
      {children}
    </div>
  );

  function renderEdge(sprite: EdgeSprite) {
    return (
      <div
        key={sprite.id}
        className={styles.edgeSprite}
        data-tone={sprite.tone}
        style={{
          left: sprite.x * CELL_PX,
          top: sprite.y * CELL_PX,
          width: sprite.width * CELL_PX,
        }}
        aria-hidden="true"
      >
        <div className={styles.shadow} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.image}
          src={sprite.src}
          alt=""
          style={sprite.mirrored ? { transform: "scaleX(-1)" } : undefined}
        />
      </div>
    );
  }

  function renderObject(object: GardenObject) {
    const stage = growthStage(object.growth_percent);
    // A handful of items (currently the bench, pavilion, hedge) draw their
    // rotations as distinct art instead of CSS-rotating one image —
    // getRotationIllustration returns non-null only for those and decides
    // both the image and whether it's mirrored.
    const rotationIllustration = getRotationIllustration(object.item_name, object.rotation);
    // Decoration objects never grow (stage "static"), so their only image
    // is stored under the "grown" key.
    const illustration =
      rotationIllustration?.src ??
      getItemIllustration(object.item_name, stage === "static" ? "grown" : stage);
    const clickable = Boolean(onObjectClick);
    const busy = busyObjectId === object.id;
    const waterOverlayConfig = getWaterOverlayConfig(object.item_name);
    // Items with their own rotation art encode orientation in the image,
    // so they skip the CSS rotation — applying both would double-rotate.
    const rotateTransform = rotationIllustration ? "" : `rotate(${object.rotation}deg)`;

    // Precise-placement items (path tiles, plus anything flagged via
    // item_catalog.attributes.precise_placement) fill exactly the
    // footprint place_garden_object() reserved for them, top-left anchored
    // at pos_x/pos_y, rotating around their center — the same box the
    // placement preview shows (see the Fountain WYSIWYG bug). Every other
    // object is category-sized and stands bottom-center on pos_x/pos_y,
    // rotating around that ground-contact point.
    const wrapStyle: CSSProperties = object.isPrecisePlacement
      ? {
          // Path tiles are drawn a little larger than their cell
          // (centered): an <img> edge on a non-pixel-aligned coordinate
          // gets antialiased toward the grass behind it, and that fade
          // showed as a hairline between neighboring tiles. The overlap
          // is in world px, so it shrinks with the camera — PATH_OVERLAP_PX
          // keeps it at about 1 screen px even at the Studyroom's scale.
          left: object.pos_x * CELL_PX - (object.isPathTile ? PATH_OVERLAP_PX / 2 : 0),
          top: object.pos_y * CELL_PX - (object.isPathTile ? PATH_OVERLAP_PX / 2 : 0),
          width: object.footprint_width * CELL_PX + (object.isPathTile ? PATH_OVERLAP_PX : 0),
          height: object.footprint_height * CELL_PX + (object.isPathTile ? PATH_OVERLAP_PX : 0),
          transform: rotateTransform,
          transformOrigin: "center",
        }
      : {
          left: object.pos_x * CELL_PX,
          top: object.pos_y * CELL_PX,
          width:
            organicWidthCells({
              category: object.category,
              itemName: object.item_name,
              // The rotated footprint: a sideways hedge is 1 cell wide.
              footprintWidth: footprintForRotation(
                object.footprint_width,
                object.footprint_height,
                object.rotation
              ).width,
              growthPercent: object.growth_percent,
              scale: object.scale,
              worldY: object.pos_y,
            }) * CELL_PX,
          transform: `translate(-50%, -100%) ${rotateTransform}`,
        };

    return (
      <div
        key={object.id}
        data-object-id={object.id}
        className={`${styles.objectWrap} ${clickable ? styles.objectClickable : ""} ${
          busy ? styles.objectBusy : ""
        } ${focusedObjectId === object.id ? styles.objectFocused : ""} ${
          movingObjectId === object.id ? styles.objectMoving : ""
        }`}
        style={wrapStyle}
        onClick={onObjectClick ? (event) => onObjectClick(event, object.id) : undefined}
        title={
          onObjectClick ? `${object.item_name ?? "Item"} — ${objectActionLabel}` : undefined
        }
      >
        {/* Still growing: a soft, slowly breathing light behind the plant
            (opacity/transform only; static under reduced motion). */}
        {stage === "growing" && <div className={styles.growGlow} aria-hidden="true" />}
        {/* A tile that IS the ground casts no shadow. */}
        {!object.isPathTile && (
          <div
            className={`${styles.shadow} ${
              object.isPrecisePlacement ? styles.shadowFootprint : ""
            }`}
          />
        )}
        {illustration ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.image}
            src={illustration}
            alt=""
            // A precise-placement item stretches to fill its footprint box;
            // a mirrored rotation asset (e.g. the bench's side image reused
            // for the other side) gets scaleX(-1).
            style={{
              ...(object.isPrecisePlacement ? { height: "100%" } : undefined),
              ...(rotationIllustration?.mirrored ? { transform: "scaleX(-1)" } : undefined),
            }}
          />
        ) : null}
        {illustration && waterOverlayConfig && (
          <WaterRippleOverlay
            ripplePoints={waterOverlayConfig.ripplePoints}
            sweepAngleDeg={waterOverlayConfig.sweepAngleDeg}
          />
        )}
        {!illustration && (
          <div
            className={styles.fallback}
            data-stage={stage}
            data-shape={stage === "static" ? "prop" : "organic"}
          />
        )}
      </div>
    );
  }
}
