// Cuts the Studyroom's place assets out of the painted sources in
// design-src/ui/ and writes WebPs to public/ui/ (plan:
// docs/studyroom-pflanztisch-plan.md, "Fenster und Fensterbrett zerlegen").
//
//   node scripts/make-studyroom-wood.mjs
//
// Sources (measured on the originals):
//   wood-bench.png 1672x941  window frame + sill. Top rail y 83–150 over
//     x 135–1536; posts x 135–197 / 1474–1536 down to y 696; sill: back
//     plank y 696–736, front plank y 737–776, front board + apron y 777–855
//     (x 88–1583). The sill's top surface is drawn in perspective with
//     slanted ends (y 697–780) — those ends are NOT used; see the plan.
//   slate-frame.png 1448x1086  mitred frame x 66–1381, y 112–976; sides 91 px,
//     top/bottom 84 px.
//   slate.png 1254x1254  slate surface (opaque).
//   pebble.png 1254x1254  pebble x 347–940, y 405–847.
//
// Repeated pieces are made seamless by cross-fading their ends (no
// stretching). Everything else is cropped as painted.

import sharp from "sharp";

const OUT = "public/ui";

async function raw(src, region) {
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .extract(region)
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

/** Seamless along one axis: the last `band` px are cross-faded into the
    start, the result is `band` px shorter and wraps without a seam. */
function seamless({ data, w, h }, axis, band) {
  const ow = axis === "x" ? w - band : w;
  const oh = axis === "y" ? h - band : h;
  const out = Buffer.alloc(ow * oh * 4);
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const o = (y * ow + x) * 4;
      const p = axis === "x" ? x : y;
      const a = (y * w + x) * 4;
      if (p < band) {
        const t = p / band;
        const b = axis === "x" ? (y * w + x + ow) * 4 : ((y + oh) * w + x) * 4;
        for (let c = 0; c < 4; c++) out[o + c] = Math.round(data[b + c] * (1 - t) + data[a + c] * t);
      } else {
        for (let c = 0; c < 4; c++) out[o + c] = data[a + c];
      }
    }
  }
  return { data: out, w: ow, h: oh };
}

const img = (p) => sharp(p.data, { raw: { width: p.w, height: p.h, channels: 4 } });

async function save(piece, name, opts = {}) {
  let s = img(piece);
  if (opts.width) s = s.resize({ width: opts.width });
  await s.webp({ quality: 88, alphaQuality: 100 }).toFile(`${OUT}/${name}`);
  const meta = await sharp(`${OUT}/${name}`).metadata();
  console.log(`${name}  ${meta.width}x${meta.height}`);
}

/** Lay pieces onto one transparent canvas (for 9-slice images). */
async function compose(w, h, parts) {
  return sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(
      await Promise.all(
        parts.map(async ([p, left, top]) => ({
          input: await img(p).png().toBuffer(),
          left,
          top,
        })),
      ),
    )
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => ({ data, w: info.width, h: info.height }));
}

// ---------- window frame: 9-slice, top / left / right, no bottom ----------
{
  const SRC = "design-src/ui/wood-bench.png";
  const T = 68; // top rail rows 83–150
  const S = 63; // post columns
  const tl = await raw(SRC, { left: 135, top: 83, width: S, height: T });
  const tr = await raw(SRC, { left: 1474, top: 83, width: S, height: T });
  const top = seamless(await raw(SRC, { left: 260, top: 83, width: 1100, height: T }), "x", 100);
  // posts: below the rail's shadow, above the sill
  const left = seamless(await raw(SRC, { left: 135, top: 166, width: S, height: 520 }), "y", 80);
  const right = seamless(await raw(SRC, { left: 1474, top: 166, width: S, height: 520 }), "y", 80);
  const W = S + top.w + S;
  const H = T + left.h;
  const frame = await compose(W, H, [
    [tl, 0, 0],
    [top, S, 0],
    [tr, S + top.w, 0],
    [left, 0, T],
    [right, S + top.w, T],
  ]);
  await save(frame, "window-frame.webp");
  console.log(`  border-image-slice: ${T} ${S} 0 ${S}`);
}

// ---------- sill: back plank, plank surface, front board in three parts ----------
{
  const SRC = "design-src/ui/wood-bench.png";
  const back = seamless(await raw(SRC, { left: 260, top: 696, width: 1100, height: 41 }), "x", 100);
  await save(back, "sill-back.webp");
  const surface = seamless(await raw(SRC, { left: 260, top: 737, width: 1100, height: 40 }), "x", 100);
  await save(surface, "sill-surface.webp");
  const FT = 777, FH = 79, CAP = 120;
  await save(await raw(SRC, { left: 88, top: FT, width: CAP, height: FH }), "sill-front-left.webp");
  await save(await raw(SRC, { left: 1584 - CAP, top: FT, width: CAP, height: FH }), "sill-front-right.webp");
  const front = seamless(await raw(SRC, { left: 260, top: FT, width: 1100, height: FH }), "x", 100);
  await save(front, "sill-front-middle.webp");
}

// ---------- slate frame: 9-slice ----------
{
  const SRC = "design-src/ui/slate-frame.png";
  const X0 = 66, Y0 = 112, X1 = 1382, Y1 = 977, S = 91, T = 84;
  const corner = (l, t) => raw(SRC, { left: l, top: t, width: S, height: T });
  const tl = await corner(X0, Y0), tr = await corner(X1 - S, Y0);
  const bl = await corner(X0, Y1 - T), br = await corner(X1 - S, Y1 - T);
  const top = seamless(await raw(SRC, { left: X0 + S + 40, top: Y0, width: 1000, height: T }), "x", 100);
  const bottom = seamless(await raw(SRC, { left: X0 + S + 40, top: Y1 - T, width: 1000, height: T }), "x", 100);
  const left = seamless(await raw(SRC, { left: X0, top: Y0 + T + 30, width: S, height: 600 }), "y", 80);
  const right = seamless(await raw(SRC, { left: X1 - S, top: Y0 + T + 30, width: S, height: 600 }), "y", 80);
  const W = S + top.w + S, H = T + left.h + T;
  const frame = await compose(W, H, [
    [tl, 0, 0], [top, S, 0], [tr, S + top.w, 0],
    [left, 0, T], [right, S + top.w, T],
    [bl, 0, T + left.h], [bottom, S, T + left.h], [br, S + top.w, T + left.h],
  ]);
  await save(frame, "slate-frame.webp");
  console.log(`  border-image-slice: ${T} ${S}`);
}

// ---------- slate surface: darker for chalk contrast, seamless tile ----------
// linear(a, b) darkens and flattens the scratches: muted chalk (#B5BBB2)
// must reach 4.5:1 on the brightest 0.1 % of pixels.
{
  const { data, info } = await sharp("design-src/ui/slate.png")
    .removeAlpha()
    .linear(0.62, 8)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let tile = { data, w: info.width, h: info.height };
  tile = seamless(seamless(tile, "x", 120), "y", 120);
  await save(tile, "slate.webp", { width: 640 });
}

// ---------- pebble ----------
// Darkened a little: the painted stone is light (mean #AB9780, 2.0:1 on
// paper); as the Slider's handle it should stand out from the paper with
// about 3:1, like the drawn pebble before it.
{
  const p = await raw("design-src/ui/pebble.png", { left: 344, top: 400, width: 600, height: 452 });
  const dark = await img(p).linear([0.7, 0.7, 0.7, 1], [0, 0, 0, 0]).raw().toBuffer({ resolveWithObject: true });
  await save({ data: dark.data, w: dark.info.width, h: dark.info.height }, "pebble.webp", { width: 96 });
}

// ---------- rail: the frame wood, darkened so chalk reads on it ----------
{
  const strip = await raw("design-src/ui/wood-bench.png", { left: 260, top: 88, width: 1100, height: 56 });
  const dark = await img(strip).linear(0.44, 0).raw().toBuffer({ resolveWithObject: true });
  await save(seamless({ data: dark.data, w: dark.info.width, h: dark.info.height }, "x", 100), "rail-wood.webp");
}
