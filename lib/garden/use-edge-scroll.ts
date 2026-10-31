"use client";

import { useEffect, useRef, type RefObject } from "react";

/** How close (screen px) to an edge the pointer has to be. */
const EDGE_ZONE = 64;
/** Pan speed (px/s) at the zone's outer and inner end. */
const MIN_SPEED = 110;
const MAX_SPEED = 420;
/** Under prefers-reduced-motion: one slow, steady speed — no speeding up. */
const STEADY_SPEED = 150;

type Options = {
  /** True while something is being carried (dragged from the tray, or an
      object being moved). */
  active: boolean;
  /** Latest pointer position (client px), or null if unknown. */
  pointerRef: RefObject<{ x: number; y: number } | null>;
  viewportRef: RefObject<HTMLElement | null>;
  /** Screen px at the bottom covered by UI (the tray) — its top edge
      counts as the bottom edge. */
  insetBottom: number;
  /** Pans the camera; returns whether it moved (useGardenCamera.panBy). */
  panBy: (dx: number, dy: number) => boolean;
  reducedMotion: boolean;
  /** Called after each frame that panned — the world moved under a still
      pointer, so the preview's cell needs recomputing. */
  onPan: () => void;
};

/**
 * Edge-scroll for carrying things around the Garden: while the pointer is
 * near an edge of the visible garden, the camera pans slowly that way,
 * faster the closer to the edge. A pointer beyond the edge (over the
 * tray, say) doesn't scroll — that's where a drop gets cancelled.
 */
export function useEdgeScroll({
  active,
  pointerRef,
  viewportRef,
  insetBottom,
  panBy,
  reducedMotion,
  onPan,
}: Options) {
  // Long-lived loop below reads the latest values from here.
  const latest = useRef({ insetBottom, panBy, reducedMotion, onPan });
  latest.current = { insetBottom, panBy, reducedMotion, onPan };

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let last = performance.now();

    // 0 outside the zone, 0..1 inside it (1 = right at the edge).
    const depth = (distance: number) =>
      distance < 0 || distance > EDGE_ZONE ? 0 : 1 - distance / EDGE_ZONE;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const pointer = pointerRef.current;
      const viewport = viewportRef.current;
      if (pointer && viewport) {
        const { insetBottom, panBy, reducedMotion, onPan } = latest.current;
        const rect = viewport.getBoundingClientRect();
        const bottom = rect.bottom - insetBottom;
        const inside =
          pointer.x >= rect.left &&
          pointer.x <= rect.right &&
          pointer.y >= rect.top &&
          pointer.y <= bottom;
        if (inside) {
          const dirX = depth(rect.right - pointer.x) - depth(pointer.x - rect.left);
          const dirY = depth(bottom - pointer.y) - depth(pointer.y - rect.top);
          const speed = (amount: number) =>
            reducedMotion
              ? Math.sign(amount) * STEADY_SPEED
              : Math.sign(amount) *
                (MIN_SPEED + (MAX_SPEED - MIN_SPEED) * amount * amount);
          if (dirX !== 0 || dirY !== 0) {
            const moved = panBy(speed(dirX) * dt, speed(dirY) * dt);
            if (moved) onPan();
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, pointerRef, viewportRef]);
}
