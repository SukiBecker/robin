"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getLevelProgress, XP_CHANGED_EVENT, type LevelProgress } from "@/lib/level-progress";
import { LevelXpBar } from "./level-xp-bar";
import styles from "./nav-bar.module.css";

const navigation = [
  { href: "/studyroom", label: "Studyroom" },
  { href: "/garden", label: "Garden" },
  { href: "/shop", label: "Shop" },
  { href: "/statistics", label: "Statistics" },
  { href: "/settings", label: "Settings" },
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

  if (NAV_LESS_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return null;
  }

  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Main navigation">
        <Link href="/" className={styles.brand}>
          Robin
        </Link>

        {levelProgress && <LevelXpBar {...levelProgress} className={styles.xpBar} />}

        <div className={styles.links}>
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.link} ${active ? styles.linkActive : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
