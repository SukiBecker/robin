// Studyroom vine (VineProgress): design-src/ui/vine-*.png →
// public/ui/vine-vertical.webp, vine-horizontal.webp, vine-corner.webp,
// vine-bloom-1|2|3.webp
//
//   node scripts/make-vine-assets.mjs
//
// Same edge clean-up as scripts/make-nursery-assets.mjs (alpha < 16 → 0,
// edge pixels take the colour of the nearest solid pixel within 6 px).
//
// Seamless tiles: the paintings are long strips, not tiles. Each tile is
// cut between two rows (columns) where only the stem passes — no leaf
// crosses them — and where the stem sits at the same place with the same
// slope, found by measuring the stem in every row (see CUTS). So the end
// of one tile runs on into the start of the next without a visible joint
// and no leaf is ever cut in half.
//
// The corner joins both: its lower arm is cut at a stem-only row and
// lengthened with a short piece of the vertical painting (BRIDGE) that
// ends exactly where the vertical tile starts, so corner → post is the
// painting's own continuation. Its upper arm is cut at a stem-only column
// whose stem matches the horizontal tile's first column.
//
// Prints the numbers for components/studyroom/vine-progress.module.css.
// All of them are in corner-painting pixels ("src"); the CSS turns
// them into lengths with --vine-px (= --vine-w / tile width).

import sharp from "sharp";

const SRC = "design-src/ui";
const OUT = "public/ui";
const HALO_ALPHA = 16;
const SOLID_ALPHA = 200;
const RADIUS = 6;
/** Output scale (source px → file px). The vine is shown at 2.5rem wide
    on desktop, so the files are ≈ 2.5x. */
const SCALE = 0.4;

/** Tile cuts, found by measuring the stem row by row (stem-only rows,
    stem edges within 1–2 px over ±2 rows). */
const CUTS = {
  vertical: { from: 262, to: 1526 }, // rows
  horizontal: { from: 821, to: 1894 }, // columns
};
/** Corner: lower arm cut at row 765 (stem x 303.5, slope +0.25 px/row);
    vertical rows 147–261 follow (stem x 504.5 at row 147, same slope) and
    end where the vertical tile starts. Upper arm cut at column 1123. */
const CORNER = { bottom: 765, right: 1123 };
const BRIDGE = { from: 147, to: 262 };

const webp = { quality: 90, alphaQuality: 95, effort: 6 };

/** The three paintings are not drawn at the same size: measured by the
    median leaf (flood fill over the leaf-green pixels), the vertical
    painting's leaves are 60 px, the horizontal one's 81 px, the corner's
    87 px. Each is scaled to the corner's size first, so the leaves match
    where the pieces meet. Cut positions below are in the original
    paintings and scaled with them. */
const PRESCALE = { vertical: 87 / 60, horizontal: 87 / 81, corner: 1 };

async function load(file, scale = 1) {
  const meta = await sharp(`${SRC}/${file}`).metadata();
  const { data, info } = await sharp(`${SRC}/${file}`)
    .resize({ width: Math.round(meta.width * scale), kernel: "lanczos3" })
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
      if (best === null) out[i + 3] = 0;
      else {
        out[i] = px[best];
        out[i + 1] = px[best + 1];
        out[i + 2] = px[best + 2];
      }
    }
  }
  return { px: out, W, H };
}

const alphaAt = (img, x, y) => img.px[(y * img.W + x) * 4 + 3];

/** Centre of the stem (brown, not leaf-green) in one row or column. */
function stemCentre(img, axis, at) {
  let sum = 0;
  let n = 0;
  const len = axis === "row" ? img.W : img.H;
  for (let k = 0; k < len; k++) {
    const [x, y] = axis === "row" ? [k, at] : [at, k];
    const i = (y * img.W + x) * 4;
    const [r, g, a] = [img.px[i], img.px[i + 1], img.px[i + 3]];
    if (a < 128) continue;
    if (g > r + 10) throw new Error(`leaf at ${axis} ${at} (${x}, ${y}) — not a clean cut`);
    sum += k;
    n++;
  }
  if (!n) throw new Error(`no stem at ${axis} ${at}`);
  return sum / n;
}

/** Copies a rectangle of `src` into `dst` at (dx, dy), over what is there. */
function blit(src, sx, sy, w, h, dst, dx, dy) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tx = dx + x;
      const ty = dy + y;
      if (tx < 0 || ty < 0 || tx >= dst.W || ty >= dst.H) continue;
      const si = ((sy + y) * src.W + sx + x) * 4;
      if (src.px[si + 3] === 0) continue;
      const di = (ty * dst.W + tx) * 4;
      src.px.copy(dst.px, di, si, si + 4);
    }
  }
}

const blank = (W, H) => ({ px: Buffer.alloc(W * H * 4), W, H });

async function save(img, name, outW, outH) {
  const info = await sharp(img.px, { raw: { width: img.W, height: img.H, channels: 4 } })
    .resize({ width: outW, height: outH, fit: "fill", kernel: "lanczos3" })
    .webp(webp)
    .toFile(`${OUT}/${name}`);
  console.log(`${name}: ${info.width} × ${info.height}, ${(info.size / 1024).toFixed(1)} KB`);
}

// ── Vertical tile ────────────────────────────────────────────────────────
const vert = await load("vine-vertical.png", PRESCALE.vertical);
const [v0, v1] = [CUTS.vertical.from, CUTS.vertical.to].map((v) =>
  Math.round(v * PRESCALE.vertical)
);
const vStem0 = stemCentre(vert, "row", v0);
const vStem1 = stemCentre(vert, "row", v1);
// Half width: the farthest leaf from the stem inside the tile.
let vHalf = 0;
for (let y = v0; y < v1; y++)
  for (let x = 0; x < vert.W; x++)
    if (alphaAt(vert, x, y)) vHalf = Math.max(vHalf, Math.abs(x - vStem0));
vHalf = Math.ceil(vHalf) + 2;
const vCx = Math.round(vStem0);
const VW = vHalf * 2;
const VH = v1 - v0;
const vTile = blank(VW, VH);
blit(vert, vCx - vHalf, v0, VW, VH, vTile, 0, 0);
await save(vTile, "vine-vertical.webp", Math.round(VW * SCALE), Math.round(VH * SCALE));

// ── Horizontal tile ──────────────────────────────────────────────────────
const hor = await load("vine-horizontal 18.15.42.png", PRESCALE.horizontal);
const [h0, h1] = [CUTS.horizontal.from, CUTS.horizontal.to].map((v) =>
  Math.round(v * PRESCALE.horizontal)
);
const hStem0 = stemCentre(hor, "col", h0);
const hStem1 = stemCentre(hor, "col", h1);
let hHalf = 0;
for (let x = h0; x < h1; x++)
  for (let y = 0; y < hor.H; y++)
    if (alphaAt(hor, x, y)) hHalf = Math.max(hHalf, Math.abs(y - hStem0));
hHalf = Math.ceil(hHalf) + 2;
const hCy = Math.round(hStem0);
const HW = h1 - h0;
const HH = hHalf * 2;
const hTile = blank(HW, HH);
blit(hor, h0, hCy - hHalf, HW, HH, hTile, 0, 0);
await save(hTile, "vine-horizontal.webp", Math.round(HW * SCALE), Math.round(HH * SCALE));

// ── Corner (+ bridge from the vertical painting) ─────────────────────────
const corner = await load("vine-corner.png");
const cStemBottom = stemCentre(corner, "row", CORNER.bottom);
const cStemRight = stemCentre(corner, "col", CORNER.right);
const [b0, b1] = [BRIDGE.from, BRIDGE.to].map((v) => Math.round(v * PRESCALE.vertical));
const bStemTop = stemCentre(vert, "row", b0);
// Visible part of the corner above/left of the cuts.
let cMinX = corner.W;
let cMinY = corner.H;
for (let y = 0; y <= CORNER.bottom; y++)
  for (let x = 0; x <= CORNER.right; x++)
    if (alphaAt(corner, x, y)) {
      cMinX = Math.min(cMinX, x);
      cMinY = Math.min(cMinY, y);
    }
// The bridge's pieces, shifted so its stem meets the corner's at the cut.
const bShift = Math.round(cStemBottom - bStemTop);
let bMinX = Infinity;
let bMaxX = 0;
for (let y = b0; y < b1; y++)
  for (let x = 0; x < vert.W; x++)
    if (alphaAt(vert, x, y)) {
      bMinX = Math.min(bMinX, x + bShift);
      bMaxX = Math.max(bMaxX, x + bShift);
    }
const left = Math.min(cMinX, bMinX);
const CW = CORNER.right + 1 - left;
const bridgeH = b1 - b0;
const CH = CORNER.bottom + 1 - cMinY + bridgeH;
const cImg = blank(CW, CH);
blit(corner, left, cMinY, CW, CORNER.bottom + 1 - cMinY, cImg, 0, 0);
blit(vert, 0, b0, vert.W, bridgeH, cImg, bShift - left, CORNER.bottom + 1 - cMinY);
await save(cImg, "vine-corner.webp", Math.round(CW * SCALE), Math.round(CH * SCALE));
// Where the vertical tile's stem comes in at the bottom, and the
// horizontal tile's stem at the right (corner coordinates).
const cornerStemX = vStem0 + bShift - left;
const cornerStemY = cStemRight - cMinY;

// ── Blooms (three on one sheet, split at empty columns) ──────────────────
const bloom = await load("vine-bloom.png");
const filled = [];
for (let x = 0; x < bloom.W; x++) {
  let any = false;
  for (let y = 0; y < bloom.H && !any; y++) if (alphaAt(bloom, x, y)) any = true;
  filled.push(any);
}
const runs = [];
for (let x = 0; x < bloom.W; x++) {
  if (filled[x] && (x === 0 || !filled[x - 1])) runs.push({ x0: x });
  if (filled[x] && (x === bloom.W - 1 || !filled[x + 1])) runs.at(-1).x1 = x;
}
const blooms = runs.filter((r) => r.x1 - r.x0 > 100);
if (blooms.length !== 3) throw new Error(`expected 3 blooms, found ${blooms.length}`);
for (const [i, r] of blooms.entries()) {
  let y0 = bloom.H;
  let y1 = 0;
  for (let y = 0; y < bloom.H; y++)
    for (let x = r.x0; x <= r.x1; x++)
      if (alphaAt(bloom, x, y)) {
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  const w = r.x1 - r.x0 + 1;
  const h = y1 - y0 + 1;
  const img = blank(w, h);
  blit(bloom, r.x0, y0, w, h, img, 0, 0);
  // Stem base = lowest opaque pixel, as a share of the box (transform-origin).
  let baseX = 0;
  let n = 0;
  for (let x = 0; x < w; x++)
    if (alphaAt(img, x, h - 1) || alphaAt(img, x, h - 2)) {
      baseX += x;
      n++;
    }
  baseX /= n;
  await save(img, `vine-bloom-${i + 1}.webp`, Math.round(w * 0.3), Math.round(h * 0.3));
  console.log(`  bloom ${i + 1}: ${w} × ${h} src, base at ${((baseX / w) * 100).toFixed(1)} % 100 %`);
}

console.log(`
vertical tile   ${VW} × ${VH} src (stem x ${vStem0.toFixed(1)} → ${vStem1.toFixed(1)} at the seam, centre ${vHalf})
horizontal tile ${HW} × ${HH} src (stem y ${hStem0.toFixed(1)} → ${hStem1.toFixed(1)} at the seam, centre ${hHalf})
corner          ${CW} × ${CH} src; stem enters bottom at x ${cornerStemX.toFixed(1)}, right at y ${cornerStemY.toFixed(1)}
`);
