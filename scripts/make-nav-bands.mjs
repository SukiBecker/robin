// Cuts the two bookmark ribbons out of design-src/ui/nav-band-green:linen.png
// (both bands side by side on a dark glow, no real transparency) and writes
// four WebPs to public/ui/: a stretchable body and a fixed swallowtail end per
// band. The cut-out polygons were measured on the 1536x1024 source.
//
//   node scripts/make-nav-bands.mjs

import sharp from "sharp";

const SRC = "design-src/ui/nav-band-green:linen.png";
const W = 1536, H = 1024;
const END = 110; // source rows of the swallowtail piece
const BODY = 200; // source rows of the stretchable body above it
const bands = {
  // dim: text in paper must reach 4.5:1 even on the brightest weave highlights
  green: { l: 455, r: 687, t: 94, b: 944, apex: 905, dim: 0.8 },
  linen: { l: 850, r: 1084, t: 100, b: 942, apex: 903 },
};

const { data } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });

for (const [name, p] of Object.entries(bands)) {
  const w = p.r - p.l;
  const mid = w / 2;
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><polygon fill="#fff" points="${p.l},${p.t} ${p.r},${p.t} ${p.r},${p.b} ${p.l + mid},${p.apex} ${p.l},${p.b}"/></svg>`,
  );
  const alpha = await sharp(mask).blur(0.7).extractChannel(0).raw().toBuffer();
  const rgba = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const k = p.dim ?? 1;
    rgba[i * 4] = data[i * 3] * k;
    rgba[i * 4 + 1] = data[i * 3 + 1] * k;
    rgba[i * 4 + 2] = data[i * 3 + 2] * k;
    rgba[i * 4 + 3] = alpha[i];
  }
  const full = sharp(rgba, { raw: { width: W, height: H, channels: 4 } });
  const cut = (top, height) =>
    full.clone().extract({ left: p.l, top, width: w, height }).webp({ quality: 88, alphaQuality: 95 });
  await cut(p.b - END, END).toFile(`public/ui/nav-band-${name}-end.webp`);
  await cut(p.b - END - BODY, BODY).toFile(`public/ui/nav-band-${name}-body.webp`);
  console.log(name, `${w}px wide, end ${END}, body ${BODY}`);
}
