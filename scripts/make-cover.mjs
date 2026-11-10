// Builds public/portrait-cover.webp (the HOME BURN cover) from public/costume.png.
// Removes a white OR fake "transparent" grey/white checkerboard background:
// flood-fills from the edges through light, colourless pixels, then feathers the cut edge.
//   node scripts/make-cover.mjs [src] [out] [--black]   (--black: background is solid black, not white; --solid: fill holes inside the figure)
import sharp from "sharp";
import { statSync } from "node:fs";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const BLACK = process.argv.includes("--black");
const SRC = args[0] || "public/costume.png";
const OUT = args[1] || "public/portrait-cover.webp";
const WIDTH = 800;

const { data, info } = await sharp(SRC)
  .resize({ width: WIDTH, withoutEnlargement: false, kernel: "lanczos3" })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;

const isBg = (i) => {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3];
  if (a < 40) return true;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (BLACK) return max < 16; // near-pure black (hair is ~35+, so it survives)
  return max - min < 22 && min > 175; // light + colourless = white / checker squares
};
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
// --solid: the figure has no real see-through gaps (arms touch the body), so fill every row
// between its leftmost and rightmost subject pixel. Removes holes where dark shadows were
// mistaken for background.
if (process.argv.includes('--solid')) {
  for (let y = 0; y < h; y++) {
    let l = -1, r = -1;
    for (let x = 0; x < w; x++) if (!bg[y * w + x]) { if (l < 0) l = x; r = x; }
    for (let x = l + 1; x < r; x++) bg[y * w + x] = 0;
  }
}
// feather: alpha by distance to background (2px)
for (let i = 0; i < w * h; i++) {
  if (bg[i]) {
    data[i * 4 + 3] = 0;
    continue;
  }
  const x = i % w, y = (i / w) | 0;
  let near = 0;
  for (let oy = -2; oy <= 2; oy++)
    for (let ox = -2; ox <= 2; ox++) {
      const xx = x + ox, yy = y + oy;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h && bg[yy * w + xx]) near++;
    }
  if (near) data[i * 4 + 3] = Math.round(255 * Math.max(0.15, 1 - near / 12));
}

await sharp(data, { raw: { width: w, height: h, channels: 4 } }).webp({ quality: 84, alphaQuality: 90, effort: 6 }).toFile(OUT);
console.log(`${OUT}: ${w}x${h}, ${(statSync(OUT).size / 1024).toFixed(1)} KB`);
