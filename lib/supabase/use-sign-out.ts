"use client";

import { useCallback, useState } from "react";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/** Every localStorage key the app writes starts with this (garden camera,
    inventory tab, …) — all of it is cleared on sign-out. */
const APP_STORAGE_PREFIX = "bloomly.";

/**
 * Leaves the app as a signed-out visitor: hard navigation to /signin
 * instead of router.push. The root layout (nav bar, StreakSync) never
 * remounts on client navigation, so its state — and module caches and the
 * Next router cache — would otherwise survive and briefly show the
 * previous user's data after the next sign-in. replace() also drops the
 * current page from history.
 */
export function leaveAsSignedOut() {
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(APP_STORAGE_PREFIX)) window.localStorage.removeItem(key);
    }
  } catch {
    // storage blocked (private mode etc.) — nothing to clear
  }
  window.location.replace("/signin");
}

/**
 * Reusable sign-out action for Client Components (e.g. a nav button).
 *
 * Usage:
 *   import { useSignOut } from "@/lib/supabase/use-sign-out";
 *   const { signOut, loading, error } = useSignOut();
 *   <button onClick={signOut} disabled={loading}>Log out</button>
 */
export function useSignOut() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  const signOut = useCallback(async () => {
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setLoading(false);
      setError(signOutError);
      return;
    }

    // stays "loading" until the page is gone
    leaveAsSignedOut();
  }, []);

  return { signOut, loading, error };
}
