// The garden view in the studyroom window. Later the values can come from
// user settings: pass them to getStudyroomCamera as `base`.

// 1.0 = the old view (whole home garden + 1 cell margin fits exactly),
// higher = closer. Recommended range: 1.0–1.8.
// In development, ?zoom=1.4 in the URL overrides it (clamped to 0.8–2.5).
export const STUDYROOM_GARDEN_ZOOM = 1.25;

// Shift of the view in grid cells (not px; scaled with the real cell size
// and zoom in GardenScene). Positive = view further up (garden slides
// down), 0 = as before. ?offsetY=2 overrides it in development (-6…6).
export const STUDYROOM_GARDEN_OFFSET_Y = 2;

// Same for the horizontal axis. Positive = view further left (garden
// slides right). ?offsetX= overrides it in development (-6…6).
export const STUDYROOM_GARDEN_OFFSET_X = 0;

export type StudyroomCamera = { zoom: number; offsetX: number; offsetY: number };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function getStudyroomCamera(
  base: StudyroomCamera = {
    zoom: STUDYROOM_GARDEN_ZOOM,
    offsetX: STUDYROOM_GARDEN_OFFSET_X,
    offsetY: STUDYROOM_GARDEN_OFFSET_Y,
  },
  search?: string
): StudyroomCamera {
  const camera = { ...base };
  if (process.env.NODE_ENV === "production" || search === undefined) return camera;
  const params = new URLSearchParams(search);
  const read = (key: string, min: number, max: number) => {
    const raw = params.get(key);
    const value = raw === null || raw === "" ? NaN : Number(raw);
    return Number.isFinite(value) ? clamp(value, min, max) : null;
  };
  camera.zoom = read("zoom", 0.8, 2.5) ?? camera.zoom;
  camera.offsetX = read("offsetX", -6, 6) ?? camera.offsetX;
  camera.offsetY = read("offsetY", -6, 6) ?? camera.offsetY;
  return camera;
}
