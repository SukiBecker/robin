"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Reusable sign-out action for Client Components (e.g. a nav button).
 *
 * Usage:
 *   import { useSignOut } from "@/lib/supabase/use-sign-out";
 *   const { signOut, loading, error } = useSignOut();
 *   <button onClick={signOut} disabled={loading}>Sign out</button>
 *
 * On success, redirects to /signin and refreshes the router so any
 * server-rendered data reflects the now-signed-out state.
 */
export function useSignOut() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  const signOut = useCallback(async () => {
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signOutError } = await supabase.auth.signOut();

    setLoading(false);

    if (signOutError) {
      setError(signOutError);
      return;
    }

    router.push("/signin");
    router.refresh();
  }, [router]);

  return { signOut, loading, error };
}
