// Seamless horizontal loop for parallax layers. AI layers rarely repeat: the right edge does not continue into
// the left one. makeLoop overlaps a band of the last columns over the first ones and cuts along a minimum-error
// vertical seam (image quilting, Efros & Freeman 2001), so every pixel still comes from the source (no blur) and
// the picture gets `band` columns narrower.
import { createImage } from '../image.ts';
import type { RGBAImage } from '../types.ts';

/** Colour distance of two pixels (sum of |ΔRGB| + |Δα|); two transparent pixels are equal whatever their RGB. */
function pixelDiff(d: Uint8ClampedArray, a: number, b: number): number {
  if (d[a + 3] < 128 && d[b + 3] < 128) return 0;
  return Math.abs(d[a] - d[b]) + Math.abs(d[a + 1] - d[b + 1]) + Math.abs(d[a + 2] - d[b + 2]) + Math.abs(d[a + 3] - d[b + 3]);
}

/**
 * Wrap quality of a layer: mean difference between the last and the first column divided by the mean difference
 * between adjacent interior columns. ~1 = loops cleanly; >> 1 = a visible vertical seam when it repeats.
 * Pairs of two transparent pixels are left out of both means, so sparse layers (trees on nothing) are not diluted.
 */
export function loopScore(img: RGBAImage): number {
  const { width: W, height: H, data } = img;
  if (W < 2) return 1;
  const empty = (i: number): boolean => data[i + 3] < 128;
  let wrap = 0, wn = 0, inner = 0, inn = 0;
  for (let y = 0; y < H; y++) {
    const row = y * W;
    const a = (row + W - 1) * 4, b = row * 4;
    if (!empty(a) || !empty(b)) { wrap += pixelDiff(data, a, b); wn++; }
    for (let x = 0; x < W - 1; x++) {
      const p = (row + x) * 4;
      if (!empty(p) || !empty(p + 4)) { inner += pixelDiff(data, p, p + 4); inn++; }
    }
  }
  const EPS = 6;
  return (wrap / Math.max(1, wn) + EPS) / (inner / Math.max(1, inn) + EPS);
}

/** loopScore at or below this means the layer already repeats (nothing to fix). */
export const ALREADY_LOOPS = 1.25;
/** loopScore above this is a visible seam. */
export const LOOP_WARN = 1.8;

/**
 * Minimum-error vertical path through a `b`-wide overlap: cost(y, x) = squared-ish colour difference between the
 * tail pixel (column W-b+x) and the head pixel (column x) of row y; steps move at most one column per row.
 * Returns the seam column per row.
 */
export function findSeam(img: RGBAImage, b: number): Int32Array {
  const { width: W, height: H, data } = img;
  const cost = new Float64Array(H * b);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < b; x++) {
      const e = pixelDiff(data, (y * W + W - b + x) * 4, (y * W + x) * 4);
      cost[y * b + x] = e * e;
    }
  }
  // Accumulate downwards, remember the best predecessor.
  const acc = new Float64Array(cost);
  const from = new Int8Array(H * b);
  for (let y = 1; y < H; y++) {
    for (let x = 0; x < b; x++) {
      let best = acc[(y - 1) * b + x], step = 0;
      if (x > 0 && acc[(y - 1) * b + x - 1] < best) { best = acc[(y - 1) * b + x - 1]; step = -1; }
      if (x < b - 1 && acc[(y - 1) * b + x + 1] < best) { best = acc[(y - 1) * b + x + 1]; step = 1; }
      acc[y * b + x] += best;
      from[y * b + x] = step;
    }
  }
  const seam = new Int32Array(H);
  let x = 0;
  for (let i = 1; i < b; i++) if (acc[(H - 1) * b + i] < acc[(H - 1) * b + x]) x = i;
  for (let y = H - 1; y >= 0; y--) {
    seam[y] = x;
    x += from[y * b + x];
  }
  return seam;
}

/** Overlap band that gives the seam room to wander: `fraction` of the width, at least 8 px, at most a third. */
export function bandFor(width: number, fraction: number): number {
  const b = Math.max(8, Math.round(width * fraction));
  return Math.max(1, Math.min(b, Math.floor(width / 3)));
}

/**
 * Makes the picture loop: output column x < b takes the tail pixel (column W-b+x) left of the seam and the head
 * pixel (column x) from the seam on; the rest is copied. So the last output column is followed by a tail pixel
 * that continued in the original, and the seam is where tail and head agree. Width becomes W - b.
 * `feather` > 0 blends that many px around the seam (cartoon); 0 keeps every pixel exactly from the source (pixel art).
 */
export function makeLoop(img: RGBAImage, band: number, feather = 0): { image: RGBAImage; seam: Int32Array } {
  const { width: W, height: H, data } = img;
  const b = Math.max(1, Math.min(band, Math.floor(W / 2)));
  const outW = W - b;
  const seam = findSeam(img, b);
  const out = createImage(outW, H);
  for (let y = 0; y < H; y++) {
    out.data.set(data.subarray((y * W + b) * 4, (y * W + outW) * 4), (y * outW + b) * 4);
    for (let x = 0; x < b; x++) {
      const tail = (y * W + W - b + x) * 4, head = (y * W + x) * 4, o = (y * outW + x) * 4;
      // Weight of the head pixel: 0 left of the seam, 1 from the seam on, a ramp of `feather` px across it.
      const t = feather > 0 ? Math.min(1, Math.max(0, (x - seam[y]) / feather + 0.5)) : x >= seam[y] ? 1 : 0;
      if (t === 0 || t === 1) {
        out.data.set(data.subarray(t === 0 ? tail : head, (t === 0 ? tail : head) + 4), o);
        continue;
      }
      // Premultiplied mix so a transparent neighbour never tints the colour.
      const at = data[tail + 3] * (1 - t), ah = data[head + 3] * t, a = at + ah;
      if (a > 0) {
        for (let c = 0; c < 3; c++) out.data[o + c] = Math.round((data[tail + c] * at + data[head + c] * ah) / a);
        out.data[o + 3] = Math.round(a);
      }
    }
  }
  return { image: out, seam };
}

/**
 * Opaque shapes that are not connected to the bottom row (a tree crown whose trunk was cut away). With `wrap` the
 * left and right edges count as neighbours, as they do when the layer repeats. Fully opaque layers have none.
 */
export function floatingCount(img: RGBAImage, wrap = false, sizes?: number[]): number {
  const { width: W, height: H, data } = img;
  const solid = (p: number): boolean => data[p * 4 + 3] >= 128;
  let transparent = false;
  for (let p = 0; p < W * H && !transparent; p++) if (!solid(p)) transparent = true;
  if (!transparent) return 0;
  const seen = new Uint8Array(W * H);
  const stack: number[] = [];
  let floating = 0;
  for (let start = 0; start < W * H; start++) {
    if (seen[start] || !solid(start)) continue;
    let grounded = false;
    let area = 0;
    seen[start] = 1;
    stack.push(start);
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % W, y = (p - x) / W;
      area++;
      if (y === H - 1) grounded = true;
      const next = [
        x > 0 ? p - 1 : wrap ? p + W - 1 : -1,
        x < W - 1 ? p + 1 : wrap ? p - W + 1 : -1,
        y > 0 ? p - W : -1,
        y < H - 1 ? p + W : -1,
      ];
      for (const q of next) {
        if (q >= 0 && !seen[q] && solid(q)) {
          seen[q] = 1;
          stack.push(q);
        }
      }
    }
    if (!grounded) {
      floating++;
      sizes?.push(area);
    }
  }
  return floating;
}

/** Pixels in floating shapes of at least `minArea` px (single stray pixels do not count). */
export function floatingArea(img: RGBAImage, wrap = false, minArea = 8): number {
  const sizes: number[] = [];
  floatingCount(img, wrap, sizes);
  return sizes.filter((a) => a >= minArea).reduce((a, b) => a + b, 0);
}

export interface BestLoop {
  image: RGBAImage;
  /** Columns overlapped; 0 = the picture is kept as it is (cutting would do more harm than the seam it has). */
  band: number;
  /** Pixels of floating shapes the loop added (0 = none). */
  newFloating: number;
}

/**
 * Tries a few overlap widths around `fraction` of the width, and also leaving the picture alone (band 0), and keeps
 * the best: lowest wrap score, a penalty for every pixel of floating shape the cut created (a cut-out tree split from
 * its trunk) and a small one for losing width. Many AI layers wrap trees across the edge on purpose: cutting there
 * would split them, so "as it is" can win.
 */
export function bestLoop(img: RGBAImage, fraction: number, feather = 0): BestLoop {
  const base = floatingArea(img);
  const FLOAT_COST = 1 / 20;
  let best: (BestLoop & { cost: number }) | null = null;
  const consider = (image: RGBAImage, band: number) => {
    const newFloating = Math.max(0, floatingArea(image, true) - base);
    const cost = loopScore(image) + FLOAT_COST * newFloating + (2 * band) / img.width;
    if (!best || cost < best.cost) best = { image, band, newFloating, cost };
  };
  consider(img, 0);
  const bands = new Set([0.5, 0.75, 1, 1.4, 2].map((m) => bandFor(img.width, fraction * m)));
  for (const band of bands) consider(makeLoop(img, band, feather).image, band);
  return best!;
}
