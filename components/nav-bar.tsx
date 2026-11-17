"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getLevelProgress, XP_CHANGED_EVENT, type LevelProgress } from "@/lib/level-progress";
import { Bookmark } from "./journal/bookmark";
import type { GameIconName } from "./journal/game-icon";
import { FocusFrame, InkRule } from "./journal/ink";
import { LevelXpBar } from "./level-xp-bar";
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

// Signed-in user's level progress for the always-visible XP bar. Level
// comes from profiles_with_level (never computed client-side); refetches
// on navigation and whenever a page fires XP_CHANGED_EVENT.
function useLevelProgress(pathname: string): LevelProgress | null {
  const [progress, setProgress] = useState<LevelProgress | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setProgress(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles_with_level")
        .select("xp, level")
        .eq("id", user.id)
        .single();
      if (cancelled || error || !data) return;

      const progress = await getLevelProgress(data.xp, data.level);
      if (!cancelled) setProgress(progress);
    }

    load();
    window.addEventListener(XP_CHANGED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(XP_CHANGED_EVENT, load);
    };
  }, [pathname]);

  return progress;
}

export function NavBar() {
  const pathname = usePathname();
  const levelProgress = useLevelProgress(pathname);

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

        {levelProgress && <LevelXpBar {...levelProgress} className={styles.xpBar} />}

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
