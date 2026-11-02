"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/** Fired on window once sync_streak() has run, so pages showing
    current_streak can refetch instead of keeping the stale cached value. */
export const STREAK_SYNCED_EVENT = "bloomly:streak-synced";

// profiles.current_streak is only a cache: after days without studying it
// stays stale until sync_streak() runs (otherwise only on session end). This
// runs it once per signed-in user per page load. Listens to auth changes
// rather than syncing on mount, because sign-in navigates with router.push
// and the root layout (where this lives) doesn't remount.
export function StreakSync() {
  const syncedUserId = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        syncedUserId.current = null;
        return;
      }

      const userId = session?.user.id;
      if (!userId || syncedUserId.current === userId) return;
      syncedUserId.current = userId;

      // Supabase calls inside the auth callback can deadlock — defer it.
      setTimeout(async () => {
        const { error } = await supabase.rpc("sync_streak", { p_profile_id: userId });
        if (error) {
          console.warn("sync_streak failed", error.message);
          return;
        }
        window.dispatchEvent(new Event(STREAK_SYNCED_EVENT));
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
