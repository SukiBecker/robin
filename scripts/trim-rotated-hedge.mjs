// Crops the sideways hedge art (public/garden/items/hedge-rotated.png) to
// the plant itself: the source is a 1536x1024 canvas with the hedge as a
// narrow strip in the middle, so drawn at any width the plant came out
// tiny inside a mostly transparent box. The original stays untouched.
//
// After trimming, the same thin transparent margin the upright hedge art
// (hedge-3.png: 7px around a 386px-wide plant, 6px at the bottom) has is
// added back, so plant-to-box proportions match and both hedges fill
// their footprints the same way.
//
//   node scripts/trim-rotated-hedge.mjs

import sharp from "sharp";

const SOURCE = "public/garden/items/hedge-rotated.png";
const TARGET = "public/garden/items/hedge-rotated-trim.png";

// Trims away pixels close to the top-left one — the fully transparent
// background — leaving the plant's bounding box.
const trimmed = await sharp(SOURCE).trim({ threshold: 10 }).toBuffer();

const info = await sharp(trimmed)
  .extend({
    top: 7,
    left: 7,
    right: 7,
    bottom: 6,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile(TARGET);

console.log(`${TARGET}: ${info.width}x${info.height}`);
