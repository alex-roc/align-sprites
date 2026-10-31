// Deterministic port of unfake's "dominant" grid downscale (crates/unfake-core/src/downscale.rs).
// The WASM version picks the most frequent colour with Rust's HashMap::max_by_key, whose iteration order is
// randomized per process: on ties the same input gave different pixels between calls. Here ties are broken
// by the colour closest to the cell's mean, then by the packed value, so the output is always the same.
import type { PixelGrid, RGBAImage } from '../types.ts';

interface Span {
  start: number;
  end: number;
  center: number;
}

/** Cell boundaries along one axis (as AxisGrid::bounds): cells whose centre falls inside [0, len). */
export function axisBounds(period: number, offset: number, len: number): number[] {
  const first = Math.ceil(-offset / period - 0.5);
  const last = Math.ceil((len - offset) / period - 0.5) - 1;
  const cells = Math.max(0, last - first + 1);
  const out: number[] = [];
  for (let i = 0; i <= cells; i++) out.push(offset + (first + i) * period);
  return out;
}

/** Inner region of each cell: pixels at least a quarter cell from the borders (at least the centre pixel). */
function boundSpans(bounds: number[], len: number): Span[] {
  const spans: Span[] = [];
  for (let k = 0; k + 1 < bounds.length; k++) {
    const a = bounds[k], b = bounds[k + 1];
    const p = b - a;
    const margin = Math.min(0.25 * p, Math.max(0, (p - 1) / 2));
    const center = Math.min(len - 1, Math.max(0, Math.floor((a + b) / 2)));
    const lo = Math.max(0, Math.ceil(a + margin - 0.5));
    const hi = Math.min(len - 1, Math.floor(b - margin - 0.5));
    spans.push(hi >= lo ? { start: lo, end: hi + 1, center } : { start: center, end: center + 1, center });
  }
  return spans;
}

/**
 * One output pixel per grid cell: the most frequent opaque colour of the cell's inner region when it covers at
 * least `threshold` of the opaque samples, else their mean. Alpha is binary (median of the samples > 128).
 */
export function downscaleDominant(img: RGBAImage, g: PixelGrid, threshold = 0.05): RGBAImage {
  const xs = boundSpans(axisBounds(g.periodX, g.offsetX, img.width), img.width);
  const ys = boundSpans(axisBounds(g.periodY, g.offsetY, img.height), img.height);
  const W = Math.max(1, xs.length), H = Math.max(1, ys.length);
  const out = new Uint8ClampedArray(W * H * 4);
  if (!xs.length || !ys.length) return { width: 1, height: 1, data: out };
  const d = img.data;
  const counts = new Map<number, number>();
  const alphas: number[] = [];
  ys.forEach((row, ty) => {
    xs.forEach((col, tx) => {
      counts.clear();
      alphas.length = 0;
      let n = 0, sr = 0, sg = 0, sb = 0;
      for (let sy = row.start; sy < row.end; sy++)
        for (let sx = col.start; sx < col.end; sx++) {
          const i = (sy * img.width + sx) * 4;
          const a = d[i + 3];
          alphas.push(a);
          if (a > 128) {
            const packed = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
            counts.set(packed, (counts.get(packed) ?? 0) + 1);
            sr += d[i];
            sg += d[i + 1];
            sb += d[i + 2];
            n++;
          }
        }
      if (!n) return;
      const mr = sr / n, mg = sg / n, mb = sb / n;
      let best = 0, bestCount = -1, bestDist = Infinity;
      for (const [packed, c] of counts) {
        if (c < bestCount) continue;
        const dr = ((packed >> 16) & 255) - mr, dg = ((packed >> 8) & 255) - mg, db = (packed & 255) - mb;
        const dist = dr * dr + dg * dg + db * db;
        if (c > bestCount || dist < bestDist || (dist === bestDist && packed < best)) {
          best = packed;
          bestCount = c;
          bestDist = dist;
        }
      }
      const o = (ty * W + tx) * 4;
      if (bestCount / n >= threshold) {
        out[o] = (best >> 16) & 255;
        out[o + 1] = (best >> 8) & 255;
        out[o + 2] = best & 255;
      } else {
        out[o] = Math.floor(mr);
        out[o + 1] = Math.floor(mg);
        out[o + 2] = Math.floor(mb);
      }
      alphas.sort((p, q) => p - q);
      out[o + 3] = medianU8(alphas) > 128 ? 255 : 0;
    });
  });
  return { width: W, height: H, data: out };
}

/** Same median as unfake's median_u8 (mean of the two middle values on even counts, floored). */
function medianU8(sorted: number[]): number {
  const n = sorted.length;
  if (!n) return 0;
  const mid = n >> 1;
  return n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) >> 1;
}
