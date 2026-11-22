/**
 * Pure camera math for the Garden page's pannable world — no React, no
 * DOM. The camera is the screen-space offset of the world's top-left
 * corner (x, y) plus a zoom factor, applied as
 * `translate(x, y) scale(zoom)` with transform-origin 0 0.
 */

export const ZOOM_STEPS = [0.75, 1, 1.25] as const;
export const DEFAULT_ZOOM_INDEX = 1;

/** How far (screen px) a drag can pull past the world edge at most. */
const RUBBER_BAND_MAX = 90;

/** Whether a drag may stretch past the edge with resistance (and snap
    back on release). Off: the view stops hard at the garden's edge. The
    code stays so the feel can be compared again later. */
export const RUBBER_BAND_ENABLED = false;

export type Camera = { x: number; y: number; zoom: number };
export type Size = { width: number; height: number };
/** A rectangle in canvas px at zoom 1 — the part the camera may show. */
export type Bounds = { x: number; y: number; width: number; height: number };

/** Allowed camera range for one axis. `start`/`size` are the bounds in
    screen px at the current zoom. `insetEnd` (screen px) is covered by UI
    at the far end (the edit-mode inventory tray at the bottom), so the
    world may scroll that much further — its last row can come out from
    under it. Bounds smaller than the visible part (zoomed out on a very
    large screen) are centered in it instead. */
function axisRange(
  viewport: number,
  start: number,
  size: number,
  insetEnd = 0
): [number, number] {
  const visible = viewport - insetEnd;
  if (size <= visible) {
    const centered = (visible - size) / 2 - start;
    return [centered, centered];
  }
  return [visible - start - size, -start];
}

/** Screen px covered by overlaid UI, per side (currently only bottom). */
export type CameraInsets = { bottom: number };

export function clampCamera(
  cam: Camera,
  viewport: Size,
  bounds: Bounds,
  insets: CameraInsets = { bottom: 0 }
): Camera {
  const z = cam.zoom;
  const [minX, maxX] = axisRange(viewport.width, bounds.x * z, bounds.width * z);
  const [minY, maxY] = axisRange(
    viewport.height,
    bounds.y * z,
    bounds.height * z,
    insets.bottom
  );
  return {
    zoom: cam.zoom,
    x: Math.min(maxX, Math.max(minX, cam.x)),
    y: Math.min(maxY, Math.max(minY, cam.y)),
  };
}

/** Diminishing-returns resistance: the further past the edge, the less
    each extra pixel of drag moves the world, never past RUBBER_BAND_MAX. */
function rubberBand(overshoot: number): number {
  const sign = Math.sign(overshoot);
  const distance = Math.abs(overshoot);
  return sign * RUBBER_BAND_MAX * (1 - 1 / (distance / RUBBER_BAND_MAX / 1.6 + 1));
}

/** clampCamera, but letting a drag stretch past the edge with resistance. */
export function rubberBandCamera(
  cam: Camera,
  viewport: Size,
  bounds: Bounds,
  insets?: CameraInsets
): Camera {
  const clamped = clampCamera(cam, viewport, bounds, insets);
  return {
    zoom: cam.zoom,
    x: clamped.x + rubberBand(cam.x - clamped.x),
    y: clamped.y + rubberBand(cam.y - clamped.y),
  };
}

/** The camera that puts world point (wx, wy) at the viewport's center. */
export function centeredOn(wx: number, wy: number, zoom: number, viewport: Size): Camera {
  return { zoom, x: viewport.width / 2 - wx * zoom, y: viewport.height / 2 - wy * zoom };
}

/** The world point currently at the viewport's center. */
export function viewCenter(cam: Camera, viewport: Size): { x: number; y: number } {
  return {
    x: (viewport.width / 2 - cam.x) / cam.zoom,
    y: (viewport.height / 2 - cam.y) / cam.zoom,
  };
}

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
/** Slight overshoot, for the rubber band snapping back. */
export const easeOutBack = (t: number) => {
  const c = 1.2;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

// ---- persistence ----
// Stored as the world point at the viewport's center (not the raw
// translate), so a restore still lands on the same spot after the window
// changed size. Browser storage can be missing or throw (private mode,
// blocked site data) — the camera then just starts at home.

const STORAGE_KEY = "robin.garden.camera.v2";

export type SavedCamera = { centerX: number; centerY: number; zoomIndex: number };

export function loadSavedCamera(): SavedCamera | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedCamera>;
    if (
      typeof parsed.centerX !== "number" ||
      typeof parsed.centerY !== "number" ||
      typeof parsed.zoomIndex !== "number" ||
      !Number.isFinite(parsed.centerX) ||
      !Number.isFinite(parsed.centerY) ||
      ZOOM_STEPS[parsed.zoomIndex] === undefined
    ) {
      return null;
    }
    return parsed as SavedCamera;
  } catch {
    return null;
  }
}

export function saveCamera(saved: SavedCamera): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Storage unavailable — the camera just won't be remembered.
  }
}
