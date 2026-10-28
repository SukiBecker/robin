"use client";

import {
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CoinIcon } from "@/components/coin-icon";
import { ShopItemCard } from "@/components/shop-item-card";
import { TnumFallback } from "@/components/tnum-fallback";
import { buildOwnedCounts } from "@/lib/shop/owned-counts";
import {
  DEFAULT_SHOP_TAB,
  SHOP_TABS,
  isGrowingCategory,
  itemsForShopTab,
  type ShopTabId,
} from "@/lib/shop/shop-tabs";
import styles from "./shop.module.css";

type ShopWorldPageProps = {
  params: Promise<{ world: string }>;
};

type ShopItem = {
  id: string;
  name: string;
  category: string | null;
  price: number;
  unlock_level: number;
  image_asset_url: string | null;
  attributes: { unlimited_placement?: boolean } | null;
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
  const [playerLevel, setPlayerLevel] = useState<number | null>(null);
  const [coins, setCoins] = useState<number | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTabId, setActiveTabId] = useState<ShopTabId>(DEFAULT_SHOP_TAB);

  const activeTab =
    SHOP_TABS.find((tab) => tab.id === activeTabId) ?? SHOP_TABS[0];
  const visibleItems = useMemo(
    () => (items ? itemsForShopTab(items, activeTab) : []),
    [items, activeTab]
  );
  const tabCounts = useMemo(
    () =>
      Object.fromEntries(
        SHOP_TABS.map((tab) => [
          tab.id,
          items ? itemsForShopTab(items, tab).length : 0,
        ])
      ) as Record<ShopTabId, number>,
    [items]
  );
  // Derived from the same inventory state the Inventory list renders, so it
  // refreshes whenever loadWallet() runs — on page load and after each buy.
  const ownedCounts = useMemo(
    () => buildOwnedCounts(inventory ?? []),
    [inventory]
  );
  const activeTabIndex = SHOP_TABS.findIndex((tab) => tab.id === activeTab.id);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // WAI-ARIA tabs pattern: arrows/Home/End move focus and selection
  // together; only the active tab is in the Tab order.
  function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const last = SHOP_TABS.length - 1;
    const next =
      event.key === "ArrowRight"
        ? activeTabIndex === last
          ? 0
          : activeTabIndex + 1
        : event.key === "ArrowLeft"
          ? activeTabIndex === 0
            ? last
            : activeTabIndex - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    setActiveTabId(SHOP_TABS[next].id);
    tabRefs.current[next]?.focus();
  }

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
        .select(
          "id, name, category, price, unlock_level, image_asset_url, attributes"
        )
        // world_id = NULL means "usable in every world" (see item_catalog's
        // own column comment) -- a plain .eq() would silently exclude those
        // rows, since SQL NULL never equals anything, not even via .eq() on
        // the current world's id. This OR keeps world-specific items
        // (world_id = this world) AND global ones (world_id IS NULL).
        .or(`world_id.eq.${worldResult.data.id},world_id.is.null`)
        .eq("active", true)
        // Deliberately no unlock_level filter here anymore -- items above
        // the player's level are still shown (as a locked preview of
        // what's coming), just not purchasable. See the locked-state
        // rendering below and purchase_item()'s own server-side level
        // check, which remains the real gate.
        // Shape items (e.g. the 4 path pieces) carry a path_style_item_id
        // and are never bought individually -- they unlock automatically
        // once the player owns that linked style item (see the build menu
        // in app/garden/page.tsx). Excluding them here keeps this grid free
        // of price-0 "0 coins · Buy" cards that wouldn't do anything useful.
        .is("attributes->>path_style_item_id", null);
      // Tab filtering + price sort happen client-side, see
      // lib/shop/shop-tabs.ts.

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
      setPlayerLevel(levelResult.data.level);

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
    // Locked cards render no Buy button; this just keeps the handler
    // honest. purchase_item() rejects it server-side either way.
    if (playerLevel !== null && item.unlock_level > playerLevel) return;

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
    <div className={`${styles.page}`}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.glowSecondary} aria-hidden="true" />

      <div className={styles.shell}>
        <div className={styles.headerRow}>
          <h1 className={styles.heading}>Shop – {worldInfo.displayName}</h1>
          {!loading && (
            <div
              className={styles.walletPill}
              aria-label={`${coins ?? 0} coins`}
            >
              <span className={styles.walletValue}>
                <CoinIcon size={28} /> {coins ?? "—"}
              </span>
            </div>
          )}
        </div>

        {loading && <p className={styles.body}>Loading…</p>}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}

        {!loading && (
          <>
            <div className={styles.section}>
              <div
                className={styles.tabList}
                role="tablist"
                aria-label="Shop categories"
                onKeyDown={handleTabKeyDown}
                style={
                  {
                    "--tab-count": SHOP_TABS.length,
                    "--tab-index": activeTabIndex,
                  } as CSSProperties
                }
              >
                <span className={styles.tabThumb} aria-hidden="true" />
                {SHOP_TABS.map((tab, index) => {
                  const selected = tab.id === activeTab.id;
                  return (
                    <button
                      key={tab.id}
                      ref={(el) => {
                        tabRefs.current[index] = el;
                      }}
                      type="button"
                      role="tab"
                      id={`shop-tab-${tab.id}`}
                      aria-selected={selected}
                      aria-controls="shop-tab-panel"
                      tabIndex={selected ? 0 : -1}
                      className={`${styles.tab} ${selected ? styles.tabActive : ""}`}
                      onClick={() => setActiveTabId(tab.id)}
                    >
                      <span className={styles.tabLabel}>{tab.label}</span>
                      <span className={styles.tabCount}>
                        <span className={styles.visuallyHidden}>(</span>
                        {tabCounts[tab.id]}
                        <span className={styles.visuallyHidden}>)</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div
                // Remount per tab so the entrance animation replays.
                key={activeTab.id}
                id="shop-tab-panel"
                role="tabpanel"
                aria-labelledby={`shop-tab-${activeTab.id}`}
                className={`${styles.section} ${styles.tabPanel}`}
              >
                {visibleItems.length === 0 && (
                  <p className={styles.body}>{activeTab.emptyMessage}</p>
                )}

                <div className={styles.itemGrid}>
                  {visibleItems.map((item) => {
                    // purchase_item() is the real gate (re-checked
                    // server-side on every buy) -- this is only a client-side
                    // preview of that same check, so a not-yet-reached level
                    // shows the item as a locked preview instead of hiding
                    // it, letting players see what's still to come.
                    const locked =
                      playerLevel !== null && item.unlock_level > playerLevel;
                    return (
                      <ShopItemCard
                        key={item.id}
                        name={item.name}
                        price={item.price}
                        imageAssetUrl={item.image_asset_url}
                        locked={locked}
                        unlockLevel={item.unlock_level}
                        unlimited={
                          item.attributes?.unlimited_placement === true
                        }
                        grows={isGrowingCategory(item.category)}
                        owned={ownedCounts[item.id]}
                        buying={purchasingId === item.id}
                        disabled={purchasingId !== null}
                        onBuy={() => handlePurchase(item)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <span className={styles.sectionLabel}>Inventory</span>

              {inventory?.length === 0 && (
                <p className={styles.body}>Nothing owned yet.</p>
              )}

              <ul className={styles.inventoryList}>
                {inventory?.map((invItem) => (
                  <li
                    className={styles.inventoryChip}
                    key={`${invItem.itemId}-${invItem.isGrown}`}
                  >
                    {invItem.name}
                    <span>
                      ×{" "}
                      <TnumFallback digits={2}>{invItem.quantity}</TnumFallback>{" "}
                      ({invItem.isGrown ? "grown" : "seed"})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
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
