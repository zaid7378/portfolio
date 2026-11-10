/**
 * Draws the photo at width `w` and marks its background as transparent.
 * The shipped portrait.webp is already cut out (scripts/make-portrait.mjs), so this
 * mostly reads the alpha channel — the white-flood-fill also keeps a plain JPG/PNG working.
 */
export function cutout(img: HTMLImageElement, w: number) {
  const aspect = img.naturalHeight / img.naturalWidth;
  const h = Math.round(w * aspect);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h);
  const data = id.data;
  const bg = new Uint8Array(w * h);
  const isBg = (i: number) => {
    if (data[i * 4 + 3] < 40) return true;
    return data[i * 4] > 222 && data[i * 4 + 1] > 222 && data[i * 4 + 2] > 222;
  };
  const stack: number[] = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const i = stack.pop()!;
    if (bg[i] || !isBg(i)) continue;
    bg[i] = 1;
    const x = i % w, y = (i / w) | 0;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - w);
    if (y < h - 1) stack.push(i + w);
  }
  for (let i = 0; i < w * h; i++) if (bg[i]) data[i * 4 + 3] = 0;
  ctx.putImageData(id, 0, 0);
  return { canvas: c, data, bg, w, h, aspect };
}
