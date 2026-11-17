"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getLevelProgress, XP_CHANGED_EVENT, type LevelProgress } from "@/lib/level-progress";
import { PURCHASE_FEEDBACK_DELAY, usePurchaseEvents } from "@/lib/shop/purchase-events";
import { AnimatedCounter } from "./animated-counter";
import { Bookmark } from "./journal/bookmark";
import { GameIcon, type GameIconName } from "./journal/game-icon";
import { FocusFrame, InkRule } from "./journal/ink";
import { XpSeedRow } from "./journal/xp-seed-row";
import { TnumFallback } from "./tnum-fallback";
import styles from "./nav-bar.module.css";

// matchPrefix: the route subtree that marks the item active, when it differs
// from href. V1 has only one buyable world, so Nursery skips the /nursery
// overview and goes straight to the Garden nursery, but stays active anywhere
// under /nursery.
const navigation: { href: string; label: string; icon: GameIconName; matchPrefix?: string }[] = [
  { href: "/studyroom", label: "Studyroom", icon: "studyroom" },
  { href: "/garden", label: "Garden", icon: "garden" },
  { href: "/nursery/garten", label: "Nursery", icon: "nursery", matchPrefix: "/nursery" },
  { href: "/journal", label: "Journal", icon: "journal" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

// Sign in / sign up are standalone auth screens, not part of the main app
// shell — no point showing nav for sections the user can't reach yet.
const NAV_LESS_ROUTES = ["/signin", "/signup", "/reset-password"];

type HeaderStatus = { progress: LevelProgress; coins: number };

// Signed-in user's level progress and coins for the journal frame. Both
// come from one profiles_with_level read; the level is never computed
// client-side. Refetches on navigation, whenever a page fires
// XP_CHANGED_EVENT (session end: XP and coins), and after a purchase —
// timed with the shop's success sequence, so the coins drop together.
function useHeaderStatus(pathname: string): HeaderStatus | null {
  const [status, setStatus] = useState<HeaderStatus | null>(null);
  const [reload, setReload] = useState(0);

  usePurchaseEvents((event) => {
    if (event.type !== "success" || event.pricePaid <= 0) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => setReload((n) => n + 1), reduceMotion ? 0 : PURCHASE_FEEDBACK_DELAY.coins);
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setStatus(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles_with_level")
        .select("xp, level, coins")
        .eq("id", user.id)
        .single();
      if (cancelled || error || !data) return;

      const progress = await getLevelProgress(data.xp, data.level);
      if (!cancelled) setStatus({ progress, coins: data.coins });
    }

    load();
    window.addEventListener(XP_CHANGED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(XP_CHANGED_EVENT, load);
    };
  }, [pathname, reload]);

  return status;
}

export function NavBar() {
  const pathname = usePathname();
  const status = useHeaderStatus(pathname);

  // "/" is the signed-out landing page (exact match — as a prefix it
  // would hide the nav everywhere).
  if (
    pathname === "/" ||
    NAV_LESS_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
  ) {
    return null;
  }

  return (
    <header className={styles.header}>
      <InkRule className={styles.edge} />
      <nav className={styles.nav} aria-label="Main navigation">
        <Link href="/" className={styles.brand}>
          Robin
          <FocusFrame className={styles.brandFocus} />
        </Link>

        {status && (
          <div className={styles.status}>
            <span className={styles.coins}>
              <GameIcon name="coin" size={24} />
              {/* Fraunces has no tabular figures: the slot keeps the width */}
              <TnumFallback digits={Math.max(3, String(status.coins).length)}>
                <AnimatedCounter value={status.coins} />
              </TnumFallback>
              <span className={styles.srOnly}> coins</span>
            </span>
            <XpSeedRow
              size="compact"
              value={status.progress.current}
              max={status.progress.next}
              level={status.progress.level}
              className={styles.xpRow}
            />
          </div>
        )}

        <div className={styles.links}>
          {navigation.map((item) => {
            const match = item.matchPrefix ?? item.href;
            const active = pathname === match || pathname.startsWith(`${match}/`);
            return (
              <Bookmark
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={active}
              />
            );
          })}
        </div>
      </nav>
    </header>
  );
}
