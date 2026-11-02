"use client";

import { useEffect } from "react";
import { isPublicRoute } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/client";
import { leaveAsSignedOut } from "@/lib/supabase/use-sign-out";

// Keeps signed-in pages from lingering once there's no session:
//  - Supabase broadcasts SIGNED_OUT to every open tab. A tab still showing
//    a signed-in page (another tab logged out, or the session expired)
//    leaves it right away instead of showing stale data until the next click.
//  - Back after a logout can restore a page from the browser's
//    back/forward cache without any request (the middleware's no-store
//    header should prevent that, but production may override it), so a
//    restored page re-checks the session itself.
export function AuthWatcher() {
  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && !isPublicRoute(window.location.pathname)) {
        leaveAsSignedOut();
      }
    });

    async function onPageShow(event: PageTransitionEvent) {
      if (!event.persisted || isPublicRoute(window.location.pathname)) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) leaveAsSignedOut();
    }
    window.addEventListener("pageshow", onPageShow);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return null;
}
