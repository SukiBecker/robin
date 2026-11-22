"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, type MouseEvent } from "react";

/** Longest we hold the old room's picture while the new route loads. */
const MAX_WAIT_MS = 1000;

/**
 * Room switch as a short crossfade (~250 ms, app/room-backdrop.css) via the
 * View Transitions API: the old room fades into the new one, backgrounds
 * included, while the journal frame stays put. Returns an onClick for a
 * Next <Link>. Without browser support, with reduced motion, or for
 * modified clicks it does nothing and the Link navigates as usual.
 */
export function useRoomTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const pending = useRef<{ resolve: () => void; timer: number } | null>(null);

  // The new route has rendered: let the transition take its "new" picture.
  useEffect(() => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    window.clearTimeout(p.timer);
    // React has committed the new room; the browser takes the "new"
    // picture once this resolves (no rAF: rendering is paused meanwhile).
    p.resolve();
  }, [pathname]);

  return useCallback(
    (event: MouseEvent<HTMLAnchorElement>, href: string) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        typeof document === "undefined" ||
        !("startViewTransition" in document) ||
        !window.matchMedia("(prefers-reduced-motion: no-preference)").matches ||
        href === window.location.pathname
      ) {
        return;
      }
      event.preventDefault();
      document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            const timer = window.setTimeout(() => {
              pending.current = null;
              resolve();
            }, MAX_WAIT_MS);
            pending.current = { resolve, timer };
            router.push(href);
          }),
      );
    },
    [router],
  );
}
