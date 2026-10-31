"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  placementFlagsFromAttributes,
  useGardenObjects,
  type GardenObject,
} from "@/lib/garden/use-garden-objects";
import { GardenScene } from "@/components/garden-scene";
import { GardenHud } from "@/components/garden-hud";
import {
  GardenObjectBubble,
  GardenObjectMenu,
  type PopoverAnchor,
} from "@/components/garden-object-popover";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { GardenMinimap } from "@/components/garden-minimap";
import { InventoryTray } from "@/components/inventory-tray";
import { pathShapeLabel } from "@/components/path-picker";
import {
  getItemIllustration,
  getRotationIllustration,
} from "@/lib/garden/item-visuals";
import {
  footprintForRotation,
  growthStage,
  organicWidthCells,
} from "@/lib/garden/garden-layout";
import { useGardenCamera } from "@/lib/garden/use-garden-camera";
import { ZOOM_STEPS } from "@/lib/garden/camera";
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
  /** Whether the item grows once placed (item_catalog has a
      growth_duration_seconds — flowers and plants). Only those have
      separate seed/grown stock worth labelling; decoration doesn't. */
  grows: boolean;
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

/** View: look around, click an object for its info bubble. Edit: place
    from the dock, click an object for Move / Rotate / Store. */
type GardenMode = "view" | "edit";

/** What currently follows the cursor in edit mode: a new item from the
    dock, or a placed object being moved. One shape, so the preview,
    the pre-flight check and the anchor math are shared by both. */
type Ghost = {
  name: string;
  category: string | null;
  isPrecisePlacement: boolean;
  /** Catalog footprint (unrotated) — footprintForRotation turns it. */
  footprintWidth: number;
  footprintHeight: number;
  growthPercent: number | null;
  scale: number;
  rotation: number;
  /** Image for the ghost's growth stage, before rotation art. */
  illustration: string | null;
  /** The object being moved — its own cells don't count as taken. */
  movingId: string | null;
};

/** World cell (top-left of the footprint) under the pointer. */
type HoverCell = { grid_x: number; grid_y: number };

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
  /** An object with a move/rotate/store request in flight. */
  const [busyObjectId, setBusyObjectId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [hoverCell, setHoverCell] = useState<HoverCell | null>(null);

  const [mode, setMode] = useState<GardenMode>("view");
  /** The object whose bubble (view) or menu (edit) is open. */
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<PopoverAnchor | null>(null);
  /** Edit mode: the object hanging on the cursor, with the rotation it
      will be dropped at (R turns it while moving). */
  const [moving, setMoving] = useState<{ id: string; rotation: number } | null>(
    null
  );
  /** An unfinished plant waiting for "Growth progress will be lost". */
  const [storeConfirmId, setStoreConfirmId] = useState<string | null>(null);

  const [stats, setStats] = useState<ProfileStats | null>(null);

  const pageRef = useRef<HTMLDivElement>(null);
  const bottomStackRef = useRef<HTMLDivElement>(null);
  /** How much of the screen bottom the banner + tray cover (px) — the
      camera lets the world scroll that much further in edit mode. */
  const [bottomStackHeight, setBottomStackHeight] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);

  const busy = placing || busyObjectId !== null;
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
    insetBottom: mode === "edit" ? bottomStackHeight : 0,
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
  const objectById = useMemo(
    () => new Map((objects ?? []).map((object) => [object.id, object])),
    [objects]
  );
  const focusedObject = focusedId ? (objectById.get(focusedId) ?? null) : null;
  const movingObject = moving ? (objectById.get(moving.id) ?? null) : null;

  // What follows the cursor right now (edit mode only): a moved object
  // wins over a dock selection.
  const ghost: Ghost | null =
    mode !== "edit"
      ? null
      : movingObject && moving
        ? {
            name: movingObject.item_name ?? "Item",
            category: movingObject.category,
            isPrecisePlacement: movingObject.isPrecisePlacement,
            footprintWidth: movingObject.footprint_width,
            footprintHeight: movingObject.footprint_height,
            growthPercent: movingObject.growth_percent,
            scale: movingObject.scale,
            rotation: moving.rotation,
            illustration: illustrationForStage(
              movingObject.item_name,
              movingObject.growth_percent
            ),
            movingId: movingObject.id,
          }
        : selectedItem
          ? {
              name: selectedItem.name,
              category: selectedItem.category,
              isPrecisePlacement: selectedItem.isPrecisePlacement,
              footprintWidth: selectedItem.footprintWidth,
              footprintHeight: selectedItem.footprintHeight,
              growthPercent: selectedItem.isGrown ? 100 : 0,
              scale: 1,
              rotation: placementRotation,
              // Falls back to the "grown" (single static) image for
              // non-growable items — decoration/path items (see
              // item-visuals.ts) only ever have a "grown" entry.
              illustration:
                getItemIllustration(
                  selectedItem.name,
                  selectedItem.isGrown ? "grown" : "seed"
                ) ?? getItemIllustration(selectedItem.name, "grown"),
              movingId: null,
            }
          : null;
  /** The selected slot's inventory entry (its current quantity). */
  const selectedStock = selectedItem
    ? ((inventory ?? []).find(
        (item) => item.itemId === selectedItem.itemId && item.isGrown === selectedItem.isGrown
      ) ?? null)
    : null;

  // Placing the last one makes its slot disappear (inventory only lists
  // quantity > 0) — then nothing is selected any more.
  useEffect(() => {
    if (selectedItem && inventory && !selectedStock) setSelectedItem(null);
  }, [selectedItem, inventory, selectedStock]);

  const canRotateGhost =
    ghost !== null && isRotatable(ghost.name, ghost.isPrecisePlacement);

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

  // Measures what the bottom stack (banner, toast, tray) covers, from its
  // top to the page's bottom edge. offsetTop ignores the tray's slide
  // transform, so this is the settled height even mid-animation.
  useEffect(() => {
    const page = pageRef.current;
    const stack = bottomStackRef.current;
    if (!page || !stack) return;
    const measure = () => setBottomStackHeight(page.clientHeight - stack.offsetTop);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stack);
    observer.observe(page);
    return () => observer.disconnect();
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
        "item_id, is_grown, quantity, item_catalog(name, placeable, footprint_width, footprint_height, category, attributes, growth_duration_seconds)"
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
          growth_duration_seconds: number | null;
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
        grows: row.item_catalog!.growth_duration_seconds !== null,
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
        grows: false,
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
    setPlacementRotation(0);
    setMoving(null);
    setFocusedId(null);
  }

  function handleRotatePlacement() {
    setPlacementRotation((prev) => ((prev + 90) % 360) as PlacementRotation);
  }

  const enterEditMode = useCallback(() => {
    setMode("edit");
    setFocusedId(null);
    setActionError(null);
  }, []);

  const leaveEditMode = useCallback(() => {
    setMode("view");
    setFocusedId(null);
    setMoving(null);
    setSelectedItem(null);
    setPlacementRotation(0);
    setStoreConfirmId(null);
    setHoverCell(null);
    setActionError(null);
  }, []);

  // Keyboard: E toggles edit mode, R turns whatever follows the cursor,
  // Esc steps back one layer at a time — dialog, move, menu/bubble, dock
  // selection, then edit mode itself.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();

      if (key === "escape") {
        if (storeConfirmId) setStoreConfirmId(null);
        else if (moving) setMoving(null);
        else if (focusedId) setFocusedId(null);
        else if (selectedItem) setSelectedItem(null);
        else if (mode === "edit") leaveEditMode();
        else return;
        setActionError(null);
        event.preventDefault();
        return;
      }

      if (storeConfirmId || event.repeat) return;

      if (key === "e") {
        if (mode === "edit") leaveEditMode();
        else enterEditMode();
        return;
      }

      if (key === "r" && canRotateGhost) {
        if (moving) {
          setMoving({ ...moving, rotation: (moving.rotation + 90) % 360 });
        } else {
          handleRotatePlacement();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    storeConfirmId,
    moving,
    focusedId,
    selectedItem,
    mode,
    canRotateGhost,
    enterEditMode,
    leaveEditMode,
  ]);

  // The open bubble/menu sits on the object's top-center. The object's
  // drawn height comes from its art, so it's read from the DOM — and
  // observed, since rotating swaps the image and the new one only gets
  // its height once it has loaded.
  useLayoutEffect(() => {
    const object = focusedId ? objectById.get(focusedId) : undefined;
    const element = focusedId
      ? worldRef.current?.querySelector<HTMLElement>(`[data-object-id="${focusedId}"]`)
      : null;
    if (!object || !element) {
      setPopoverAnchor(null);
      return;
    }
    const update = () => setPopoverAnchor(popoverAnchorFor(object, element.offsetHeight));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [focusedId, objectById]);

  /** World cell (top-left of the footprint) under the given pointer —
      the inverse of the camera transform (screenToCanvas), then canvas px
      -> world cells. Can land outside 0..grid-1 over the edge band;
      footprintBlockReason reports that as out of bounds, exactly like the
      server would. */
  function gridCellFromEvent(event: MouseEvent<HTMLDivElement>): HoverCell {
    const point = camera.screenToCanvas(event.clientX, event.clientY);
    return {
      grid_x: Math.floor(canvasPxToWorld(point.x)),
      grid_y: Math.floor(canvasPxToWorld(point.y)),
    };
  }

  /** Why putting a footprintWidth x footprintHeight (already rotated)
      footprint at grid_x/grid_y would fail server-side, or null if it
      wouldn't (by this client-side estimate). Mirrors the checks — and
      the exact exception text — of place_garden_object() and
      move_garden_object() (sql/garden-move-rotation.sql), including the
      rotated footprints of everything already placed. `ignoreId` is the
      object being moved/rotated, whose own cells don't count. The server
      re-checks independently and remains the sole authority. */
  function footprintBlockReason(
    grid_x: number,
    grid_y: number,
    footprintWidth: number,
    footprintHeight: number,
    ignoreId: string | null = null
  ): string | null {
    if (
      gridWidth === null ||
      gridHeight === null ||
      grid_x < 0 ||
      grid_y < 0 ||
      grid_x + footprintWidth > gridWidth ||
      grid_y + footprintHeight > gridHeight
    ) {
      return "Placement is outside world grid bounds";
    }

    const occupied = (objects ?? []).some((object) => {
      if (object.id === ignoreId) return false;
      const footprint = footprintForRotation(
        object.footprint_width,
        object.footprint_height,
        object.rotation
      );
      return cellsOverlap(
        grid_x,
        grid_y,
        footprintWidth,
        footprintHeight,
        object.grid_x,
        object.grid_y,
        footprint.width,
        footprint.height
      );
    });

    return occupied ? "Grid cells already occupied" : null;
  }

  /** Where `ghost` would land with its footprint's top-left at `cell`. */
  function ghostPlacement(target: Ghost, cell: HoverCell) {
    const footprint = footprintForRotation(
      target.footprintWidth,
      target.footprintHeight,
      target.rotation
    );
    return {
      footprint,
      blockReason: footprintBlockReason(
        cell.grid_x,
        cell.grid_y,
        footprint.width,
        footprint.height,
        target.movingId
      ),
      pos: anchorForCell(
        cell.grid_x,
        cell.grid_y,
        footprint.width,
        footprint.height,
        target.isPrecisePlacement
      ),
    };
  }

  function handleGardenMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (!ghost) {
      if (hoverCell) setHoverCell(null);
      return;
    }
    const cell = gridCellFromEvent(event);
    if (cell.grid_x !== hoverCell?.grid_x || cell.grid_y !== hoverCell?.grid_y) {
      setHoverCell(cell);
    }
  }

  function handleGardenMouseLeave() {
    setHoverCell(null);
  }

  /** A click on the lawn (or, while something follows the cursor, on an
      object — see handleObjectClick): drops a moved object, places a dock
      item, or else just closes an open bubble/menu. */
  function handleGardenClick(event: MouseEvent<HTMLDivElement>) {
    if (moving) {
      void commitMove(event);
    } else if (mode === "edit" && selectedItem) {
      void placeSelectedItem(event);
    } else {
      setFocusedId(null);
    }
  }

  function handleObjectClick(event: MouseEvent<HTMLDivElement>, objectId: string) {
    // Never also a click on the lawn underneath.
    event.stopPropagation();
    if (busy) return;

    // Something hangs on the cursor: this click is its drop target, and
    // the object under it just makes that spot taken.
    if (moving || (mode === "edit" && selectedItem)) {
      handleGardenClick(event);
      return;
    }

    setActionError(null);
    setFocusedId((current) => (current === objectId ? null : objectId));
  }

  async function placeSelectedItem(event: MouseEvent<HTMLDivElement>) {
    if (!selectedItem || !ghost || busy || userId === null || worldId === null) {
      return;
    }

    const cell = gridCellFromEvent(event);
    // Same check the hover preview already showed — re-run here (rather
    // than trusting the last hover, e.g. a click without a mousemove) so a
    // red spot never spends a round-trip.
    const { blockReason, pos } = ghostPlacement(ghost, cell);
    if (blockReason !== null) {
      setActionError(friendlyPlaceErrorMessage(blockReason));
      return;
    }

    setActionError(null);
    setHoverCell(null);
    setPlacing(true);

    const supabase = createClient();

    const { error: placeError } = await supabase.rpc("place_garden_object", {
      p_item_id: selectedItem.itemId,
      p_world_id: worldId,
      p_grid_x: cell.grid_x,
      p_grid_y: cell.grid_y,
      p_pos_x: pos.pos_x,
      p_pos_y: pos.pos_y,
      p_rotation: placementRotation,
      p_scale: 1,
      p_use_grown: selectedItem.isGrown,
    });

    if (placeError) {
      setPlacing(false);
      setActionError(friendlyPlaceErrorMessage(placeError.message));
      return;
    }

    // The selection stays for the next one — unless that was the last,
    // see the effect clearing a selection whose slot is gone.
    await Promise.all([reloadGarden(), loadInventory(supabase, userId)]);
    setPlacing(false);
  }

  /** Saves a placed object at a new cell and/or rotation through
      move_garden_object() — the only way the client may change grid_x/
      grid_y (sql/garden-move-rotation.sql). Growth is untouched. Returns
      whether it worked. */
  async function saveObjectPosition(
    objectId: string,
    cell: HoverCell,
    pos: { pos_x: number; pos_y: number },
    rotation: number
  ): Promise<boolean> {
    setActionError(null);
    setBusyObjectId(objectId);

    const { error: moveError } = await createClient().rpc("move_garden_object", {
      p_garden_object_id: objectId,
      p_grid_x: cell.grid_x,
      p_grid_y: cell.grid_y,
      p_pos_x: pos.pos_x,
      p_pos_y: pos.pos_y,
      p_rotation: rotation,
    });

    if (moveError) {
      setBusyObjectId(null);
      setActionError(friendlyPlaceErrorMessage(moveError.message));
      return false;
    }

    await reloadGarden();
    setBusyObjectId(null);
    return true;
  }

  async function commitMove(event: MouseEvent<HTMLDivElement>) {
    if (!moving || !ghost || busy) return;
    const cell = gridCellFromEvent(event);
    const { blockReason, pos } = ghostPlacement(ghost, cell);
    if (blockReason !== null) {
      // Stays on the cursor, so the player can just try another spot.
      setActionError(friendlyPlaceErrorMessage(blockReason));
      return;
    }

    setHoverCell(null);
    if (await saveObjectPosition(moving.id, cell, pos, moving.rotation)) {
      setMoving(null);
    }
  }

  function handleMoveStart() {
    if (!focusedObject) return;
    setMoving({ id: focusedObject.id, rotation: focusedObject.rotation });
    setFocusedId(null);
    setSelectedItem(null);
    setActionError(null);
  }

  /** Turns the object a quarter in place. Its footprint may swap (the
      hedge, 2x1 <-> 1x2), so it's checked like a move; the menu stays open
      for another turn. */
  async function handleRotateObject() {
    const object = focusedObject;
    if (!object || busy) return;

    const rotation = (Math.round(object.rotation) + 90) % 360;
    const cell = { grid_x: object.grid_x, grid_y: object.grid_y };
    const before = footprintForRotation(
      object.footprint_width,
      object.footprint_height,
      object.rotation
    );
    const after = footprintForRotation(
      object.footprint_width,
      object.footprint_height,
      rotation
    );

    const blockReason = footprintBlockReason(
      cell.grid_x,
      cell.grid_y,
      after.width,
      after.height,
      object.id
    );
    if (blockReason !== null) {
      setActionError(ROTATE_BLOCKED_MESSAGE);
      return;
    }

    // Same footprint: keep the exact spot. Swapped footprint: stand on the
    // new one, like a fresh placement there would.
    const pos =
      before.width === after.width
        ? { pos_x: object.pos_x, pos_y: object.pos_y }
        : anchorForCell(
            cell.grid_x,
            cell.grid_y,
            after.width,
            after.height,
            object.isPrecisePlacement
          );

    await saveObjectPosition(object.id, cell, pos, rotation);
  }

  function handleStoreRequest() {
    const object = focusedObject;
    if (!object || busy) return;
    // Only an unfinished plant with some progress loses something: it
    // comes back as a seed. A seed at 0% and decorations/paths
    // (growth_percent null) are stored right away.
    if (
      object.grown_at === null &&
      object.growth_percent !== null &&
      object.growth_percent > 0
    ) {
      setStoreConfirmId(object.id);
    } else {
      void storeObject(object.id);
    }
  }

  async function storeObject(objectId: string) {
    if (userId === null) return;

    setActionError(null);
    setBusyObjectId(objectId);

    const supabase = createClient();

    // Server-side: a fully grown object (grown_at set) returns to the
    // "grown" inventory bucket (is_grown = true) and replants instantly
    // complete; an ungrown one loses its progress and returns as a fresh
    // seed (is_grown = false). See remove_garden_object() in the schema.
    const { error: removeError } = await supabase.rpc("remove_garden_object", {
      p_garden_object_id: objectId,
    });

    if (removeError) {
      setBusyObjectId(null);
      setStoreConfirmId(null);
      setActionError(removeError.message);
      return;
    }

    await Promise.all([reloadGarden(), loadInventory(supabase, userId)]);
    setBusyObjectId(null);
    setStoreConfirmId(null);
    setFocusedId(null);
  }

  /** The placement/move preview, in world space (px at zoom 1). Two
      modes matching GardenScene's own isPrecisePlacement split, each
      using the EXACT SAME numbers (anchorForCell / organicWidthCells) the
      real object will render with — neither has its own, potentially-
      drifting math. */
  function renderPlacementPreview() {
    if (!ghost || !hoverCell) return null;
    const { footprint, blockReason, pos } = ghostPlacement(ghost, hoverCell);
    const blocked = blockReason !== null;
    // An item with its own rotation art (bench, pavilion, sideways hedge —
    // see item-visuals.ts) shows that exact image (and mirroring), not the
    // base image CSS-rotated in place.
    const rotationIllustration = getRotationIllustration(ghost.name, ghost.rotation);
    const illustrationSrc = rotationIllustration?.src ?? ghost.illustration;

    if (ghost.isPrecisePlacement) {
      return (
        <div
          className={`${styles.placementPreview} ${
            blocked ? styles.placementPreviewBlocked : styles.placementPreviewFree
          }`}
          style={{
            left: pos.pos_x * CELL_PX,
            top: pos.pos_y * CELL_PX,
            width: footprint.width * CELL_PX,
            height: footprint.height * CELL_PX,
          }}
        >
          {/* The actual art, rotated exactly like the real object will
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
                transform: rotationIllustration
                  ? rotationIllustration.mirrored
                    ? "scaleX(-1)"
                    : "none"
                  : `rotate(${ghost.rotation}deg)`,
              }}
            />
          )}
        </div>
      );
    }

    return (
      <div
        className={`${styles.placementPreviewOrganic} ${
          blocked
            ? styles.placementPreviewOrganicBlocked
            : styles.placementPreviewOrganicFree
        }`}
        style={{
          left: pos.pos_x * CELL_PX,
          top: pos.pos_y * CELL_PX,
          width:
            organicWidthCells({
              category: ghost.category,
              itemName: ghost.name,
              footprintWidth: footprint.width,
              growthPercent: ghost.growthPercent,
              scale: ghost.scale,
              worldY: pos.pos_y,
            }) * CELL_PX,
          // Same bottom-center anchor GardenScene stands the real object
          // on (translate(-50%, -100%)).
          transform: `translate(-50%, -100%) ${
            rotationIllustration ? "" : `rotate(${ghost.rotation}deg)`
          }`,
        }}
      >
        {illustrationSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.placementPreviewOrganicImage}
            src={illustrationSrc}
            alt=""
            style={rotationIllustration?.mirrored ? { transform: "scaleX(-1)" } : undefined}
          />
        )}
      </div>
    );
  }

  function renderPopover() {
    if (!focusedObject || !popoverAnchor || moving) return null;
    const zoom = ZOOM_STEPS[camera.zoomIndex];
    const name = displayName(focusedObject);

    if (mode === "view") {
      return (
        <GardenObjectBubble
          anchor={popoverAnchor}
          zoom={zoom}
          name={name}
          growthPercent={focusedObject.growth_percent}
          growthDurationSeconds={focusedObject.growth_duration_seconds}
        />
      );
    }

    return (
      <GardenObjectMenu
        anchor={popoverAnchor}
        zoom={zoom}
        name={name}
        canRotate={isRotatable(
          focusedObject.item_name ?? "",
          focusedObject.isPrecisePlacement
        )}
        busy={busy}
        onMove={handleMoveStart}
        onRotate={() => void handleRotateObject()}
        onStore={handleStoreRequest}
      />
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
          mode={mode}
          onWorldClick={handleGardenClick}
          onWorldMouseMove={handleGardenMouseMove}
          onWorldMouseLeave={handleGardenMouseLeave}
          onObjectClick={handleObjectClick}
          objectActionLabel={mode === "edit" ? "edit" : "details"}
          busyObjectId={busyObjectId}
          focusedObjectId={focusedId}
          movingObjectId={moving?.id ?? null}
          cursor={ghost ? "crosshair" : undefined}
          worldOverlay={
            <>
              {renderPlacementPreview()}
              {renderPopover()}
            </>
          }
        />
      )}

      {loading && <p className={styles.loading}>Loading your garden…</p>}

      {worldReady && (
        <GardenHud
          level={stats?.level ?? null}
          coins={stats?.coins ?? null}
          streak={stats?.streak ?? null}
          onCenter={camera.centerOnHome}
          editing={mode === "edit"}
          onToggleEdit={mode === "edit" ? leaveEditMode : enterEditMode}
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

      <div ref={bottomStackRef} className={styles.bottom}>
        {/* Above the tray rather than at the top: a menu always opens
            above its object, so down here the banner never covers one. */}
        {worldReady && mode === "edit" && (
          <div className={styles.editBanner} role="status">
            <span className={styles.editBannerTitle}>
              {busy
                ? "Saving…"
                : moving
                  ? "Moving"
                  : selectedItem
                    ? selectionLabel(selectedItem, selectedStock, placementRotation)
                    : "Editing your garden"}
            </span>
            <span className={styles.editBannerHint}>
              {busy
                ? "Just a moment"
                : moving
                  ? "Click to drop it · R to rotate · Esc to cancel"
                  : selectedItem
                    ? isRotatable(selectedItem.name, selectedItem.isPrecisePlacement)
                      ? "Click the garden to place it · R to rotate · Esc to put it away"
                      : "Click the garden to place it · Esc to put it away"
                    : "Pick an item below, or click one in the garden · E or Esc to finish"}
            </span>
          </div>
        )}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}

        {worldReady && (
          <InventoryTray
            open={mode === "edit"}
            items={inventory}
            selected={selectedItem}
            onSelect={handleSelectItem}
            rotation={placementRotation}
            canRotate={
              selectedItem !== null &&
              isRotatable(selectedItem.name, selectedItem.isPrecisePlacement)
            }
            onRotate={handleRotatePlacement}
            disabled={busy}
          />
        )}
      </div>

      {storeConfirmId && (
        <ConfirmDialog
          title={`Store this ${
            objectById.get(storeConfirmId)?.item_name?.toLowerCase() ?? "plant"
          }?`}
          message="It isn't fully grown yet. Growth progress will be lost — it goes back to your inventory as a seed."
          confirmLabel="Store"
          tone="warning"
          busy={busyObjectId === storeConfirmId}
          onConfirm={() => void storeObject(storeConfirmId)}
          onCancel={() => setStoreConfirmId(null)}
        />
      )}
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

const ROTATE_BLOCKED_MESSAGE =
  "There's no room to turn it here — move it a little first.";

/** Name shown in the bubble/menu. Path tiles carry their German catalog
    names ("Weg (Gerade)"), so they just read as a path. */
function displayName(object: GardenObject): string {
  if (object.isPathTile) return "Path";
  return object.item_name ?? "Item";
}

/** The image for an object's current growth stage — the same lookup
    GardenScene draws with (decorations only have a "grown" image). */
function illustrationForStage(
  itemName: string | null,
  growthPercent: number | null
): string | null {
  const stage = growthStage(growthPercent);
  return getItemIllustration(itemName, stage === "static" ? "grown" : stage);
}

/** Top-center of a placed object, in world px — where its bubble/menu
    points. Organic objects stand bottom-center on pos_x/pos_y and are
    `drawnHeight` tall; precise ones fill their (rotated) footprint from
    its top-left. */
function popoverAnchorFor(object: GardenObject, drawnHeight: number): PopoverAnchor {
  if (object.isPrecisePlacement) {
    const footprint = footprintForRotation(
      object.footprint_width,
      object.footprint_height,
      object.rotation
    );
    return {
      x: (object.pos_x + footprint.width / 2) * CELL_PX,
      y: object.pos_y * CELL_PX,
    };
  }
  return { x: object.pos_x * CELL_PX, y: object.pos_y * CELL_PX - drawnHeight };
}

/** The edit banner's title while a tray slot is selected, so touch players
    see the name too: "Rose seed · 23 left", "Sunflower · grown · 1 left",
    "Pavilion · 1 left", "Natural stone · Curve · 90°". */
function selectionLabel(
  item: { name: string; isGrown: boolean },
  stock: InventoryItem | null,
  rotation: number
): string {
  const path = pathShapeLabel(item.name);
  if (path) return `${path.style} · ${path.shape} · ${rotation}°`;
  const left = stock ? ` · ${stock.quantity} left` : "";
  // Seed/grown only means something for things that grow.
  if (!stock?.grows) return `${item.name}${left}`;
  return item.isGrown ? `${item.name} · grown${left}` : `${item.name} seed${left}`;
}
