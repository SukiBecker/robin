"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ShopWorldPageProps = {
  params: Promise<{ world: string }>;
};

type ShopItem = {
  id: string;
  name: string;
  price: number;
  unlock_level: number;
};

type InventoryItem = {
  itemId: string;
  isGrown: boolean;
  quantity: number;
  name: string;
};

// Route slugs are the (German) URL-facing names used elsewhere in this app;
// worlds.slug in the database is English. V1 only has one world.
const WORLDS: Record<string, { slug: string; displayName: string }> = {
  garten: { slug: "garden", displayName: "Garden" },
};

export default function ShopWorldPage({ params }: ShopWorldPageProps) {
  const { world } = use(params);
  const worldInfo = WORLDS[world];

  if (!worldInfo) {
    notFound();
  }

  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<ShopItem[] | null>(null);
  const [coins, setCoins] = useState<number | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          setError("You must be signed in to view the shop.");
        }
        return;
      }

      const [worldResult, levelResult] = await Promise.all([
        supabase
          .from("worlds")
          .select("id")
          .eq("slug", worldInfo.slug)
          .single(),
        supabase
          .from("profiles_with_level")
          .select("level")
          .eq("id", user.id)
          .single(),
      ]);

      if (worldResult.error || !worldResult.data) {
        if (!cancelled) {
          setLoading(false);
          setError(worldResult.error?.message ?? "World not found.");
        }
        return;
      }

      if (levelResult.error || !levelResult.data) {
        if (!cancelled) {
          setLoading(false);
          setError(levelResult.error?.message ?? "Could not load level.");
        }
        return;
      }

      const { data, error: itemsError } = await supabase
        .from("item_catalog")
        .select("id, name, price, unlock_level")
        .eq("world_id", worldResult.data.id)
        .eq("active", true)
        .lte("unlock_level", levelResult.data.level)
        .order("unlock_level", { ascending: true });

      if (itemsError) {
        if (!cancelled) {
          setLoading(false);
          setError(itemsError.message);
        }
        return;
      }

      if (cancelled) return;

      setUserId(user.id);
      setItems(data);

      await loadWallet(supabase, user.id);

      if (!cancelled) setLoading(false);
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [worldInfo.slug]);

  async function loadWallet(
    supabase: ReturnType<typeof createClient>,
    profileId: string
  ) {
    const [profileResult, inventoryResult] = await Promise.all([
      supabase.from("profiles").select("coins").eq("id", profileId).single(),
      supabase
        .from("inventory")
        .select("item_id, is_grown, quantity, item_catalog(name)")
        .eq("profile_id", profileId)
        .gt("quantity", 0),
    ]);

    if (profileResult.error) {
      setError(profileResult.error.message);
      return;
    }

    setCoins(profileResult.data.coins);

    if (inventoryResult.error) {
      setError(inventoryResult.error.message);
      return;
    }

    const inventoryItems: InventoryItem[] = (
      inventoryResult.data as unknown as Array<{
        item_id: string;
        is_grown: boolean;
        quantity: number;
        item_catalog: { name: string } | null;
      }>
    ).map((row) => ({
      itemId: row.item_id,
      isGrown: row.is_grown,
      quantity: row.quantity,
      name: row.item_catalog?.name ?? "Unknown item",
    }));

    setInventory(inventoryItems);
  }

  async function handlePurchase(item: ShopItem) {
    if (purchasingId !== null || userId === null) return;

    setError(null);
    setPurchasingId(item.id);

    const supabase = createClient();

    // Server-side: purchase_item() re-checks level/price/coins and writes
    // to purchases + inventory atomically. The client only ever sends the
    // item id and quantity — never a price.
    const { error: purchaseError } = await supabase.rpc("purchase_item", {
      p_item_id: item.id,
      p_quantity: 1,
    });

    if (purchaseError) {
      setPurchasingId(null);
      setError(getPurchaseErrorMessage(purchaseError.message));
      return;
    }

    await loadWallet(supabase, userId);
    setPurchasingId(null);
  }

  return (
    <section>
      <h1>Shop – {worldInfo.displayName}</h1>

      {loading && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && (
        <>
          <p>Coins: {coins ?? "—"}</p>

          <h2>Items</h2>
          <ul>
            {items?.length === 0 && (
              <li>No items available at your level yet.</li>
            )}
            {items?.map((item) => (
              <li key={item.id}>
                {item.name} — {item.price} coins (unlock level{" "}
                {item.unlock_level}){" "}
                <button
                  type="button"
                  onClick={() => handlePurchase(item)}
                  disabled={purchasingId !== null}
                >
                  {purchasingId === item.id ? "Buying…" : "Buy"}
                </button>
              </li>
            ))}
          </ul>

          <h2>Inventory</h2>
          <ul>
            {inventory?.length === 0 && <li>Nothing owned yet.</li>}
            {inventory?.map((invItem) => (
              <li key={`${invItem.itemId}-${invItem.isGrown}`}>
                {invItem.name} — {invItem.quantity} (
                {invItem.isGrown ? "grown" : "seed"})
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/**
 * Maps purchase_item()'s raised exception text to a fixed, user-facing
 * message, decoupling shop copy from the exact wording in the schema.
 * Falls back to the raw message for anything unrecognized (e.g. the
 * "Quantity must be positive" / "not stackable" cases, unreachable here
 * since this page always buys quantity 1).
 */
function getPurchaseErrorMessage(message: string): string {
  if (message.startsWith("Not enough coins")) {
    return "You don't have enough coins for this item.";
  }
  if (message.startsWith("Item requires level")) {
    return "Your level is too low to buy this item.";
  }
  if (message.startsWith("Item not found or inactive")) {
    return "This item is no longer available.";
  }
  return message;
}
