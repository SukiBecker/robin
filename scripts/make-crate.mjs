// Studyroom Ambience crate: design-src/ui/crate.png (two states side by
// side: closed left, open right) → public/ui/crate-closed.webp and
// public/ui/crate-open.webp
//
//   node scripts/make-crate.mjs
//
// Same edge clean-up as scripts/make-nursery-assets.mjs (the painting has
// a faint halo and yellow/red pixels on its edges):
//   1. alpha < 16 → 0
//   2. edge pixels (alpha < 200) take the colour of the nearest solid
//      pixel within 6 px; without one they are dropped
// Then the sheet is split between the two crates, and both states are
// put on ONE canvas size, anchored at the box's bottom-left corner (its
// lowest row and leftmost column): stacked in CSS, the closed and the
// open crate stand on exactly the same spot, so a crossfade between
// them stays in place. The closed crate leaves the lid's room above it
// empty. Prints the sizes for components/studyroom/studyroom.module.css.

import sharp from "sharp";

const SRC = "design-src/ui/crate.png";
const OUT = "public/ui";
const HALO_ALPHA = 16;
const SOLID_ALPHA = 200;
const RADIUS = 6;
/** Output width of both WebPs (shown at ~5rem, so ≈ 3x). */
const OUT_WIDTH = 256;

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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
    if (best === null) out[i + 3] = 0;
    else {
      out[i] = px[best];
      out[i + 1] = px[best + 1];
      out[i + 2] = px[best + 2];
    }
  }
}

// Visible box of one half of the sheet.
function bbox(x0, x1) {
  let minX = x1, minY = H, maxX = x0, maxY = 0;
  for (let y = 0; y < H; y++) {
    for (let x = x0; x < x1; x++) {
      if (out[(y * W + x) * 4 + 3] === 0) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// The gap between the two crates (fully transparent columns).
let split = Math.floor(W / 2);
for (let x = Math.floor(W * 0.3); x < Math.floor(W * 0.7); x++) {
  let empty = true;
  for (let y = 0; y < H && empty; y++) if (out[(y * W + x) * 4 + 3] !== 0) empty = false;
  if (empty) {
    split = x;
    break;
  }
}

const closed = bbox(0, split);
const open = bbox(split, W);
const CW = Math.max(closed.w, open.w);
const CH = Math.max(closed.h, open.h);

const sheet = sharp(out, { raw: { width: W, height: H, channels: 4 } });
const webp = { quality: 88, alphaQuality: 95, effort: 6 };

for (const [name, b] of [
  ["crate-closed.webp", closed],
  ["crate-open.webp", open],
]) {
  const piece = await sheet
    .clone()
    .extract({ left: b.minX, top: b.minY, width: b.w, height: b.h })
    .png()
    .toBuffer();
  await sharp({
    create: { width: CW, height: CH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    // bottom-left anchored
    .composite([{ input: piece, left: 0, top: CH - b.h }])
    .png()
    .toBuffer()
    .then((buf) => sharp(buf).resize({ width: OUT_WIDTH }).webp(webp).toFile(`${OUT}/${name}`))
    .then((i) => console.log(`${name}: ${i.width} × ${i.height}, ${(i.size / 1024).toFixed(1)} KB`));
}

console.log(
  `split x ${split}; closed ${closed.w} × ${closed.h} at (${closed.minX}, ${closed.minY}); ` +
    `open ${open.w} × ${open.h} at (${open.minX}, ${open.minY}); canvas ${CW} × ${CH}; ` +
    `closed crate takes the bottom ${((closed.h / CH) * 100).toFixed(1)} % ` +
    `and the left ${((closed.w / CW) * 100).toFixed(1)} %`
);
