// Basic RGBA image helpers shared by every core module.
import type { RGBA8, RGBAImage, Rect } from './types.ts';

export function createImage(width: number, height: number, fill?: RGBA8): RGBAImage {
  const data = new Uint8ClampedArray(width * height * 4);
  if (fill && (fill[0] | fill[1] | fill[2] | fill[3])) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = fill[0];
      data[i + 1] = fill[1];
      data[i + 2] = fill[2];
      data[i + 3] = fill[3];
    }
  }
  return { width, height, data };
}

export function cloneImage(img: RGBAImage): RGBAImage {
  return { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) };
}

export function getPixel(img: RGBAImage, x: number, y: number): RGBA8 {
  const i = (y * img.width + x) * 4;
  const d = img.data;
  return [d[i], d[i + 1], d[i + 2], d[i + 3]];
}

export function setPixel(img: RGBAImage, x: number, y: number, c: RGBA8): void {
  const i = (y * img.width + x) * 4;
  img.data[i] = c[0];
  img.data[i + 1] = c[1];
  img.data[i + 2] = c[2];
  img.data[i + 3] = c[3];
}

/** Copy of a sub-rectangle; parts outside the source become transparent. */
export function crop(img: RGBAImage, r: Rect): RGBAImage {
  const out = createImage(r.w, r.h);
  for (let y = 0; y < r.h; y++) {
    const sy = r.y + y;
    if (sy < 0 || sy >= img.height) continue;
    for (let x = 0; x < r.w; x++) {
      const sx = r.x + x;
      if (sx < 0 || sx >= img.width) continue;
      const si = (sy * img.width + sx) * 4;
      const di = (y * r.w + x) * 4;
      out.data[di] = img.data[si];
      out.data[di + 1] = img.data[si + 1];
      out.data[di + 2] = img.data[si + 2];
      out.data[di + 3] = img.data[si + 3];
    }
  }
  return out;
}

/** Paste `src` into `dst` at (dx, dy). mode 'replace' copies raw pixels; 'over' alpha-composites. Clips to dst. */
export function blit(dst: RGBAImage, src: RGBAImage, dx: number, dy: number, mode: 'replace' | 'over' = 'replace'): void {
  for (let y = 0; y < src.height; y++) {
    const ty = dy + y;
    if (ty < 0 || ty >= dst.height) continue;
    for (let x = 0; x < src.width; x++) {
      const tx = dx + x;
      if (tx < 0 || tx >= dst.width) continue;
      const si = (y * src.width + x) * 4;
      const di = (ty * dst.width + tx) * 4;
      const sa = src.data[si + 3];
      if (mode === 'replace' || sa === 255) {
        dst.data[di] = src.data[si];
        dst.data[di + 1] = src.data[si + 1];
        dst.data[di + 2] = src.data[si + 2];
        dst.data[di + 3] = sa;
      } else if (sa > 0) {
        const a = sa / 255;
        const da = dst.data[di + 3] / 255;
        const oa = a + da * (1 - a);
        for (let k = 0; k < 3; k++) {
          dst.data[di + k] = (src.data[si + k] * a + dst.data[di + k] * da * (1 - a)) / oa;
        }
        dst.data[di + 3] = oa * 255;
      }
    }
  }
}

/** Bounding box of pixels with alpha >= alphaMin, or null if fully transparent. */
export function alphaBBox(img: RGBAImage, alphaMin = 1): Rect | null {
  let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] >= alphaMin) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Nearest-neighbour resize (integer or not). */
export function resizeNearest(img: RGBAImage, w: number, h: number): RGBAImage {
  const out = createImage(w, h);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(img.height - 1, Math.floor(((y + 0.5) * img.height) / h));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(img.width - 1, Math.floor(((x + 0.5) * img.width) / w));
      const si = (sy * img.width + sx) * 4;
      const di = (y * w + x) * 4;
      out.data[di] = img.data[si];
      out.data[di + 1] = img.data[si + 1];
      out.data[di + 2] = img.data[si + 2];
      out.data[di + 3] = img.data[si + 3];
    }
  }
  return out;
}

/** Horizontal mirror of a whole image (column x → width-1-x). Returns a new image. */
export function flipImageX(img: RGBAImage): RGBAImage {
  const { width: w, height: h } = img;
  const out = createImage(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4;
      out.data.set(img.data.subarray(s, s + 4), (y * w + (w - 1 - x)) * 4);
    }
  }
  return out;
}
