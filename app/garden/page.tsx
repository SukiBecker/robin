"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type GardenObject = {
  id: string;
  pos_x: number;
  pos_y: number;
  growth_percent: number | null;
};

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
  const [userId, setUserId] = useState<string | null>(null);
  const [worldId, setWorldId] = useState<number | null>(null);
  const [objects, setObjects] = useState<GardenObject[] | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[] | null>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = placing || removingId !== null;

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setError(null);
      setLoading(true);

      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!cancelled) {
          setLoading(false);
          setError("You must be signed in to view your garden.");
        }
        return;
      }

      // V1 ships exactly one world (Garden). Looked up by slug rather than
      // assumed to be id 1, since worlds.id is a plain serial.
      const { data: world, error: worldError } = await supabase
        .from("worlds")
        .select("id")
        .eq("slug", "garden")
        .single();

      if (worldError || !world) {
        if (!cancelled) {
          setLoading(false);
          setError(worldError?.message ?? "Garden world not found.");
        }
        return;
      }

      if (cancelled) return;

      setUserId(user.id);
      setWorldId(world.id);

      await Promise.all([
        loadGarden(supabase, user.id, world.id),
        loadInventory(supabase, user.id),
      ]);

      if (!cancelled) setLoading(false);
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadGarden(
    supabase: ReturnType<typeof createClient>,
    profileId: string,
    world: number
  ) {
    const { data, error: objectsError } = await supabase
      .from("v_garden_objects_with_progress")
      .select("id, pos_x, pos_y, growth_percent")
      .eq("profile_id", profileId)
      .eq("world_id", world);

    if (objectsError) {
      setError(objectsError.message);
      return;
    }

    setObjects(data);
  }

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
      setError(inventoryError.message);
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

    setError(null);
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
      setError(placeError.message);
      return;
    }

    setSelectedItem(null);
    await Promise.all([
      loadGarden(supabase, userId, worldId),
      loadInventory(supabase, userId),
    ]);
    setPlacing(false);
  }

  async function handleRemoveObject(
    event: MouseEvent<HTMLDivElement>,
    objectId: string
  ) {
    // Stop this from also bubbling up to the container's placement click.
    event.stopPropagation();

    if (busy || userId === null || worldId === null) return;

    setError(null);
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
      setError(removeError.message);
      return;
    }

    await Promise.all([
      loadGarden(supabase, userId, worldId),
      loadInventory(supabase, userId),
    ]);
    setRemovingId(null);
  }

  return (
    <section>
      <h1>Garden</h1>

      {loading && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}

      {/* Gated on whether the initial load succeeded (userId/worldId set),
          not on `error` — a later place/remove error must show as a banner
          above the still-usable inventory and garden, not hide them. */}
      {!loading && userId !== null && worldId !== null && (
        <>
          <div>
            <h2>Inventory</h2>
            {inventory?.length === 0 && <p>No placeable items owned yet.</p>}
            <ul>
              {inventory?.map((item) => {
                const isSelected =
                  selectedItem?.itemId === item.itemId &&
                  selectedItem.isGrown === item.isGrown;
                return (
                  <li key={`${item.itemId}-${item.isGrown}`}>
                    <button
                      type="button"
                      onClick={() => handleSelectItem(item)}
                      disabled={busy}
                      style={{
                        fontWeight: isSelected ? "bold" : "normal",
                      }}
                    >
                      {isSelected ? "✓ " : ""}
                      {item.name} — {item.quantity} (
                      {item.isGrown ? "grown" : "seed"})
                    </button>
                  </li>
                );
              })}
            </ul>
            <p>
              {selectedItem
                ? "Click a spot in the garden below to place it."
                : "Select an item above, then click the garden to place it. Click a placed item to remove it."}
            </p>
          </div>

          <div
            onClick={handleGardenClick}
            style={{
              position: "relative",
              width: "100%",
              height: "600px",
              border: "1px solid #ccc",
              cursor: selectedItem ? "crosshair" : "default",
            }}
          >
            {objects?.length === 0 && <p>Nothing planted yet.</p>}

            {/* No illustration assets yet — each placed object is just a
                plain colored box at its pos_x/pos_y (percentages of this
                container), labeled with its growth state. Clicking a box
                removes it (stopPropagation so it doesn't also trigger a
                placement click on the container underneath). */}
            {objects?.map((object) => (
              <div
                key={object.id}
                onClick={(event) => handleRemoveObject(event, object.id)}
                title={`growth_percent: ${object.growth_percent ?? "n/a"} — click to remove`}
                style={{
                  position: "absolute",
                  left: `${object.pos_x}%`,
                  top: `${object.pos_y}%`,
                  transform: "translate(-50%, -50%)",
                  width: "48px",
                  height: "48px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  fontSize: "0.7rem",
                  color: "#fff",
                  backgroundColor: growthColor(object.growth_percent),
                  cursor: busy ? "default" : "pointer",
                  opacity: removingId === object.id ? 0.5 : 1,
                }}
              >
                {growthLabel(object.growth_percent)}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function growthLabel(growthPercent: number | null): string {
  if (growthPercent === null) return "—";
  if (growthPercent >= 100) return "grown";
  if (growthPercent <= 0) return "seed";
  return "growing";
}

function growthColor(growthPercent: number | null): string {
  if (growthPercent === null) return "#9ca3af"; // gray — not growable (e.g. decoration)
  if (growthPercent >= 100) return "#16a34a"; // green — grown
  if (growthPercent <= 0) return "#a16207"; // brown — seed
  return "#eab308"; // amber — growing
}
