// Builds public/portrait.webp from public/portrait.png:
// removes the white background (flood fill from the edges) and saves a small transparent WebP.
// Run after replacing the photo:  node scripts/make-portrait.mjs
// Other images:  node scripts/make-portrait.mjs public/costume.png public/portrait-cover.webp
import sharp from "sharp";

const SRC = process.argv[2] || "public/portrait.png";
const OUT = process.argv[3] || "public/portrait.webp";
const WIDTH = 800;

const { data, info } = await sharp(SRC)
  .resize({ width: WIDTH, withoutEnlargement: true })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width: w, height: h } = info;
const isBg = (i) => data[i * 4 + 3] < 40 || (data[i * 4] > 222 && data[i * 4 + 1] > 222 && data[i * 4 + 2] > 222);
const bg = new Uint8Array(w * h);
const stack = [];
for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
while (stack.length) {
  const i = stack.pop();
  if (bg[i] || !isBg(i)) continue;
  bg[i] = 1;
  const x = i % w, y = (i / w) | 0;
  if (x > 0) stack.push(i - 1);
  if (x < w - 1) stack.push(i + 1);
  if (y > 0) stack.push(i - w);
  if (y < h - 1) stack.push(i + w);
}
// soften the cut edge a little: pixels next to background get partial alpha
for (let i = 0; i < w * h; i++) {
  if (bg[i]) {
    data[i * 4 + 3] = 0;
    continue;
  }
  const x = i % w, y = (i / w) | 0;
  let n = 0;
  if (x > 0 && bg[i - 1]) n++;
  if (x < w - 1 && bg[i + 1]) n++;
  if (y > 0 && bg[i - w]) n++;
  if (y < h - 1 && bg[i + w]) n++;
  if (n) data[i * 4 + 3] = Math.round(255 * (1 - n * 0.2));
}

await sharp(data, { raw: { width: w, height: h, channels: 4 } })
  .webp({ quality: 82, alphaQuality: 90, effort: 6 })
  .toFile(OUT);

const { size } = await import("node:fs").then((fs) => fs.statSync(OUT));
console.log(`${OUT}: ${w}x${h}, ${(size / 1024).toFixed(1)} KB`);
