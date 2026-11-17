/**
 * English names of the places (robin-design §10: all UI text in English).
 * worlds.name in the database is partly German ("Garten", "Berge"), so the
 * Journal names a place by its slug and falls back to worlds.name only for
 * a slug it doesn't know yet.
 */
const PLACE_NAMES: Record<string, string> = {
  garden: "The Garden",
  beach: "Beach",
  mountains: "Mountains",
  desert: "Desert",
  arctic: "Arctic",
  jungle: "Jungle",
  "japanese-garden": "Japanese Garden",
  japanese_garden: "Japanese Garden",
  fantasy: "Fantasy",
};

export function placeName(slug: string, fallback: string): string {
  return PLACE_NAMES[slug] ?? fallback;
}

export type Place = {
  id: number;
  slug: string;
  name: string;
  unlockLevel: number;
};

/**
 * Picture in a place's postage stamp until painted stamp art exists: a
 * plant typical of the place (final growth stage). Places without one get
 * an empty window.
 */
const PLACE_MOTIFS: Record<string, string> = {
  garden: "/garden/items/rose-3.png",
};

export function placeMotif(slug: string): string | undefined {
  return PLACE_MOTIFS[slug];
}
