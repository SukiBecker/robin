"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  placementFlagsFromAttributes,
  useGardenObjects,
} from "@/lib/garden/use-garden-objects";
import { GardenScene } from "@/components/garden-scene";
import { GardenHud } from "@/components/garden-hud";
import { GardenMinimap } from "@/components/garden-minimap";
import { PathPicker } from "@/components/path-picker";
import { TnumFallback } from "@/components/tnum-fallback";
import {
  getItemIllustration,
  getRotationIllustration,
} from "@/lib/garden/item-visuals";
import { organicWidthCells } from "@/lib/garden/garden-layout";
import { useGardenCamera } from "@/lib/garden/use-garden-camera";
import {
  canvasPxToWorld,
  canvasSizePx,
  CELL_PX,
  EDGE_CELLS,
  HOME_REGION,
  regionCenter,
  worldToCanvasPx,
} from "@/lib/garden/world";
import styles from "./garden.module.css";

/** Items that actually look different (and correct) when rotated — the
    pavilion/bench/hedge have dedicated art per rotation (see
    item-visuals.ts's ITEM_ROTATION_ILLUSTRATIONS), and path tiles
    (isPrecisePlacement, checked separately below) use rotation to pick
    which of their 4 orientations to show, since a Kurve/Ende piece only
    has art drawn for one. Everything else — flowers, the lantern, the
    fountain, and any future item without an entry here — has no
    meaningful "rotated" look, so it never gets a rotate control. An
    allow-list rather than a deny-list, since a plain CSS rotation looking
    wrong is the default for most art, not the exception. */
const ROTATABLE_ITEM_NAMES = new Set(["pavilion", "bench", "hedge"]);

function isRotatable(itemName: string, isPrecisePlacement: boolean): boolean {
  return (
    isPrecisePlacement ||
    ROTATABLE_ITEM_NAMES.has(itemName.trim().toLowerCase())
  );
}


/** Center of the original garden, in canvas px — where the camera starts
    and Center flies to. */
const HOME_POINT = {
  x: worldToCanvasPx(regionCenter(HOME_REGION).x),
  y: worldToCanvasPx(regionCenter(HOME_REGION).y),
};

type ProfileStats = { level: number; coins: number; streak: number };

export type InventoryItem = {
  itemId: string;
  isGrown: boolean;
  quantity: number;
  name: string;
  footprintWidth: number;
  footprintHeight: number;
  /** Needed to size the placement preview exactly like the real placed
      object will render (see lib/garden/garden-layout.ts's
      organicWidthPercent). Null for path-shape items (not fetched for
      those — they're always precise-placement, which doesn't need it). */
  category: string | null;
  /** Whether this item must be placed at its exact reserved footprint
      (top-left anchored, no jitter) rather than the organic
      bottom-center-anchored look — see
      lib/garden/use-garden-objects.ts's placementFlagsFromAttributes and
      GardenObject.isPrecisePlacement. True for every path-shape item. */
  isPrecisePlacement: boolean;
  /** Set for path-shape items unlocked via a path_style purchase (see
      loadInventory) — they never get their own inventory row (unbounded
      instead of consuming quantity, see place_garden_object()), so
      quantity/isGrown are meaningless placeholders for these and the chip
      renders "Unlimited" instead. Undefined for every regular inventory
      item, which keeps their existing chip label unchanged. */
  unlimited?: boolean;
};

type SelectedItem = {
  itemId: string;
  isGrown: boolean;
  footprintWidth: number;
  footprintHeight: number;
  category: string | null;
  isPrecisePlacement: boolean;
  /** Needed to look up the placement-preview illustration (item-visuals.ts
      is keyed by name, not id). */
  name: string;
};

/** The 4 orientations place_garden_object()'s p_rotation accepts for a
    manually-rotated item — currently only path tiles expose a UI for
    this (see the rotate control below), but the type/RPC support any
    item. */
type PlacementRotation = 0 | 90 | 180 | 270;

/** The grid cell region a hover (or click) currently targets, and whether
    placing the selected item there would succeed — client-side estimate
    only, mirroring place_garden_object()'s own checks (see
    robin_garden_grid_migration.sql) so the preview and the pre-flight
    check in handleGardenClick agree with what the server will decide. */
type FootprintPreview = {
  itemId: string;
  grid_x: number;
  grid_y: number;
  footprintWidth: number;
  footprintHeight: number;
  blocked: boolean;
  /** The exact pos_x/pos_y (world cells) that will be written if the
      player clicks now — see anchorForCell. */
  pos: { pos_x: number; pos_y: number };
};

export default function GardenPage() {
  const {
    userId,
    worldId,
    gridWidth,
    gridHeight,
    objects,
    loading: gardenLoading,
    error: gardenError,
    reload: reloadGarden,
  } = useGardenObjects();

  const [inventory, setInventory] = useState<InventoryItem[] | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  // Resets to 0 on every new selection (handleSelectItem) so a rotation
  // chosen for one item never silently carries over onto the next.
  const [placementRotation, setPlacementRotation] =
    useState<PlacementRotation>(0);
  const [placing, setPlacing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [hoverPreview, setHoverPreview] = useState<FootprintPreview | null>(
    null
  );

  const [stats, setStats] = useState<ProfileStats | null>(null);

  const pageRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);

  const busy = placing || removingId !== null;
  // Inventory only ever starts loading once userId resolves, so don't let
  // it block the combined loading flag while userId is still null (either
  // still loading, or the initial garden load failed with gardenError).
  const loading = gardenLoading || (userId !== null && inventoryLoading);
  const error = gardenError ?? actionError;
  const worldReady =
    !loading &&
    userId !== null &&
    worldId !== null &&
    gridWidth !== null &&
    gridHeight !== null;

  const canvasSize = useMemo(
    () => canvasSizePx(gridWidth ?? 0, gridHeight ?? 0),
    [gridWidth, gridHeight]
  );

  const camera = useGardenCamera({
    viewportRef,
    worldRef,
    world: canvasSize,
    home: HOME_POINT,
    ready: worldReady,
  });

  // Mini-map shows the whole canvas (world + edge band), in canvas cells.
  const minimapDots = useMemo(
    () =>
      (objects ?? []).map((object) => ({
        id: object.id,
        isPath: object.isPathTile,
        x:
          EDGE_CELLS +
          object.pos_x +
          (object.isPrecisePlacement ? object.footprint_width / 2 : 0),
        y:
          EDGE_CELLS +
          object.pos_y +
          (object.isPrecisePlacement ? object.footprint_height / 2 : 0),
      })),
    [objects]
  );

  const { flyTo } = camera;
  const handleMinimapJump = useCallback(
    (x: number, y: number, animate: boolean) =>
      flyTo(x * CELL_PX, y * CELL_PX, undefined, animate ? 450 : 0),
    [flyTo]
  );
  // Falls back to the "grown" (single static) image for non-growable
  // items — a freshly placed item's real growth stage is "seed", but
  // decoration/path items (see item-visuals.ts) only ever have a "grown"
  // entry, so a plain "seed" lookup would come back null for those.
  const previewIllustration = selectedItem
    ? (getItemIllustration(
        selectedItem.name,
        selectedItem.isGrown ? "grown" : "seed"
      ) ?? getItemIllustration(selectedItem.name, "grown"))
    : null;
  // For an item with its own rotation art (currently just the bench — see
  // item-visuals.ts), the placement preview must show the same
  // front/back/side image (and mirroring) the placed object will actually
  // render with, not previewIllustration CSS-rotated in place.
  const previewRotationIllustration = selectedItem
    ? getRotationIllustration(selectedItem.name, placementRotation)
    : null;

  // HUD numbers — level always from profiles_with_level, never computed
  // here (see the economy rules in the bloomly-design skill).
  useEffect(() => {
    if (userId === null) return;
    let cancelled = false;

    createClient()
      .from("profiles_with_level")
      .select("level, coins, current_streak")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setStats({
          level: data.level,
          coins: data.coins,
          streak: data.current_streak,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // The page fills exactly what's left of the viewport under the sticky
  // nav, whose height changes when it wraps on narrow screens — and also
  // after mount, without any window resize (e.g. the XP row loading in),
  // so the nav itself is observed too.
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    function measure() {
      const top = page!.getBoundingClientRect().top + window.scrollY;
      page!.style.setProperty("--garden-top", `${top}px`);
    }

    measure();
    window.addEventListener("resize", measure);
    const observer = new ResizeObserver(measure);
    const nav = document.querySelector("header");
    if (nav) observer.observe(nav);
    return () => {
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (userId === null) return;

    const profileId = userId;
    let cancelled = false;

    async function load() {
      setInventoryLoading(true);
      await loadInventory(createClient(), profileId);
      if (!cancelled) setInventoryLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function loadInventory(
    supabase: ReturnType<typeof createClient>,
    profileId: string
  ) {
    const { data, error: inventoryError } = await supabase
      .from("inventory")
      .select(
        "item_id, is_grown, quantity, item_catalog(name, placeable, footprint_width, footprint_height, category, attributes)"
      )
      .eq("profile_id", profileId)
      .gt("quantity", 0);

    if (inventoryError) {
      setActionError(inventoryError.message);
      return;
    }

    // Only placeable items belong in this list — place_garden_object()
    // rejects anything else (e.g. the Streak Freezer consumable) anyway.
    const items: InventoryItem[] = (
      data as unknown as Array<{
        item_id: string;
        is_grown: boolean;
        quantity: number;
        item_catalog: {
          name: string;
          placeable: boolean;
          footprint_width: number;
          footprint_height: number;
          category: string | null;
          attributes: unknown;
        } | null;
      }>
    )
      .filter((row) => row.item_catalog?.placeable)
      .map((row) => ({
        itemId: row.item_id,
        isGrown: row.is_grown,
        quantity: row.quantity,
        name: row.item_catalog!.name,
        footprintWidth: row.item_catalog!.footprint_width,
        footprintHeight: row.item_catalog!.footprint_height,
        category: row.item_catalog!.category,
        isPrecisePlacement: placementFlagsFromAttributes(
          row.item_catalog!.attributes
        ).isPrecisePlacement,
      }));

    // Path-shape items (e.g. the 4 path pieces) never get their own
    // inventory row — place_garden_object() checks style ownership instead
    // of consuming one (see bloomly_path_items_migration.sql). Load them
    // straight from item_catalog and only keep the ones whose linked
    // path_style_item_id the player actually owns (inventory.quantity >= 1).
    const { data: pathShapeItems, error: pathShapeError } = await supabase
      .from("item_catalog")
      .select("id, name, footprint_width, footprint_height, attributes")
      .eq("active", true)
      .eq("placeable", true)
      .not("attributes->>path_style_item_id", "is", null);

    if (pathShapeError) {
      setActionError(pathShapeError.message);
      return;
    }

    const pathShapeRows = (pathShapeItems ?? []) as Array<{
      id: string;
      name: string;
      footprint_width: number;
      footprint_height: number;
      attributes: { path_style_item_id?: string };
    }>;

    const styleItemIds = [
      ...new Set(
        pathShapeRows
          .map((row) => row.attributes.path_style_item_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    let ownedStyleIds = new Set<string>();
    if (styleItemIds.length > 0) {
      const { data: styleInventory, error: styleInventoryError } =
        await supabase
          .from("inventory")
          .select("item_id")
          .eq("profile_id", profileId)
          .in("item_id", styleItemIds)
          .gte("quantity", 1);

      if (styleInventoryError) {
        setActionError(styleInventoryError.message);
        return;
      }

      ownedStyleIds = new Set(
        (styleInventory ?? []).map((row) => row.item_id as string)
      );
    }

    const unlockedPathItems: InventoryItem[] = pathShapeRows
      .filter((row) => ownedStyleIds.has(row.attributes.path_style_item_id!))
      .map((row) => ({
        itemId: row.id,
        isGrown: false,
        quantity: Infinity,
        unlimited: true,
        name: row.name,
        footprintWidth: row.footprint_width,
        footprintHeight: row.footprint_height,
        // Path-shape rows are only ever queried via
        // attributes->>path_style_item_id, never path_shape itself, but
        // every one of them is a path tile — no need to re-derive it.
        category: null,
        isPrecisePlacement: true,
      }));

    // Stable order, so chips don't jump around after every placement (the
    // query itself has none): category, then name, then seed before grown.
    items.sort(
      (a, b) =>
        (a.category ?? "").localeCompare(b.category ?? "") ||
        a.name.localeCompare(b.name) ||
        Number(a.isGrown) - Number(b.isGrown)
    );

    setInventory([...items, ...unlockedPathItems]);
  }

  function handleSelectItem(item: InventoryItem) {
    setSelectedItem((current) =>
      current?.itemId === item.itemId && current.isGrown === item.isGrown
        ? null // clicking the already-selected item deselects it
        : {
            itemId: item.itemId,
            isGrown: item.isGrown,
            footprintWidth: item.footprintWidth,
            footprintHeight: item.footprintHeight,
            category: item.category,
            isPrecisePlacement: item.isPrecisePlacement,
            name: item.name,
          }
    );
    // Switching (or deselecting) the item invalidates any preview computed
    // for the previous footprint; the next mousemove recomputes it.
    setHoverPreview(null);
    setPlacementRotation(0);
  }

  function handleRotatePlacement() {
    setPlacementRotation((prev) => ((prev + 90) % 360) as PlacementRotation);
  }

  // Keyboard shortcut ("R") for the same rotate action as the button below
  // — only active while an item is actually selected for placement, so it
  // can't accidentally fire elsewhere on the page.
  useEffect(() => {
    if (
      !selectedItem ||
      !isRotatable(selectedItem.name, selectedItem.isPrecisePlacement)
    )
      return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "r" && event.key !== "R") return;
      // Don't hijack "r" while the user is typing into some future text
      // field on this page.
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      handleRotatePlacement();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItem]);

  /** World cell (top-left of the footprint) under the given pointer —
      the inverse of the camera transform (screenToCanvas), then canvas px
      -> world cells. Can land outside 0..grid-1 over the edge band;
      footprintBlockReason reports that as out of bounds, exactly like the
      server would. */
  function gridCellFromEvent(event: MouseEvent<HTMLDivElement>): {
    grid_x: number;
    grid_y: number;
  } {
    const point = camera.screenToCanvas(event.clientX, event.clientY);
    return {
      grid_x: Math.floor(canvasPxToWorld(point.x)),
      grid_y: Math.floor(canvasPxToWorld(point.y)),
    };
  }

  /** Why placing a footprintWidth x footprintHeight item at grid_x/grid_y
      would fail server-side, or null if it wouldn't (by this client-side
      estimate). Mirrors place_garden_object()'s two checks — and their
      exact exception text — exactly (see
      robin_garden_grid_migration.sql) so this estimate and the actual
      server decision stay in agreement, and so a caller can go straight
      from the reason to the right friendly message. A pure UX shortcut:
      the server re-checks independently and remains the sole authority
      (e.g. another tab could have placed something in the meantime). */
  function footprintBlockReason(
    grid_x: number,
    grid_y: number,
    footprintWidth: number,
    footprintHeight: number,
    gridW: number,
    gridH: number
  ): string | null {
    if (
      grid_x < 0 ||
      grid_y < 0 ||
      grid_x + footprintWidth > gridW ||
      grid_y + footprintHeight > gridH
    ) {
      return "Placement is outside world grid bounds";
    }

    const occupied = (objects ?? []).some((object) =>
      cellsOverlap(
        grid_x,
        grid_y,
        footprintWidth,
        footprintHeight,
        object.grid_x,
        object.grid_y,
        object.footprint_width,
        object.footprint_height
      )
    );

    return occupied ? "Grid cells already occupied" : null;
  }

  function handleGardenMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (!selectedItem || gridWidth === null || gridHeight === null) {
      setHoverPreview(null);
      return;
    }

    const { grid_x, grid_y } = gridCellFromEvent(event);
    const { itemId, footprintWidth, footprintHeight, isPrecisePlacement } =
      selectedItem;

    const blockReason = footprintBlockReason(
      grid_x,
      grid_y,
      footprintWidth,
      footprintHeight,
      gridWidth,
      gridHeight
    );

    setHoverPreview({
      itemId,
      grid_x,
      grid_y,
      footprintWidth,
      footprintHeight,
      blocked: blockReason !== null,
      pos: anchorForCell(
        grid_x,
        grid_y,
        footprintWidth,
        footprintHeight,
        isPrecisePlacement
      ),
    });
  }

  function handleGardenMouseLeave() {
    setHoverPreview(null);
  }

  async function handleGardenClick(event: MouseEvent<HTMLDivElement>) {
    if (
      !selectedItem ||
      busy ||
      userId === null ||
      worldId === null ||
      gridWidth === null ||
      gridHeight === null
    ) {
      return;
    }

    // Grid cell the click landed in is the collision-authoritative
    // placement (place_garden_object() validates/rejects server-side —
    // see robin_garden_grid_migration.sql).
    const { grid_x, grid_y } = gridCellFromEvent(event);
    const { footprintWidth, footprintHeight, isPrecisePlacement } =
      selectedItem;

    // Same check the hover preview already showed the user — re-run here
    // (rather than trusting stale hoverPreview state, e.g. a click that
    // wasn't preceded by a mousemove) so an already-red cell never spends
    // a round-trip finding out what the preview already knew. The server
    // remains the real authority: it re-checks independently below, in
    // case another tab/session placed something in the meantime.
    const blockReason = footprintBlockReason(
      grid_x,
      grid_y,
      footprintWidth,
      footprintHeight,
      gridWidth,
      gridHeight
    );

    if (blockReason !== null) {
      setActionError(friendlyPlaceErrorMessage(blockReason));
      return;
    }

    // pos_x/pos_y: the visual anchor in world cells — the same value the
    // hover preview already showed (same pure function, same inputs).
    const { pos_x, pos_y } = anchorForCell(
      grid_x,
      grid_y,
      footprintWidth,
      footprintHeight,
      isPrecisePlacement
    );

    setActionError(null);
    setHoverPreview(null);
    setPlacing(true);

    const supabase = createClient();

    const { error: placeError } = await supabase.rpc("place_garden_object", {
      p_item_id: selectedItem.itemId,
      p_world_id: worldId,
      p_grid_x: grid_x,
      p_grid_y: grid_y,
      p_pos_x: pos_x,
      p_pos_y: pos_y,
      p_rotation: placementRotation,
      p_scale: 1,
      p_use_grown: selectedItem.isGrown,
    });

    if (placeError) {
      setPlacing(false);
      setActionError(friendlyPlaceErrorMessage(placeError.message));
      return;
    }

    setSelectedItem(null);
    setPlacementRotation(0);
    await Promise.all([reloadGarden(), loadInventory(supabase, userId)]);
    setPlacing(false);
  }

  async function handleRemoveObject(
    event: MouseEvent<HTMLDivElement>,
    objectId: string
  ) {
    // Stop this from also bubbling up to the container's placement click.
    event.stopPropagation();

    if (busy || userId === null || worldId === null) return;

    setActionError(null);
    setRemovingId(objectId);

    const supabase = createClient();

    // Server-side: a fully grown object (grown_at set) returns to the
    // "grown" inventory bucket (is_grown = true) and replants instantly
    // complete; an ungrown one loses its progress and returns as a fresh
    // seed (is_grown = false). See remove_garden_object() in the schema.
    const { error: removeError } = await supabase.rpc("remove_garden_object", {
      p_garden_object_id: objectId,
    });

    if (removeError) {
      setRemovingId(null);
      setActionError(removeError.message);
      return;
    }

    await Promise.all([reloadGarden(), loadInventory(supabase, userId)]);
    setRemovingId(null);
  }

  /** The placement hover preview, in world space (px at zoom 1). Two
      modes matching GardenScene's own isPrecisePlacement split, each
      using the EXACT SAME numbers (anchorForCell / organicWidthCells) the
      real placed object will render with — neither mode has its own,
      potentially-drifting math. */
  function renderPlacementPreview() {
    if (!selectedItem || !hoverPreview) return null;
    const { pos } = hoverPreview;
    const illustrationSrc =
      previewRotationIllustration?.src ?? previewIllustration;

    if (selectedItem.isPrecisePlacement) {
      return (
        <div
          className={`${styles.placementPreview} ${
            hoverPreview.blocked
              ? styles.placementPreviewBlocked
              : styles.placementPreviewFree
          }`}
          style={{
            left: pos.pos_x * CELL_PX,
            top: pos.pos_y * CELL_PX,
            width: hoverPreview.footprintWidth * CELL_PX,
            height: hoverPreview.footprintHeight * CELL_PX,
          }}
        >
          {/* The actual art, rotated exactly like the real placement will
              render — a Kurve or Ende piece looks completely different at
              each rotation. object-fit: fill matches GardenScene's own
              stretch-to-footprint rendering for these items. */}
          {illustrationSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.placementPreviewImage}
              src={illustrationSrc}
              alt=""
              style={{
                transform: previewRotationIllustration
                  ? previewRotationIllustration.mirrored
                    ? "scaleX(-1)"
                    : "none"
                  : `rotate(${placementRotation}deg)`,
              }}
            />
          )}
        </div>
      );
    }

    return (
      <div
        className={`${styles.placementPreviewOrganic} ${
          hoverPreview.blocked
            ? styles.placementPreviewOrganicBlocked
            : styles.placementPreviewOrganicFree
        }`}
        style={{
          left: pos.pos_x * CELL_PX,
          top: pos.pos_y * CELL_PX,
          width:
            organicWidthCells({
              category: selectedItem.category,
              itemName: selectedItem.name,
              footprintWidth: selectedItem.footprintWidth,
              growthPercent: selectedItem.isGrown ? 100 : 0,
              scale: 1,
              worldY: pos.pos_y,
            }) * CELL_PX,
          // Same bottom-center anchor GardenScene stands the real object
          // on (translate(-50%, -100%)).
          transform: `translate(-50%, -100%) ${
            previewRotationIllustration ? "" : `rotate(${placementRotation}deg)`
          }`,
        }}
      >
        {illustrationSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.placementPreviewOrganicImage}
            src={illustrationSrc}
            alt=""
            style={
              previewRotationIllustration?.mirrored
                ? { transform: "scaleX(-1)" }
                : undefined
            }
          />
        )}
      </div>
    );
  }

  return (
    <div ref={pageRef} className={styles.page}>
      {/* The world, moved by the camera (useGardenCamera). Pointer
          handlers sit on the scene's viewport, so a drag anywhere pans,
          while a plain click still reaches the world/object underneath
          (onClickCapture only swallows the click after a drag). */}
      {worldReady && (
        <GardenScene
          objects={objects}
          gridWidth={gridWidth}
          gridHeight={gridHeight}
          camera={{ viewportRef, worldRef, handlers: camera.viewportHandlers }}
          onWorldClick={handleGardenClick}
          onWorldMouseMove={handleGardenMouseMove}
          onWorldMouseLeave={handleGardenMouseLeave}
          onObjectClick={handleRemoveObject}
          busyObjectId={removingId}
          cursor={selectedItem ? "crosshair" : undefined}
          worldOverlay={selectedItem && hoverPreview && renderPlacementPreview()}
        />
      )}

      {loading && <p className={styles.loading}>Loading your garden…</p>}

      {worldReady && (
        <GardenHud
          level={stats?.level ?? null}
          coins={stats?.coins ?? null}
          streak={stats?.streak ?? null}
          onCenter={camera.centerOnHome}
        >
          <GardenMinimap
            cols={gridWidth + 2 * EDGE_CELLS}
            rows={gridHeight + 2 * EDGE_CELLS}
            cellPx={CELL_PX}
            plantable={{
              x: EDGE_CELLS,
              y: EDGE_CELLS,
              cols: gridWidth,
              rows: gridHeight,
            }}
            dots={minimapDots}
            subscribe={camera.subscribe}
            onJump={handleMinimapJump}
          />
        </GardenHud>
      )}

      <div className={styles.bottom}>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}

        {/* TEMPORARY inventory dock — a stopgap so placing keeps working
            until the real inventory is rebuilt. Same chips/selection logic
            as the old inventory row; delete this block (and its .dock*
            styles) when the new inventory lands. */}
        {worldReady && (
          <div className={styles.dock}>
            <div className={styles.dockHeader}>
              <span className={styles.dockTag}>Temporary</span>
              <span className={styles.dockHint}>
                {selectedItem
                  ? "Click a spot in the garden to place it."
                  : "Pick an item, then click the garden to place it. Click a placed item to remove it."}
              </span>
            </div>

            {inventory?.length === 0 && (
              <p className={styles.dockHint}>No placeable items owned yet.</p>
            )}

            <ul className={styles.inventoryRow}>
              <li>
                <PathPicker
                  items={(inventory ?? []).filter((item) => item.unlimited)}
                  selectedItem={selectedItem}
                  onSelect={handleSelectItem}
                  disabled={busy}
                  triggerClassName={styles.inventoryChip}
                  triggerSelectedClassName={styles.inventoryChipSelected}
                  placement="above"
                />
              </li>
              {inventory
                ?.filter((item) => !item.unlimited)
                .map((item) => {
                  const isSelected =
                    selectedItem?.itemId === item.itemId &&
                    selectedItem.isGrown === item.isGrown;
                  return (
                    <li key={`${item.itemId}-${item.isGrown}`}>
                      <button
                        type="button"
                        className={`${styles.inventoryChip} ${
                          isSelected ? styles.inventoryChipSelected : ""
                        }`}
                        onClick={() => handleSelectItem(item)}
                        disabled={busy}
                      >
                        {isSelected ? "✓ " : ""}
                        {item.name}
                        <span>
                          × <TnumFallback digits={2}>{item.quantity}</TnumFallback> (
                          {item.isGrown ? "grown" : "seed"})
                        </span>
                      </button>
                    </li>
                  );
                })}
              {selectedItem &&
                isRotatable(
                  selectedItem.name,
                  selectedItem.isPrecisePlacement
                ) && (
                  <li className={styles.rotationControl}>
                    <button
                      type="button"
                      onClick={handleRotatePlacement}
                      disabled={busy}
                    >
                      ⟳ Rotate (R) ·{" "}
                      <TnumFallback digits={3}>{placementRotation}</TnumFallback>°
                    </button>
                  </li>
                )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Axis-aligned bounding-box overlap test — the same rectangle-overlap
// formula place_garden_object() runs server-side (see
// robin_garden_grid_migration.sql), used here client-side for the hover
// preview and the pre-flight check in handleGardenClick.
function cellsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

/**
 * The visual anchor (pos_x/pos_y, in world cells) an item placed with its
 * footprint's top-left at grid_x/grid_y gets — deterministic, so the hover
 * preview and the actual placement always agree.
 *
 *  - Precise-placement items (path tiles, and anything flagged via
 *    item_catalog.attributes.precise_placement) are top-left anchored at
 *    their footprint's corner and fill it exactly (see the Fountain
 *    WYSIWYG bug).
 *  - Every other item stands bottom-center on its footprint: centered
 *    horizontally, and on the footprint's BOTTOM edge (not its vertical
 *    center), since GardenScene anchors the image's ground-contact point
 *    there.
 */
function anchorForCell(
  grid_x: number,
  grid_y: number,
  footprintWidth: number,
  footprintHeight: number,
  isPrecisePlacement: boolean
): { pos_x: number; pos_y: number } {
  return isPrecisePlacement
    ? { pos_x: grid_x, pos_y: grid_y }
    : { pos_x: grid_x + footprintWidth / 2, pos_y: grid_y + footprintHeight };
}

// Maps place_garden_object()'s raise exception messages (see
// robin_garden_grid_migration.sql) to copy a player should actually see.
// Anything not listed here (e.g. "Item not available in inventory") falls
// through unchanged — those read fine as-is already.
const PLACE_ERROR_MESSAGES: Record<string, string> = {
  "Grid cells already occupied":
    "That spot is already taken — try an empty patch of grass.",
  "Placement is outside world grid bounds":
    "That's the hedge at the edge of your garden — try a spot a little further in.",
  "Path style not unlocked yet.":
    "You haven't unlocked this path style yet — buy it in the shop first.",
};

function friendlyPlaceErrorMessage(message: string): string {
  return PLACE_ERROR_MESSAGES[message] ?? message;
}
