"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  placementFlagsFromAttributes,
  useGardenObjects,
} from "@/lib/garden/use-garden-objects";
import { GardenView } from "@/components/garden-view";
import { PathPicker } from "@/components/path-picker";
import {
  getItemIllustration,
  getRotationIllustration,
} from "@/lib/garden/item-visuals";
import {
  footprintBoxRect,
  organicWidthPercent,
} from "@/lib/garden/garden-layout";
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
  /** Only set for organic (non-precise-placement) items — the exact
      pos_x/pos_y that will be written if the player clicks now
      (deterministic centering within the footprint, see
      centeredPositionInCell). Null for precise-placement items, which use
      footprintBoxRect() instead. */
  organicPos: { pos_x: number; pos_y: number } | null;
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

  const busy = placing || removingId !== null;
  // Inventory only ever starts loading once userId resolves, so don't let
  // it block the combined loading flag while userId is still null (either
  // still loading, or the initial garden load failed with gardenError).
  const loading = gardenLoading || (userId !== null && inventoryLoading);
  const error = gardenError ?? actionError;
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

  /** Grid cell (top-left of the footprint) the given client position maps
      to, clamped to the world's own grid — the same conversion
      handleGardenClick and handleGardenMouseMove both need. */
  function gridCellFromEvent(
    event: MouseEvent<HTMLDivElement>,
    gridW: number,
    gridH: number
  ): { grid_x: number; grid_y: number } {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      grid_x: clampInt(
        Math.floor(((event.clientX - rect.left) / rect.width) * gridW),
        0,
        gridW - 1
      ),
      grid_y: clampInt(
        Math.floor(((event.clientY - rect.top) / rect.height) * gridH),
        0,
        gridH - 1
      ),
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
    if (grid_x + footprintWidth > gridW || grid_y + footprintHeight > gridH) {
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

    const { grid_x, grid_y } = gridCellFromEvent(event, gridWidth, gridHeight);
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

    const organicPos = isPrecisePlacement
      ? null
      : centeredPositionInCell(
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
      organicPos,
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
    // see robin_garden_grid_migration.sql). Clamped defensively so a
    // click right on the container's far edge can't round up to a
    // one-past-the-end cell.
    const { grid_x, grid_y } = gridCellFromEvent(event, gridWidth, gridHeight);
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

    // pos_x/pos_y no longer carry any placement/collision meaning — that's
    // grid_x/grid_y above. What they mean now depends on the item:
    //
    //  - Precise-placement items (path tiles, and anything flagged via
    //    item_catalog.attributes.precise_placement) always get the exact
    //    top-left corner of their footprint, so GardenView's
    //    isPrecisePlacement rendering matches the hover preview exactly
    //    (see the Fountain WYSIWYG bug).
    //  - Every other item gets its deterministic centered position within
    //    the footprint (see centeredPositionInCell) — the same value the
    //    hover preview already showed, since both call the same pure
    //    function with the same inputs.
    const { pos_x, pos_y } = isPrecisePlacement
      ? (() => {
          const rect = footprintBoxRect(
            grid_x,
            grid_y,
            footprintWidth,
            footprintHeight,
            gridWidth,
            gridHeight
          );
          return { pos_x: rect.leftPercent, pos_y: rect.topPercent };
        })()
      : centeredPositionInCell(
          grid_x,
          grid_y,
          footprintWidth,
          footprintHeight,
          gridWidth,
          gridHeight
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

  return (
    <div
      className={`${styles.page}`}
    >
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.glowSecondary} aria-hidden="true" />

      <div className={styles.shell}>
        <h1 className={styles.heading}>Garden</h1>

        {loading && <p className={styles.body}>Loading…</p>}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}

        {/* Gated on whether the initial load succeeded (userId/worldId set),
            not on `error` — a later place/remove error must show as a banner
            above the still-usable inventory and garden, not hide them. */}
        {!loading && userId !== null && worldId !== null && (
          <>
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Inventory</span>

              {inventory?.length === 0 && (
                <p className={styles.body}>No placeable items owned yet.</p>
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
                            {item.unlimited
                              ? "Unlimited"
                              : `× ${item.quantity} (${item.isGrown ? "grown" : "seed"})`}
                          </span>
                        </button>
                      </li>
                    );
                  })}
              </ul>

              <p className={styles.body}>
                {selectedItem
                  ? "Click a spot in the garden below to place it."
                  : "Select an item above, then click the garden to place it. Click a placed item to remove it."}
              </p>

              {selectedItem &&
                isRotatable(
                  selectedItem.name,
                  selectedItem.isPrecisePlacement
                ) && (
                  <div className={styles.rotationControl}>
                    <span>Rotation: {placementRotation}°</span>
                    <button
                      type="button"
                      onClick={handleRotatePlacement}
                      disabled={busy}
                    >
                      ⟳ Rotate (R)
                    </button>
                  </div>
                )}
            </div>

            <GardenView
              objects={objects}
              gridWidth={gridWidth}
              gridHeight={gridHeight}
              onContainerClick={handleGardenClick}
              onObjectClick={handleRemoveObject}
              onContainerMouseMove={handleGardenMouseMove}
              onContainerMouseLeave={handleGardenMouseLeave}
              busyObjectId={removingId}
              cursor={selectedItem ? "crosshair" : "default"}
            >
              {/* Only rendered while an item is selected and a preview has
                  actually been computed (needs gridWidth/gridHeight, which
                  only resolve once the world lookup finishes) — never a
                  grid over the whole plot, just the handful of cells the
                  current item's footprint would occupy.

                  Two distinct rendering modes, matching GardenView's own
                  isPrecisePlacement split, each using the EXACT SAME
                  formula (footprintBoxRect / organicWidthPercent, from
                  lib/garden/garden-layout.ts) the real placed object will
                  render with — the point of the split is that neither
                  preview mode has its own, potentially-drifting math. */}
              {selectedItem &&
                hoverPreview &&
                gridWidth !== null &&
                gridHeight !== null &&
                (selectedItem.isPrecisePlacement ? (
                  <div
                    className={`${styles.placementPreview} ${
                      hoverPreview.blocked
                        ? styles.placementPreviewBlocked
                        : styles.placementPreviewFree
                    }`}
                    style={(() => {
                      const rect = footprintBoxRect(
                        hoverPreview.grid_x,
                        hoverPreview.grid_y,
                        hoverPreview.footprintWidth,
                        hoverPreview.footprintHeight,
                        gridWidth,
                        gridHeight
                      );
                      return {
                        left: `${rect.leftPercent}%`,
                        top: `${rect.topPercent}%`,
                        width: `${rect.widthPercent}%`,
                        height: `${rect.heightPercent}%`,
                      };
                    })()}
                  >
                    {/* Shows the actual art, rotated exactly like the real
                        placement will render (see GardenView) — a Kurve or
                        Ende piece looks completely different at each of the
                        4 rotations, so a plain colored box here wouldn't
                        tell the player what they're about to place.
                        object-fit: fill (not cover) to match GardenView's
                        own stretch-to-footprint rendering for these
                        items — cropping here instead would show a
                        differently-framed image than what gets placed. */}
                    {(previewRotationIllustration?.src ??
                      previewIllustration) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className={styles.placementPreviewImage}
                        src={
                          previewRotationIllustration?.src ??
                          previewIllustration!
                        }
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
                ) : (
                  hoverPreview.organicPos && (
                    <div
                      className={`${styles.placementPreviewOrganic} ${
                        hoverPreview.blocked
                          ? styles.placementPreviewOrganicBlocked
                          : styles.placementPreviewOrganicFree
                      }`}
                      style={{
                        left: `${hoverPreview.organicPos.pos_x}%`,
                        top: `${hoverPreview.organicPos.pos_y}%`,
                        width: `${organicWidthPercent({
                          category: selectedItem.category,
                          itemName: selectedItem.name,
                          footprintWidth: selectedItem.footprintWidth,
                          growthPercent: selectedItem.isGrown ? 100 : 0,
                          scale: 1,
                          pos_y: hoverPreview.organicPos.pos_y,
                        })}%`,
                        // Same bottom-center anchor GardenView renders the
                        // real object with (translate(-50%, -100%)) — the
                        // point of this whole branch is that this preview
                        // stands exactly where the placed object will.
                        transform: `translate(-50%, -100%) ${
                          previewRotationIllustration
                            ? ""
                            : `rotate(${placementRotation}deg)`
                        }`,
                      }}
                    >
                      {(previewRotationIllustration?.src ??
                        previewIllustration) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className={styles.placementPreviewOrganicImage}
                          src={
                            previewRotationIllustration?.src ??
                            previewIllustration!
                          }
                          alt=""
                          style={
                            previewRotationIllustration?.mirrored
                              ? { transform: "scaleX(-1)" }
                              : undefined
                          }
                        />
                      )}
                    </div>
                  )
                ))}
            </GardenView>
          </>
        )}
      </div>
    </div>
  );
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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
 * The deterministic visual anchor position within a placed item's own
 * footprint (not just its top-left cell — a 3x1 hedge centers across all
 * three), in the same 0-100 container-percent space GardenView positions
 * objects in.
 *
 * Only used for organic (non-precise-placement) items — see
 * GardenView.isPrecisePlacement — since GardenView anchors those at
 * pos_x/pos_y via `translate(-50%, -100%)`: pos_x centers horizontally on
 * the footprint, and pos_y lands on the footprint's BOTTOM edge, not its
 * vertical center, or the image's bottom-anchored ground-contact point
 * ends up floating above the intended cell (this was the actual root
 * cause of the Fountain WYSIWYG bug).
 */
function centeredPositionInCell(
  grid_x: number,
  grid_y: number,
  footprintWidth: number,
  footprintHeight: number,
  gridWidth: number,
  gridHeight: number
): { pos_x: number; pos_y: number } {
  const cellWidthPercent = 100 / gridWidth;
  const cellHeightPercent = 100 / gridHeight;

  return {
    pos_x: clamp((grid_x + footprintWidth / 2) * cellWidthPercent),
    pos_y: clamp((grid_y + footprintHeight) * cellHeightPercent),
  };
}

// Maps place_garden_object()'s raise exception messages (see
// robin_garden_grid_migration.sql) to copy a player should actually see.
// Anything not listed here (e.g. "Item not available in inventory") falls
// through unchanged — those read fine as-is already.
const PLACE_ERROR_MESSAGES: Record<string, string> = {
  "Grid cells already occupied":
    "That spot is already taken — try an empty patch of grass.",
  "Placement is outside world grid bounds":
    "That's outside the garden — click a bit closer to the middle of the plot.",
  "Path style not unlocked yet.":
    "You haven't unlocked this path style yet — buy it in the shop first.",
};

function friendlyPlaceErrorMessage(message: string): string {
  return PLACE_ERROR_MESSAGES[message] ?? message;
}
