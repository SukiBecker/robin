"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import {
  centeredOn,
  clampCamera,
  DEFAULT_ZOOM_INDEX,
  easeOutBack,
  easeOutCubic,
  loadSavedCamera,
  rubberBandCamera,
  saveCamera,
  viewCenter,
  ZOOM_STEPS,
  type Camera,
  type Size,
} from "./camera";

/** Pointer travel (px) before a press counts as a drag rather than a click. */
const DRAG_THRESHOLD = 6;
/** Keyboard pan speed in screen px per second. */
const KEY_PAN_SPEED = 720;
/** Wheel delta (px) needed for one zoom step, and the pause after a step
    so one trackpad flick can't race through every step at once. */
const WHEEL_STEP_DELTA = 50;
const WHEEL_STEP_LOCK_MS = 380;
/** Pinch distance ratio needed for one zoom step. */
const PINCH_STEP_RATIO = 1.2;

const KEY_DIRECTIONS: Record<string, [number, number]> = {
  w: [0, -1],
  arrowup: [0, -1],
  s: [0, 1],
  arrowdown: [0, 1],
  a: [-1, 0],
  arrowleft: [-1, 0],
  d: [1, 0],
  arrowright: [1, 0],
};

export type CameraListener = (camera: Camera, viewport: Size) => void;

type Anchor = { px: number; py: number; wx: number; wy: number };

type Options = {
  viewportRef: RefObject<HTMLDivElement | null>;
  worldRef: RefObject<HTMLDivElement | null>;
  /** Canvas size in px at zoom 1 (everything the camera may show). */
  world: Size;
  /** Canvas point (px at zoom 1) the camera starts on and Center flies to. */
  home: { x: number; y: number };
  /** False until both refs are mounted (the page renders the world only
      once the garden has loaded). */
  ready: boolean;
  /** Screen px at the bottom covered by UI (the edit-mode inventory
      tray). The world may then scroll that much further up, so its last
      row never stays hidden under it. */
  insetBottom?: number;
};

/**
 * Pan/zoom camera for the Garden page. Writes the world's transform
 * straight to the DOM every frame (no React re-render per frame) and
 * tells subscribers (the mini-map) about each change.
 *
 * Under prefers-reduced-motion every animated move becomes an instant
 * jump and dragging stops hard at the edge instead of rubber-banding.
 */
export function useGardenCamera({
  viewportRef,
  worldRef,
  world,
  home,
  ready,
  insetBottom = 0,
}: Options) {
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const zoomIndexRef = useRef(DEFAULT_ZOOM_INDEX);
  const camRef = useRef<Camera>({ x: 0, y: 0, zoom: ZOOM_STEPS[DEFAULT_ZOOM_INDEX] });
  const viewportSizeRef = useRef<Size>({ width: 0, height: 0 });
  const initializedRef = useRef(false);
  const listenersRef = useRef(new Set<CameraListener>());
  const animFrameRef = useRef<number | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);

  // Kept in refs so the long-lived listeners below always see the latest.
  const worldSizeRef = useRef(world);
  worldSizeRef.current = world;
  const homeRef = useRef(home);
  homeRef.current = home;
  const insetsRef = useRef({ bottom: insetBottom });

  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const dragRef = useRef<{
    startX: number;
    startY: number;
    cam: Camera;
    dragging: boolean;
  } | null>(null);
  const pinchRef = useRef<{ distance: number; midX: number; midY: number } | null>(null);
  /** Set once a press turns into a drag/pinch, so the click that follows
      the release doesn't also place or remove something. */
  const didDragRef = useRef(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = query.matches;
    const onChange = () => (reducedMotionRef.current = query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      const center = viewCenter(camRef.current, viewportSizeRef.current);
      saveCamera({ centerX: center.x, centerY: center.y, zoomIndex: zoomIndexRef.current });
    }, 400);
  }, []);

  const apply = useCallback(
    (cam: Camera) => {
      camRef.current = cam;
      const el = worldRef.current;
      if (el) {
        el.style.transform = `translate3d(${cam.x}px, ${cam.y}px, 0) scale(${cam.zoom})`;
      }
      listenersRef.current.forEach((listener) => listener(cam, viewportSizeRef.current));
      scheduleSave();
    },
    [worldRef, scheduleSave]
  );

  const clamp = useCallback(
    (cam: Camera) =>
      clampCamera(cam, viewportSizeRef.current, worldSizeRef.current, insetsRef.current),
    []
  );

  const stopAnimation = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  /** Animates to `target`. With an anchor, the anchored world point stays
      under its screen point the whole way (zooming toward the cursor),
      and only the edge-clamp correction is blended in on top. */
  const animateTo = useCallback(
    (target: Camera, duration: number, ease: (t: number) => number, anchor?: Anchor) => {
      stopAnimation();
      if (reducedMotionRef.current || duration <= 0) {
        apply(target);
        return;
      }
      const from = camRef.current;
      const start = performance.now();
      const correctionX = anchor ? target.x - (anchor.px - anchor.wx * target.zoom) : 0;
      const correctionY = anchor ? target.y - (anchor.py - anchor.wy * target.zoom) : 0;

      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const e = ease(t);
        const zoom = from.zoom + (target.zoom - from.zoom) * Math.min(1, e);
        if (anchor) {
          apply({
            zoom,
            x: anchor.px - anchor.wx * zoom + correctionX * e,
            y: anchor.py - anchor.wy * zoom + correctionY * e,
          });
        } else {
          apply({
            zoom,
            x: from.x + (target.x - from.x) * e,
            y: from.y + (target.y - from.y) * e,
          });
        }
        animFrameRef.current = t < 1 ? requestAnimationFrame(tick) : null;
      };
      animFrameRef.current = requestAnimationFrame(tick);
    },
    [apply, stopAnimation]
  );

  const setZoom = useCallback((index: number) => {
    zoomIndexRef.current = index;
    setZoomIndex(index);
  }, []);

  /** One zoom step in `direction`, centered on screen point (px, py)
      (relative to the viewport). */
  const stepZoom = useCallback(
    (direction: 1 | -1, px: number, py: number) => {
      const nextIndex = zoomIndexRef.current + direction;
      if (ZOOM_STEPS[nextIndex] === undefined) return;
      const cam = camRef.current;
      const anchor: Anchor = {
        px,
        py,
        wx: (px - cam.x) / cam.zoom,
        wy: (py - cam.y) / cam.zoom,
      };
      const nextZoom = ZOOM_STEPS[nextIndex];
      const target = clamp({
        zoom: nextZoom,
        x: px - anchor.wx * nextZoom,
        y: py - anchor.wy * nextZoom,
      });
      setZoom(nextIndex);
      animateTo(target, 280, easeOutCubic, anchor);
    },
    [animateTo, clamp, setZoom]
  );

  /** Animated flight that centers world point (wx, wy). */
  const flyTo = useCallback(
    (wx: number, wy: number, zoomIdx = zoomIndexRef.current, duration = 450) => {
      setZoom(zoomIdx);
      const target = clamp(centeredOn(wx, wy, ZOOM_STEPS[zoomIdx], viewportSizeRef.current));
      animateTo(target, duration, easeOutCubic);
    },
    [animateTo, clamp, setZoom]
  );

  // A tray opening/closing changes how far the world may scroll: glide
  // back inside the new bounds (only if the view now sits outside them).
  useEffect(() => {
    insetsRef.current = { bottom: insetBottom };
    if (!initializedRef.current) return;
    const target = clamp(camRef.current);
    if (target.x !== camRef.current.x || target.y !== camRef.current.y) {
      animateTo(target, 320, easeOutCubic);
    }
  }, [insetBottom, clamp, animateTo]);

  const centerOnHome = useCallback(() => {
    flyTo(homeRef.current.x, homeRef.current.y, DEFAULT_ZOOM_INDEX, 650);
  }, [flyTo]);

  /** Inverse of the camera transform: a client (screen) position ->
      canvas px at zoom 1. Used for click/drop positions, so placement
      never depends on the viewport size or the current zoom. */
  const screenToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const rect = viewportRef.current?.getBoundingClientRect();
      const cam = camRef.current;
      return {
        x: (clientX - (rect?.left ?? 0) - cam.x) / cam.zoom,
        y: (clientY - (rect?.top ?? 0) - cam.y) / cam.zoom,
      };
    },
    [viewportRef]
  );

  const subscribe = useCallback((listener: CameraListener) => {
    listenersRef.current.add(listener);
    if (initializedRef.current) listener(camRef.current, viewportSizeRef.current);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  // ---- initial placement + keep the view centered through resizes ----
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!ready || !viewport) return;

    const observer = new ResizeObserver(() => {
      const next = { width: viewport.clientWidth, height: viewport.clientHeight };
      if (!initializedRef.current) {
        viewportSizeRef.current = next;
        const saved = loadSavedCamera();
        const zoomIdx = saved?.zoomIndex ?? DEFAULT_ZOOM_INDEX;
        setZoom(zoomIdx);
        initializedRef.current = true;
        apply(
          clamp(
            centeredOn(
              saved?.centerX ?? homeRef.current.x,
              saved?.centerY ?? homeRef.current.y,
              ZOOM_STEPS[zoomIdx],
              next
            )
          )
        );
        return;
      }
      const center = viewCenter(camRef.current, viewportSizeRef.current);
      viewportSizeRef.current = next;
      stopAnimation();
      apply(clamp(centeredOn(center.x, center.y, camRef.current.zoom, next)));
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [ready, viewportRef, apply, clamp, setZoom, stopAnimation]);

  // ---- wheel zoom (native listener: React's onWheel is passive, so it
  // couldn't stop the page from scrolling) ----
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!ready || !viewport) return;

    let accumulated = 0;
    let lockedUntil = 0;
    let lastEvent = 0;

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const now = performance.now();
      if (now - lastEvent > 200) accumulated = 0;
      lastEvent = now;
      if (now < lockedUntil) return;

      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
      accumulated += event.deltaY * scale;
      if (Math.abs(accumulated) < WHEEL_STEP_DELTA) return;

      const rect = viewport!.getBoundingClientRect();
      stepZoom(accumulated < 0 ? 1 : -1, event.clientX - rect.left, event.clientY - rect.top);
      accumulated = 0;
      lockedUntil = now + WHEEL_STEP_LOCK_MS;
    }

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [ready, viewportRef, stepZoom]);

  // ---- WASD / arrow keys: continuous pan while held ----
  useEffect(() => {
    if (!ready) return;

    const pressed = new Set<string>();
    let frame: number | null = null;
    let last = 0;

    function isTyping(target: EventTarget | null) {
      const el = target as HTMLElement | null;
      return (
        !!el &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable)
      );
    }

    function loop(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let dx = 0;
      let dy = 0;
      pressed.forEach((key) => {
        dx += KEY_DIRECTIONS[key][0];
        dy += KEY_DIRECTIONS[key][1];
      });
      const length = Math.hypot(dx, dy) || 1;
      const cam = camRef.current;
      apply(
        clamp({
          zoom: cam.zoom,
          x: cam.x - (dx / length) * KEY_PAN_SPEED * dt,
          y: cam.y - (dy / length) * KEY_PAN_SPEED * dt,
        })
      );
      frame = pressed.size > 0 ? requestAnimationFrame(loop) : null;
    }

    function onKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (!(key in KEY_DIRECTIONS)) return;
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      event.preventDefault();
      pressed.add(key);
      if (frame === null) {
        stopAnimation();
        last = performance.now();
        frame = requestAnimationFrame(loop);
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      pressed.delete(event.key.toLowerCase());
    }

    function onBlur() {
      pressed.clear();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [ready, apply, clamp, stopAnimation]);

  useEffect(
    () => () => {
      stopAnimation();
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    },
    [stopAnimation]
  );

  // ---- drag + pinch (Pointer Events) ----

  function localPoint(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function pinchMetrics() {
    const [a, b] = [...pointersRef.current.values()];
    return {
      distance: Math.hypot(a.x - b.x, a.y - b.y),
      midX: (a.x + b.x) / 2,
      midY: (a.y + b.y) / 2,
    };
  }

  function startDragFrom(point: { x: number; y: number }, dragging: boolean) {
    dragRef.current = { startX: point.x, startY: point.y, cam: camRef.current, dragging };
  }

  /** Snap back inside the world after a rubber-banded release. */
  function settle() {
    const target = clamp(camRef.current);
    const cam = camRef.current;
    if (target.x !== cam.x || target.y !== cam.y) {
      animateTo(target, 420, easeOutBack);
    }
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    stopAnimation();
    const point = localPoint(event);
    pointersRef.current.set(event.pointerId, point);

    if (pointersRef.current.size === 1) {
      didDragRef.current = false;
      startDragFrom(point, false);
    } else if (pointersRef.current.size === 2) {
      didDragRef.current = true;
      dragRef.current = null;
      pinchRef.current = pinchMetrics();
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(event.pointerId)) return;
    const point = localPoint(event);
    pointersRef.current.set(event.pointerId, point);

    const pinch = pinchRef.current;
    if (pinch && pointersRef.current.size === 2) {
      const next = pinchMetrics();
      // Two-finger pan follows the midpoint — skipped while a zoom step
      // is still animating, so the two don't fight over the camera.
      if (animFrameRef.current === null) {
        const cam = camRef.current;
        apply(clamp({ ...cam, x: cam.x + next.midX - pinch.midX, y: cam.y + next.midY - pinch.midY }));
      }
      pinch.midX = next.midX;
      pinch.midY = next.midY;
      const ratio = next.distance / pinch.distance;
      if (ratio > PINCH_STEP_RATIO || ratio < 1 / PINCH_STEP_RATIO) {
        stepZoom(ratio > 1 ? 1 : -1, next.midX, next.midY);
        pinch.distance = next.distance;
      }
      return;
    }

    const drag = dragRef.current;
    if (!drag) return;
    const dx = point.x - drag.startX;
    const dy = point.y - drag.startY;
    if (!drag.dragging) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      drag.dragging = true;
      didDragRef.current = true;
      // Captured only once it's really a drag: capturing on pointerdown
      // would retarget the click of a plain tap away from the object.
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.dragging = "true";
    }
    const raw = { zoom: drag.cam.zoom, x: drag.cam.x + dx, y: drag.cam.y + dy };
    apply(
      reducedMotionRef.current
        ? clamp(raw)
        : rubberBandCamera(raw, viewportSizeRef.current, worldSizeRef.current, insetsRef.current)
    );
  }

  function onPointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.delete(event.pointerId)) return;
    delete event.currentTarget.dataset.dragging;

    if (pointersRef.current.size === 1) {
      // Pinch -> one finger left: keep panning from where it is now.
      pinchRef.current = null;
      startDragFrom([...pointersRef.current.values()][0], true);
      return;
    }
    if (pointersRef.current.size === 0) {
      pinchRef.current = null;
      dragRef.current = null;
      if (animFrameRef.current === null) settle();
    }
  }

  function onClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!didDragRef.current) return;
    didDragRef.current = false;
    event.stopPropagation();
    event.preventDefault();
  }

  return {
    zoomIndex,
    centerOnHome,
    flyTo,
    screenToCanvas,
    subscribe,
    viewportHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
      onClickCapture,
    },
  };
}
