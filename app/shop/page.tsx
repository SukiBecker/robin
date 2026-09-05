"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Baloo_2, Quicksand } from "next/font/google";
import { createClient } from "@/lib/supabase/client";
import styles from "./shop-overview.module.css";

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

type World = {
  id: number;
  name: string;
  slug: string;
  unlock_level: number;
};

// The item-shop route for a world lives at /shop/[world], where [world] is
// a German URL slug — distinct from worlds.slug in the database, which is
// English (see the matching comment in app/shop/[world]/page.tsx). Only
// Garden has a route wired up so far; a world with no entry here simply
// can't be navigated to yet, regardless of unlock state.
const WORLD_ROUTE_SLUGS: Record<string, string> = {
  garden: "garten",
};

export default function ShopOverviewPage() {
  const router = useRouter();

  const [worlds, setWorlds] = useState<World[] | null>(null);
  const [level, setLevel] = useState<number | null>(null);
  const [coins, setCoins] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
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

      const [worldsResult, profileResult] = await Promise.all([
        supabase
          .from("worlds")
          .select("id, name, slug, unlock_level")
          .order("sort_order", { ascending: true }),
        supabase
          .from("profiles_with_level")
          .select("level, coins")
          .eq("id", user.id)
          .single(),
      ]);

      if (cancelled) return;

      setLoading(false);

      if (worldsResult.error) {
        setError(worldsResult.error.message);
        return;
      }

      if (profileResult.error) {
        setError(profileResult.error.message);
        return;
      }

      setWorlds(worldsResult.data);
      setLevel(profileResult.data.level);
      setCoins(profileResult.data.coins);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={`${styles.page} ${displayFont.variable} ${bodyFont.variable}`}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.glowSecondary} aria-hidden="true" />

      <div className={styles.shell}>
        <div className={styles.headerRow}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => router.back()}
              aria-label="Back"
            >
              <BackArrowIcon />
            </button>
            <div className={styles.titleBlock}>
              <h1 className={styles.heading}>Robin Shop</h1>
              <p className={styles.tagline}>Trade the coins you&apos;ve earned for new worlds to grow.</p>
            </div>
          </div>

          {!loading && coins !== null && (
            <div className={styles.walletPill}>
              <span className={styles.walletLabel}>Coins</span>
              <span className={styles.walletValue}>{coins}</span>
            </div>
          )}
        </div>

        {loading && <p className={styles.body}>Loading…</p>}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}

        {!loading && !error && worlds && level !== null && (
          <div className={styles.worldGrid}>
            {worlds.map((world) => {
              const unlocked = world.unlock_level <= level;
              const routeSlug = WORLD_ROUTE_SLUGS[world.slug];

              if (unlocked && routeSlug) {
                return (
                  <Link
                    key={world.id}
                    href={`/shop/${routeSlug}`}
                    className={styles.worldCard}
                  >
                    <span className={styles.worldName}>{world.name}</span>
                    <span className={styles.worldMeta}>
                      Unlock level <strong>{world.unlock_level}</strong>
                    </span>
                  </Link>
                );
              }

              return (
                <div
                  key={world.id}
                  className={styles.worldCardLocked}
                  aria-disabled="true"
                >
                  <LockIcon className={styles.lockIcon} />
                  <span className={styles.worldName}>{world.name}</span>
                  <span className={styles.unlockHint}>
                    Unlock at Level {world.unlock_level}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function BackArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M12.5 4.5L6 10l6.5 5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="4.5"
        y="10"
        width="13"
        height="9"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M7.5 10V7.5a3.5 3.5 0 0 1 7 0V10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
