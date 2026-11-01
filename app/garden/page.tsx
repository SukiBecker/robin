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
import { useReducedMotion } from "motion/react";
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
import { PurchaseBurst } from "@/components/purchase-burst";
import { DROP_BURST_TUNING } from "@/lib/shop/burst-tuning";
import { useEdgeScroll } from "@/lib/garden/use-edge-scroll";
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
import { useTopOverhang } from "@/lib/garden/use-top-overhang";
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
  /** item_catalog.growth_duration_seconds (null for things that never
      grow) — what an optimistically placed object shows until the
      server's row arrives. */
  growthDurationSeconds: number | null;
  /** item_catalog.image_asset_url — still unset for most rows, so the
      tray falls back to the name-keyed illustration (like the shop). */
  imageAssetUrl?: string | null;
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
  growthDurationSeconds: number | null;
  isPathTile: boolean;
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
    mutateObjects,
  } = useGardenObjects();
  const reducedMotion = useReducedMotion() ?? false;

  const [inventory, setInventory] = useState<InventoryItem[] | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  // Resets to 0 on every new selection (handleSelectItem) so a rotation
  // chosen for one item never silently carries over onto the next.
  const [placementRotation, setPlacementRotation] =
    useState<PlacementRotation>(0);
  /** Optimistic place/move/rotate requests still on their way. Placing
      never waits for them — the banner just says "Saving…". */
  const [pendingCount, setPendingCount] = useState(0);
  /** Objects (by id) with an optimistic change in flight — not clickable
      until the server answers. */
  const [inflightIds, setInflightIds] = useState<ReadonlySet<string>>(new Set());
  /** An object being stored (not optimistic: it waits for the server). */
  const [busyObjectId, setBusyObjectId] = useState<string | null>(null);
  /** Just put down: bounce (by render key) + an earth puff at `at`. */
  const [landings, setLandings] = useState<
    Array<{ token: number; key: string; at: { x: number; y: number } }>
  >([]);
  /** A failed move gliding back: the offset (px) it starts from. */
  const [returning, setReturning] = useState<{
    key: string;
    dx: number;
    dy: number;
    token: number;
  } | null>(null);
  /** Dragging a slot out of the tray: where the pointer is, whether it's
      over the garden, and the selection to restore if it's cancelled. */
  const [drag, setDrag] = useState<{
    x: number;
    y: number;
    overGarden: boolean;
    previous: SelectedItem | null;
  } | null>(null);
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

  const busy = busyObjectId !== null;
  const saving = busy || pendingCount > 0;
  const landedKeys = useMemo(
    () => new Set(landings.map((landing) => landing.key)),
    [landings]
  );
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

  // The camera may show the garden and nothing around it — except, at the
  // top, as far as the tallest object in the first rows grows up past it.
  const topOverhang = useTopOverhang(worldRef, canvasSize.width, objects, worldReady);
  const cameraBounds = useMemo(
    () => ({
      x: EDGE_CELLS * CELL_PX,
      y: EDGE_CELLS * CELL_PX - topOverhang,
      width: (gridWidth ?? 0) * CELL_PX,
      height: (gridHeight ?? 0) * CELL_PX + topOverhang,
    }),
    [gridWidth, gridHeight, topOverhang]
  );

  const camera = useGardenCamera({
    viewportRef,
    worldRef,
    bounds: cameraBounds,
    home: HOME_POINT,
    ready: worldReady,
    insetBottom: mode === "edit" ? bottomStackHeight : 0,
  });

  // Mini-map shows the garden only (the camera never leaves it), in
  // world cells.
  const minimapDots = useMemo(
    () =>
      (objects ?? []).map((object) => ({
        id: object.id,
        isPath: object.isPathTile,
        x: object.pos_x + (object.isPrecisePlacement ? object.footprint_width / 2 : 0),
        y: object.pos_y + (object.isPrecisePlacement ? object.footprint_height / 2 : 0),
      })),
    [objects]
  );

  const { flyTo } = camera;
  // flyTo clamps, so a jump near the map's edge stops at the garden's edge.
  const handleMinimapJump = useCallback(
    (x: number, y: number, animate: boolean) =>
      flyTo(worldToCanvasPx(x), worldToCanvasPx(y), undefined, animate ? 450 : 0),
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
              growthPercent:
                selectedItem.growthDurationSeconds === null
                  ? null
                  : selectedItem.isGrown
                    ? 100
                    : 0,
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
        "item_id, is_grown, quantity, item_catalog(name, placeable, footprint_width, footprint_height, category, attributes, growth_duration_seconds, image_asset_url)"
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
          image_asset_url: string | null;
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
        growthDurationSeconds: row.item_catalog!.growth_duration_seconds,
        imageAssetUrl: row.item_catalog!.image_asset_url,
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
        growthDurationSeconds: null,
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
        : toSelectedItem(item)
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
  function gridCellAt(clientX: number, clientY: number): HoverCell {
    const point = camera.screenToCanvas(clientX, clientY);
    return {
      grid_x: Math.floor(canvasPxToWorld(point.x)),
      grid_y: Math.floor(canvasPxToWorld(point.y)),
    };
  }
  function gridCellFromEvent(event: MouseEvent<HTMLDivElement>): HoverCell {
    return gridCellAt(event.clientX, event.clientY);
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

  function setHoverCellIfChanged(cell: HoverCell | null) {
    setHoverCell((current) =>
      cell === null
        ? null
        : current?.grid_x === cell.grid_x && current?.grid_y === cell.grid_y
          ? current
          : cell
    );
  }

  function handleGardenMouseMove(event: MouseEvent<HTMLDivElement>) {
    pointerRef.current = { x: event.clientX, y: event.clientY };
    if (drag) return; // the drag tracks the pointer itself
    setHoverCellIfChanged(ghost ? gridCellFromEvent(event) : null);
  }

  function handleGardenMouseLeave() {
    if (!drag) setHoverCell(null);
  }

  /** A click on the lawn (or, while something follows the cursor, on an
      object — see handleObjectClick): drops a moved object, places a tray
      item, or else just closes an open bubble/menu. */
  function handleGardenClick(event: MouseEvent<HTMLDivElement>) {
    if (moving) {
      commitMove(gridCellFromEvent(event));
    } else if (mode === "edit" && selectedItem) {
      void placeAt(gridCellFromEvent(event));
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
    // Still being saved — its menu would act on a stale state.
    if (inflightIds.has(objectId)) return;

    setActionError(null);
    setFocusedId((current) => (current === objectId ? null : objectId));
  }

  // ---- optimistic requests ----

  const idleReloadRef = useRef<number | null>(null);

  // Counted in a ref (the source of truth) and mirrored into state for the
  // banner — the idle reload must be scheduled exactly once, outside any
  // state updater.
  const pendingRef = useRef(0);

  function beginRequest(objectId: string) {
    if (idleReloadRef.current !== null) window.clearTimeout(idleReloadRef.current);
    pendingRef.current += 1;
    setPendingCount(pendingRef.current);
    setInflightIds((ids) => new Set(ids).add(objectId));
  }

  /** One request done. Once none are open any more, a single quiet
      reload brings everything in line with the server (growth, other
      tabs) — never while requests are in flight, so nothing flickers. */
  function endRequest(objectId: string) {
    setInflightIds((ids) => {
      const next = new Set(ids);
      next.delete(objectId);
      return next;
    });
    pendingRef.current -= 1;
    setPendingCount(pendingRef.current);
    if (pendingRef.current === 0 && userId !== null) {
      const profileId = userId;
      idleReloadRef.current = window.setTimeout(() => {
        idleReloadRef.current = null;
        void reloadGarden();
        void loadInventory(createClient(), profileId);
      }, 1200);
    }
  }

  /** Changes one inventory slot's quantity locally. A slot reaching 0
      disappears (the server only lists quantity > 0); `restore` brings
      it back after a rollback. */
  function adjustStock(selection: SelectedItem, delta: number, restore: InventoryItem | null) {
    if (selection.isPathTile) return; // unlimited
    setInventory((list) => {
      if (!list) return list;
      const matches = (item: InventoryItem) =>
        item.itemId === selection.itemId && item.isGrown === selection.isGrown;
      if (!list.some(matches)) {
        return restore && delta > 0 ? [...list, { ...restore, quantity: delta }] : list;
      }
      return list
        .map((item) => (matches(item) ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.unlimited || item.quantity > 0);
    });
  }

  /** Bounce + earth puff for something just put down (none under
      reduced motion). `at` is its ground point in world px. */
  function land(key: string, at: { x: number; y: number }) {
    if (reducedMotion) return;
    const token = ++landingTokenRef.current;
    setLandings((list) => [...list, { token, key, at }]);
    window.setTimeout(
      () => setLandings((list) => list.filter((landing) => landing.token !== token)),
      700
    );
  }
  const landingTokenRef = useRef(0);

  /** Places the selected tray item with its footprint at `cell` — drawn
      at once, saved in the background; rolled back with a message if the
      server says no. Several can be on their way at the same time. */
  async function placeAt(cell: HoverCell) {
    const item = selectedItem;
    if (!item || !ghost || busy || userId === null || worldId === null) return;

    // Same check the hover preview already showed — re-run here (rather
    // than trusting the last hover) so a red spot never spends a
    // round-trip. Objects still being saved count as taken.
    const { footprint, blockReason, pos } = ghostPlacement(ghost, cell);
    if (blockReason !== null) {
      setActionError(friendlyPlaceErrorMessage(blockReason));
      return;
    }

    const rotation = placementRotation;
    const tempId = `pending-${++tempIdRef.current}`;
    const stock = selectedStock;
    const optimistic: GardenObject = {
      id: tempId,
      renderKey: tempId,
      pos_x: pos.pos_x,
      pos_y: pos.pos_y,
      grid_x: cell.grid_x,
      grid_y: cell.grid_y,
      footprint_width: item.footprintWidth,
      footprint_height: item.footprintHeight,
      growth_percent:
        item.growthDurationSeconds === null ? null : item.isGrown ? 100 : 0,
      grown_at: item.isGrown && !item.isPathTile ? new Date().toISOString() : null,
      growth_duration_seconds: item.growthDurationSeconds,
      scale: 1,
      rotation,
      category: item.category,
      item_name: item.name,
      isPathTile: item.isPathTile,
      isPrecisePlacement: item.isPrecisePlacement,
    };

    setActionError(null);
    mutateObjects((list) => [...list, optimistic]);
    adjustStock(item, -1, stock);
    land(tempId, groundPoint(optimistic, footprint));
    beginRequest(tempId);

    const { data, error: placeError } = await createClient()
      .rpc("place_garden_object", {
        p_item_id: item.itemId,
        p_world_id: worldId,
        p_grid_x: cell.grid_x,
        p_grid_y: cell.grid_y,
        p_pos_x: pos.pos_x,
        p_pos_y: pos.pos_y,
        p_rotation: rotation,
        p_scale: 1,
        p_use_grown: item.isGrown,
      })
      .single<GardenObjectRow>();

    if (placeError || !data) {
      mutateObjects((list) => list.filter((object) => object.id !== tempId));
      adjustStock(item, 1, stock);
      // Its slot may have vanished with the optimistic -1 — pick it again.
      setSelectedItem((current) => current ?? item);
      setActionError(friendlyPlaceErrorMessage(placeError?.message ?? "Couldn't save that — try again."));
    } else {
      // Just this object takes the server's answer (its real id).
      mutateObjects((list) =>
        list.map((object) => (object.id === tempId ? { ...object, ...fromRow(data) } : object))
      );
    }
    endRequest(tempId);
  }
  const tempIdRef = useRef(0);

  /** Moves/turns a placed object to `cell`/`pos`/`rotation`: shown at
      once, saved through move_garden_object() (the only way the client
      may change grid_x/grid_y) in the background. On failure it glides
      back to where it was, with a message. Growth is untouched. */
  async function moveObjectTo(
    object: GardenObject,
    cell: HoverCell,
    pos: { pos_x: number; pos_y: number },
    rotation: number,
    options: { landing: boolean; errorMessage?: string }
  ) {
    const previous = {
      grid_x: object.grid_x,
      grid_y: object.grid_y,
      pos_x: object.pos_x,
      pos_y: object.pos_y,
      rotation: object.rotation,
    };
    const key = object.renderKey ?? object.id;
    const moved = { ...object, grid_x: cell.grid_x, grid_y: cell.grid_y, ...pos, rotation };

    setActionError(null);
    // A glide-back still running on this object would fight the new spot.
    setReturning((current) => (current?.key === key ? null : current));
    mutateObjects((list) => list.map((item) => (item.id === object.id ? moved : item)));
    if (options.landing) {
      land(
        key,
        groundPoint(
          moved,
          footprintForRotation(moved.footprint_width, moved.footprint_height, rotation)
        )
      );
    }
    beginRequest(object.id);

    const { data, error: moveError } = await createClient()
      .rpc("move_garden_object", {
        p_garden_object_id: object.id,
        p_grid_x: cell.grid_x,
        p_grid_y: cell.grid_y,
        p_pos_x: pos.pos_x,
        p_pos_y: pos.pos_y,
        p_rotation: rotation,
      })
      .single<GardenObjectRow>();

    if (moveError || !data) {
      mutateObjects((list) =>
        list.map((item) => (item.id === object.id ? { ...item, ...previous } : item))
      );
      if (!reducedMotion) {
        const token = ++landingTokenRef.current;
        setReturning({
          key,
          dx: (pos.pos_x - previous.pos_x) * CELL_PX,
          dy: (pos.pos_y - previous.pos_y) * CELL_PX,
          token,
        });
        // Done after the glide (0.34s) — later moves start clean.
        window.setTimeout(
          () => setReturning((current) => (current?.token === token ? null : current)),
          450
        );
      }
      setActionError(
        options.errorMessage ??
          friendlyPlaceErrorMessage(moveError?.message ?? "Couldn't save that — try again.")
      );
    } else {
      mutateObjects((list) =>
        list.map((item) => (item.id === object.id ? { ...item, ...fromRow(data) } : item))
      );
    }
    endRequest(object.id);
  }

  function commitMove(cell: HoverCell) {
    if (!moving || !ghost || !movingObject || busy) return;
    const { blockReason, pos } = ghostPlacement(ghost, cell);
    if (blockReason !== null) {
      // Stays on the cursor, so the player can just try another spot.
      setActionError(friendlyPlaceErrorMessage(blockReason));
      return;
    }

    setHoverCell(null);
    setMoving(null);
    void moveObjectTo(movingObject, cell, pos, moving.rotation, { landing: true });
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
  function handleRotateObject() {
    const object = focusedObject;
    if (!object || busy || inflightIds.has(object.id)) return;

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

    void moveObjectTo(object, cell, pos, rotation, {
      landing: false,
      errorMessage: ROTATE_BLOCKED_MESSAGE,
    });
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

  // ---- dragging a slot out of the tray ----

  /** Latest pointer position (client px) — for edge-scroll and drops. */
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  /** Is (x, y) over the garden itself — not the tray, banner-free HUD
      buttons or anything else laid over it? */
  function isOverGarden(x: number, y: number) {
    const target = document.elementFromPoint(x, y);
    return Boolean(target && viewportRef.current?.contains(target));
  }

  function handleSlotDragStart(item: InventoryItem, x: number, y: number) {
    if (mode !== "edit" || busy) return;
    const previous = selectedItem;
    const alreadySelected =
      previous?.itemId === item.itemId && previous.isGrown === item.isGrown;
    if (!alreadySelected) {
      setSelectedItem(toSelectedItem(item));
      setPlacementRotation(0);
    }
    setMoving(null);
    setFocusedId(null);
    setActionError(null);
    pointerRef.current = { x, y };
    setDrag({ x, y, overGarden: false, previous });
  }

  // Window-level tracking while a slot is dragged: the preview follows the
  // pointer over the garden; letting go there places, anywhere else
  // (the tray, say) cancels. Handlers read the latest render via dragApi.
  const dragApi = useRef({ drag, placeAt, gridCellAt, isOverGarden, setHoverCellIfChanged });
  dragApi.current = { drag, placeAt, gridCellAt, isOverGarden, setHoverCellIfChanged };
  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;

    function track(event: globalThis.PointerEvent) {
      const { x, y } = { x: event.clientX, y: event.clientY };
      pointerRef.current = { x, y };
      const api = dragApi.current;
      const overGarden = api.isOverGarden(x, y);
      setDrag((current) => (current ? { ...current, x, y, overGarden } : current));
      api.setHoverCellIfChanged(overGarden ? api.gridCellAt(x, y) : null);
    }

    function finish(event: globalThis.PointerEvent) {
      const api = dragApi.current;
      const { clientX: x, clientY: y } = event;
      if (event.type === "pointerup" && api.isOverGarden(x, y)) {
        void api.placeAt(api.gridCellAt(x, y));
        setDrag(null);
      } else {
        // Cancelled (dropped on the tray, or the pointer got lost): back to
        // whatever was selected before the drag.
        if (api.drag) setSelectedItem(api.drag.previous);
        setDrag(null);
      }
      api.setHoverCellIfChanged(null);
    }

    window.addEventListener("pointermove", track);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointermove", track);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [dragging]);

  // Edge-scroll while carrying something (a dragged slot, or an object
  // being moved). The world slides under a still pointer, so the
  // preview's cell is recomputed after every step.
  useEdgeScroll({
    active: mode === "edit" && (dragging || moving !== null),
    pointerRef,
    viewportRef,
    insetBottom: bottomStackHeight,
    panBy: camera.panBy,
    reducedMotion,
    onPan: () => {
      const pointer = pointerRef.current;
      if (!pointer) return;
      setHoverCellIfChanged(isOverGarden(pointer.x, pointer.y) ? gridCellAt(pointer.x, pointer.y) : null);
    },
  });

  /** Right-click puts down what's being carried, like Esc. */
  function handleContextMenu(event: MouseEvent<HTMLDivElement>) {
    if (mode !== "edit" || !(selectedItem || moving)) return;
    event.preventDefault();
    setMoving(null);
    setSelectedItem(null);
    setHoverCell(null);
    setActionError(null);
  }

  function renderLandings() {
    if (landings.length === 0) return null;
    const zoom = ZOOM_STEPS[camera.zoomIndex];
    return landings.map((landing) => (
      <div
        key={landing.token}
        className={styles.dropBurst}
        style={{ left: landing.at.x, top: landing.at.y, scale: 1 / zoom }}
      >
        <PurchaseBurst variant="soil" tuning={DROP_BURST_TUNING} onDone={() => {}} />
      </div>
    ));
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
    <div ref={pageRef} className={styles.page} onContextMenu={handleContextMenu}>
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
          vignetteInsetBottom={mode === "edit" ? bottomStackHeight : 0}
          mode={mode}
          onWorldClick={handleGardenClick}
          onWorldMouseMove={handleGardenMouseMove}
          onWorldMouseLeave={handleGardenMouseLeave}
          onObjectClick={handleObjectClick}
          objectActionLabel={mode === "edit" ? "edit" : "details"}
          busyObjectId={busyObjectId}
          landedKeys={landedKeys}
          returning={returning}
          focusedObjectId={focusedId}
          movingObjectId={moving?.id ?? null}
          cursor={ghost ? "crosshair" : undefined}
          worldOverlay={
            <>
              {renderPlacementPreview()}
              {renderPopover()}
              {renderLandings()}
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
            cols={gridWidth}
            rows={gridHeight}
            cellPx={CELL_PX}
            originPx={EDGE_CELLS * CELL_PX}
            plantable={null}
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
              {saving
                ? "Saving…"
                : moving
                  ? "Moving"
                  : selectedItem
                    ? selectionLabel(selectedItem, selectedStock, placementRotation)
                    : "Editing your garden"}
            </span>
            <span className={styles.editBannerHint}>
              {saving
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
            onSlotDragStart={handleSlotDragStart}
            disabled={busy}
          />
        )}
      </div>

      {/* The dragged slot, under the pointer while it's not over the
          garden (over the garden, the placement preview shows instead). */}
      {drag && !drag.overGarden && ghost?.illustration && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.dragChip}
          src={ghost.illustration}
          alt=""
          style={{ left: drag.x, top: drag.y }}
        />
      )}

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

function toSelectedItem(item: InventoryItem): SelectedItem {
  return {
    itemId: item.itemId,
    isGrown: item.isGrown,
    growthDurationSeconds: item.growthDurationSeconds,
    isPathTile: Boolean(item.unlimited),
    footprintWidth: item.footprintWidth,
    footprintHeight: item.footprintHeight,
    category: item.category,
    isPrecisePlacement: item.isPrecisePlacement,
    name: item.name,
  };
}

/** The garden_objects row place_garden_object() / move_garden_object()
    answer with — the fields the client takes over from it. */
type GardenObjectRow = {
  id: string;
  grid_x: number;
  grid_y: number;
  pos_x: number;
  pos_y: number;
  rotation: number;
  scale: number;
  grown_at: string | null;
};

function fromRow(row: GardenObjectRow): Partial<GardenObject> {
  return {
    id: row.id,
    grid_x: row.grid_x,
    grid_y: row.grid_y,
    pos_x: row.pos_x,
    pos_y: row.pos_y,
    rotation: row.rotation,
    scale: row.scale,
    grown_at: row.grown_at,
  };
}

/** Where an object meets the ground, in world px — its earth puff's
    origin: the bottom-center anchor for organic objects, the bottom
    middle of the (rotated) footprint for precise ones. */
function groundPoint(
  object: GardenObject,
  footprint: { width: number; height: number }
): { x: number; y: number } {
  return object.isPrecisePlacement
    ? {
        x: (object.pos_x + footprint.width / 2) * CELL_PX,
        y: (object.pos_y + footprint.height) * CELL_PX,
      }
    : { x: object.pos_x * CELL_PX, y: object.pos_y * CELL_PX };
}
