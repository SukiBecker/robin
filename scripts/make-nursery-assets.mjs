// Nursery UI assets: design-src/ui/*.png → public/ui/*.webp
//
//   node scripts/make-nursery-assets.mjs
//
// The painted PNGs carry a wide, almost invisible halo (alpha 1–15) and,
// right at the edge, single pixels in pure yellow/red. Both show as a
// yellow-red seam on paper, and the warm drop-shadow filters amplify it.
// So, per asset:
//   1. alpha < 16 → 0 (removes the halo and the stray pixels)
//   2. every remaining edge pixel (alpha < 200) takes the colour of the
//      nearest solid pixel (alpha ≥ 200) within 6 px — the antialiasing
//      stays, only the colour fringe goes; edge pixels without a solid
//      neighbour are dropped
//   3. trim to the visible box, resize, WebP
// The shelf plank is also cut into a 3-slice (left end with bracket,
// stretchable middle, right end with bracket). Measurements are printed
// for the CSS (components/nursery/*.module.css).

import sharp from "sharp";

const SRC = "design-src/ui";
const OUT = "public/ui";
const HALO_ALPHA = 16;
const SOLID_ALPHA = 200;
const RADIUS = 6;

async function clean(file) {
  const { data, info } = await sharp(`${SRC}/${file}`)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const px = Buffer.from(data);

  for (let i = 0; i < W * H; i++) if (px[i * 4 + 3] < HALO_ALPHA) px[i * 4 + 3] = 0;

  const solid = (x, y) => px[(y * W + x) * 4 + 3] >= SOLID_ALPHA;
  const out = Buffer.from(px);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const a = px[i + 3];
      if (a === 0 || a >= SOLID_ALPHA) continue;
      let best = null;
      let bestD = Infinity;
      for (let dy = -RADIUS; dy <= RADIUS; dy++) {
        for (let dx = -RADIUS; dx <= RADIUS; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || !solid(nx, ny)) continue;
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = (ny * W + nx) * 4;
          }
        }
      }
      if (best === null) {
        out[i + 3] = 0;
      } else {
        out[i] = px[best];
        out[i + 1] = px[best + 1];
        out[i + 2] = px[best + 2];
      }
    }
  }

  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (out[(y * W + x) * 4 + 3] === 0) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  const box = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  const image = sharp(out, { raw: { width: W, height: H, channels: 4 } }).extract(box);
  return { image, box };
}

const webp = { quality: 88, alphaQuality: 95, effort: 6 };

async function save(pipeline, name) {
  const info = await pipeline.webp(webp).toFile(`${OUT}/${name}`);
  console.log(`${name}: ${info.width}×${info.height}, ${(info.size / 1024).toFixed(1)} KB`);
  return info;
}

// ---- shelf plank: 3-slice ----------------------------------------------
{
  const { image, box } = await clean("shelf-plank.png");
  // Brackets sit at x 146–266 and 1905–2022 of the original; cut with
  // some grain to spare, so each end holds its bracket completely.
  const CUT_LEFT = 300 - box.left;
  const CUT_RIGHT = 1870 - box.left;
  const HEIGHT = 128; // output px (≈ 3.5× the 2.25rem on screen)
  const scale = HEIGHT / box.height;
  const buf = await image.resize({ height: HEIGHT }).png().toBuffer();
  const { width } = await sharp(buf).metadata();
  const left = Math.round(CUT_LEFT * scale);
  const right = Math.round(CUT_RIGHT * scale);
  await save(sharp(buf).extract({ left: 0, top: 0, width: left, height: HEIGHT }), "shelf-plank-left.webp");
  await save(sharp(buf).extract({ left, top: 0, width: right - left, height: HEIGHT }), "shelf-plank-middle.webp");
  await save(sharp(buf).extract({ left: right, top: 0, width: width - right, height: HEIGHT }), "shelf-plank-right.webp");
  console.log(
    `  plank: trimmed ${box.width}×${box.height} (from x ${box.left}, y ${box.top}); ` +
      `board top y ${253 - box.top}, board bottom y ${412 - box.top}; ` +
      `ends ${left} / ${width - right} of ${width} px at ${HEIGHT} px height`
  );
}

// ---- plant stake ---------------------------------------------------------
{
  const { image, box } = await clean("plant-stake.png");
  const info = await save(image.clone().resize({ width: 256 }), "plant-stake.webp");
  // Board measured on the original: x 65–821, y 251–679.
  const s = info.width / box.width;
  console.log(
    `  stake: trimmed ${box.width}×${box.height} (from x ${box.left}, y ${box.top}); ` +
      `board x ${((65 - box.left) * s).toFixed(1)}–${((821 - box.left) * s).toFixed(1)}, ` +
      `y ${((251 - box.top) * s).toFixed(1)}–${((679 - box.top) * s).toFixed(1)} of ${info.width}×${info.height}`
  );
}

// ---- wax seal ------------------------------------------------------------
{
  const { image, box } = await clean("wax-seal.png");
  // A touch darker (sRGB × 0.94) so cream text in the well clears 4.5:1
  // everywhere, also on the lighter upper-left of the well.
  const info = await save(
    image.clone().resize({ width: 192 }).linear(0.94, 0),
    "wax-seal.webp"
  );
  // Well (inner hollow) measured on the original: centre ≈ (622, 598),
  // inner diameter ≈ 650 px including its shadow ring.
  const s = info.width / box.width;
  console.log(
    `  seal: trimmed ${box.width}×${box.height} (from x ${box.left}, y ${box.top}); ` +
      `well centre ${(((622 - box.left) / box.width) * 100).toFixed(1)}% / ` +
      `${(((598 - box.top) / box.height) * 100).toFixed(1)}%, ` +
      `diameter ${((650 / box.width) * 100).toFixed(1)}% of width (${(650 * s).toFixed(0)} px)`
  );
}

// ---- luggage tag (same cleanup as above) ----------------------------------
{
  const { image } = await clean("luggage-tag.png");
  await save(image.resize({ width: 640 }), "luggage-tag.webp");
}
