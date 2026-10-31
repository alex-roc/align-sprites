// High-quality resampling for cartoon/vector-like art (pixel art uses the unfake grid downscale instead).
import type { RGBAImage } from '../types.ts';

/** Per-axis filter: dst index i reads src[start[i] .. start[i]+count[i]) with weights w[off[i] ..] (sum = 1). */
interface Axis {
  start: Int32Array;
  count: Int32Array;
  off: Int32Array;
  w: Float32Array;
}

/** Box (exact fractional coverage) when reducing, bilinear (pixel centres) when enlarging. */
function makeAxis(srcN: number, dstN: number): Axis {
  const start = new Int32Array(dstN);
  const count = new Int32Array(dstN);
  const off = new Int32Array(dstN);
  const weights: number[] = [];
  const ratio = srcN / dstN;
  for (let i = 0; i < dstN; i++) {
    off[i] = weights.length;
    if (dstN <= srcN) {
      const a = i * ratio, b = (i + 1) * ratio;
      const s0 = Math.floor(a + 1e-9);
      const s1 = Math.min(srcN, Math.ceil(b - 1e-9));
      start[i] = s0;
      count[i] = s1 - s0;
      let sum = 0;
      const ws: number[] = [];
      for (let s = s0; s < s1; s++) {
        const wgt = Math.min(b, s + 1) - Math.max(a, s);
        ws.push(wgt);
        sum += wgt;
      }
      for (const wgt of ws) weights.push(wgt / sum);
    } else {
      const c = (i + 0.5) * ratio - 0.5;
      const s0 = Math.min(srcN - 1, Math.max(0, Math.floor(c)));
      const s1 = Math.min(srcN - 1, s0 + 1);
      const t = Math.min(1, Math.max(0, c - s0));
      start[i] = s0;
      if (s1 === s0) {
        count[i] = 1;
        weights.push(1);
      } else {
        count[i] = 2;
        weights.push(1 - t, t);
      }
    }
  }
  return { start, count, off, w: Float32Array.from(weights) };
}

/**
 * Resize to exactly w×h. Downscaling: box/area filter with premultiplied alpha (no dark/magenta fringes).
 * Upscaling: bilinear with premultiplied alpha. Output is straight (non-premultiplied) RGBA.
 */
export function resampleArea(img: RGBAImage, w: number, h: number): RGBAImage {
  const W = Math.max(1, Math.round(w)), H = Math.max(1, Math.round(h));
  const { width: sw, height: sh, data } = img;
  if (W === sw && H === sh) return { width: sw, height: sh, data: new Uint8ClampedArray(data) };
  if (sw === 0 || sh === 0) return { width: W, height: H, data: new Uint8ClampedArray(W * H * 4) };

  // Horizontal pass over premultiplied source → float rows (sh × W).
  const ax = makeAxis(sw, W);
  const tmp = new Float32Array(sh * W * 4);
  for (let y = 0; y < sh; y++) {
    const row = y * sw * 4;
    for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      const s0 = ax.start[x], n = ax.count[x], o = ax.off[x];
      for (let k = 0; k < n; k++) {
        const i = row + (s0 + k) * 4;
        const wa = (ax.w[o + k] * data[i + 3]) / 255;
        r += data[i] * wa;
        g += data[i + 1] * wa;
        b += data[i + 2] * wa;
        a += ax.w[o + k] * data[i + 3];
      }
      const t = (y * W + x) * 4;
      tmp[t] = r;
      tmp[t + 1] = g;
      tmp[t + 2] = b;
      tmp[t + 3] = a;
    }
  }

  // Vertical pass + un-premultiply.
  const ay = makeAxis(sh, H);
  const out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    const s0 = ay.start[y], n = ay.count[y], o = ay.off[y];
    for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let k = 0; k < n; k++) {
        const t = ((s0 + k) * W + x) * 4;
        const wk = ay.w[o + k];
        r += tmp[t] * wk;
        g += tmp[t + 1] * wk;
        b += tmp[t + 2] * wk;
        a += tmp[t + 3] * wk;
      }
      const i = (y * W + x) * 4;
      const alpha = Math.round(a);
      if (alpha > 0) {
        const inv = 255 / a;
        out[i] = Math.round(r * inv);
        out[i + 1] = Math.round(g * inv);
        out[i + 2] = Math.round(b * inv);
        out[i + 3] = alpha;
      }
    }
  }
  return { width: W, height: H, data: out };
}

/** Scale by a factor (w = round(width·s), h = round(height·s), min 1). */
export function resampleScale(img: RGBAImage, s: number): RGBAImage {
  return resampleArea(img, Math.max(1, Math.round(img.width * s)), Math.max(1, Math.round(img.height * s)));
}
