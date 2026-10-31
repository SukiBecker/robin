// Builds a seamlessly tileable lawn from public/garden/rasen-dunkel.jpg:
// the original plus its x-, y- and xy-mirrored copies as a 2x2 tile, so
// every edge meets its own mirror image. The original stays untouched.
//
//   node scripts/make-seamless-lawn.mjs

import sharp from "sharp";

const SOURCE = "public/garden/rasen-dunkel.jpg";
const TARGET = "public/garden/rasen-dunkel-kachel.jpg";

const { width, height } = await sharp(SOURCE).metadata();
const original = await sharp(SOURCE).toBuffer();
const mirroredX = await sharp(SOURCE).flop().toBuffer();
const mirroredY = await sharp(SOURCE).flip().toBuffer();
const mirroredXY = await sharp(SOURCE).flip().flop().toBuffer();

await sharp({
  create: { width: width * 2, height: height * 2, channels: 3, background: "#000" },
})
  .composite([
    { input: original, left: 0, top: 0 },
    { input: mirroredX, left: width, top: 0 },
    { input: mirroredY, left: 0, top: height },
    { input: mirroredXY, left: width, top: height },
  ])
  .jpeg({ quality: 85, mozjpeg: true })
  .toFile(TARGET);

console.log(`${TARGET}: ${width * 2}x${height * 2}`);
