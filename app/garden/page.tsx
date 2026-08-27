"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { Baloo_2, Quicksand } from "next/font/google";
import { createClient } from "@/lib/supabase/client";
import { useGardenObjects } from "@/lib/garden/use-garden-objects";
import { GardenView } from "@/components/garden-view";
import styles from "./garden.module.css";

const displayFont = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
});
const bodyFont = Quicksand({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-body",
});

type InventoryItem = {
  itemId: string;
  isGrown: boolean;
  quantity: number;
  name: string;
};

type SelectedItem = {
  itemId: string;
  isGrown: boolean;
};

export default function GardenPage() {
  const {
    userId,
    worldId,
    objects,
    loading: gardenLoading,
    error: gardenError,
    reload: reloadGarden,
  } = useGardenObjects();

  const [inventory, setInventory] = useState<InventoryItem[] | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [placing, setPlacing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const busy = placing || removingId !== null;
  // Inventory only ever starts loading once userId resolves, so don't let
  // it block the combined loading flag while userId is still null (either
  // still loading, or the initial garden load failed with gardenError).
  const loading = gardenLoading || (userId !== null && inventoryLoading);
  const error = gardenError ?? actionError;

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
      .select("item_id, is_grown, quantity, item_catalog(name, placeable)")
      .eq("profile_id", profileId)
      .gt("quantity", 0);

    if (inventoryError) {
      setActionError(inventoryError.message);
      return;
    }

    // Only placeable items belong in this list — place_garden_object()
    // rejects anything else (e.g. the Streak Freezer consumable) anyway.
    const items: InventoryItem[] = (data as unknown as Array<{
      item_id: string;
      is_grown: boolean;
      quantity: number;
      item_catalog: { name: string; placeable: boolean } | null;
    }>)
      .filter((row) => row.item_catalog?.placeable)
      .map((row) => ({
        itemId: row.item_id,
        isGrown: row.is_grown,
        quantity: row.quantity,
        name: row.item_catalog!.name,
      }));

    setInventory(items);
  }

  function handleSelectItem(item: InventoryItem) {
    setSelectedItem((current) =>
      current?.itemId === item.itemId && current.isGrown === item.isGrown
        ? null // clicking the already-selected item deselects it
        : { itemId: item.itemId, isGrown: item.isGrown }
    );
  }

  async function handleGardenClick(event: MouseEvent<HTMLDivElement>) {
    if (!selectedItem || busy || userId === null || worldId === null) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const pos_x = clamp(((event.clientX - rect.left) / rect.width) * 100);
    const pos_y = clamp(((event.clientY - rect.top) / rect.height) * 100);

    setActionError(null);
    setPlacing(true);

    const supabase = createClient();

    const { error: placeError } = await supabase.rpc("place_garden_object", {
      p_item_id: selectedItem.itemId,
      p_world_id: worldId,
      p_pos_x: pos_x,
      p_pos_y: pos_y,
      p_rotation: 0,
      p_scale: 1,
      p_use_grown: selectedItem.isGrown,
    });

    if (placeError) {
      setPlacing(false);
      setActionError(placeError.message);
      return;
    }

    setSelectedItem(null);
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
    const { error: removeError } = await supabase.rpc(
      "remove_garden_object",
      { p_garden_object_id: objectId }
    );

    if (removeError) {
      setRemovingId(null);
      setActionError(removeError.message);
      return;
    }

    await Promise.all([reloadGarden(), loadInventory(supabase, userId)]);
    setRemovingId(null);
  }

  return (
    <div className={`${styles.page} ${displayFont.variable} ${bodyFont.variable}`}>
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
                {inventory?.map((item) => {
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
                          × {item.quantity} ({item.isGrown ? "grown" : "seed"})
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
            </div>

            <GardenView
              objects={objects}
              onContainerClick={handleGardenClick}
              onObjectClick={handleRemoveObject}
              busyObjectId={removingId}
              cursor={selectedItem ? "crosshair" : "default"}
            />
          </>
        )}
      </div>
    </div>
  );
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}
