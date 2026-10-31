// Terrain transition compositor: from two seamless textures (A = base, B = overlay) generates the transition
// tiles of a blob47 or dual16 TileSet, so contiguous tiles always match.
//
// Method: every tile is the threshold of ONE scalar field, f = blur(erode(B mask)) + periodic value noise.
//  - blob47: canvas of 3×3 cells (centre cell is B, neighbours from the 8-neighbour mask), the tile is the centre.
//  - dual16: canvas of 2×2 cells (corners TL/TR/BL/BR), the tile is the central T×T, i.e. the tile is offset HALF a
//    tile from the data cells (dual-grid: tile (i,j) sits on the vertex shared by data cells (i-1,j-1)…(i,j)).
// The noise has period T and the canvas origin is a multiple of T from the world origin, so the field of a pixel
// depends only on the data cells within erosion+blur+noise reach (< T/2): neighbouring tiles agree and a map built
// from tiles equals the one-shot render of the whole map (see renderTerrainMap and tests/tiles-terrain.test.ts).
import { createImage, blit, crop, resizeNearest } from '../image.ts';
import { encodePng, slug } from '../export/index.ts';
import { remapToPalette } from '../palette/index.ts';
import { resampleArea } from '../resample/index.ts';
import type { UnfakeCore } from '../pixel/index.ts';
import type { ArtMode, EdgeStyle, ExportFile, GodotPeeringBit, RGBA8, RGBAImage, TileInfo, TileLayout, TileSetResult, Warning } from '../types.ts';

// ---------------------------------------------------------------- seamless textures

/** Largest centred square crop. */
function centreSquare(img: RGBAImage): RGBAImage {
  const s = Math.min(img.width, img.height);
  return s === img.width && s === img.height ? img : crop(img, { x: (img.width - s) >> 1, y: (img.height - s) >> 1, w: s, h: s });
}

function opaque(img: RGBAImage): RGBAImage {
  const data = new Uint8ClampedArray(img.data);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  return { width: img.width, height: img.height, data };
}

/** Crop/pad (edge replication) to T×T. */
function fitTo(img: RGBAImage, T: number): RGBAImage {
  if (img.width === T && img.height === T) return img;
  const out = createImage(T, T);
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const si = (Math.min(y, img.height - 1) * img.width + Math.min(x, img.width - 1)) * 4;
      out.data.set(img.data.subarray(si, si + 4), (y * T + x) * 4);
    }
  }
  return out;
}

/**
 * Reduces a texture to an opaque T×T tile in one resample.
 * pixel: when the detected art grid is already about T×T the art pixels are used as they are (crop/pad to T);
 * otherwise the (square-cropped) texture is grid-downscaled with period size/T. cartoon: area filter.
 * The tile is NOT altered to wrap: check it with seamScore (composeTransitions warns when it is high).
 */
export function makeSeamlessTile(core: UnfakeCore | null, img: RGBAImage, T: number, mode: ArtMode): RGBAImage {
  const sq = opaque(centreSquare(img));
  if (mode === 'cartoon') return opaque(resampleArea(sq, T, T));
  if (!core) return opaque(resizeNearest(sq, T, T));
  const grid = core.detectGrid(sq);
  if (grid) {
    const art = core.downscaleGrid(sq, grid, 'dominant');
    if (Math.abs(art.width - T) <= Math.max(2, T * 0.06) && Math.abs(art.height - T) <= Math.max(2, T * 0.06)) {
      return opaque(fitTo(crop(art, { x: Math.max(0, (art.width - T) >> 1), y: Math.max(0, (art.height - T) >> 1), w: Math.min(T, art.width), h: Math.min(T, art.height) }), T));
    }
  }
  const p = sq.width / T;
  if (p <= 1.0001) return opaque(resizeNearest(sq, T, T));
  const g = { periodX: p * (1 - 1e-9), periodY: p * (1 - 1e-9), offsetX: 0, offsetY: 0 };
  return opaque(fitTo(core.downscaleGrid(sq, g, 'dominant'), T));
}

/**
 * Wrap quality of a tile: mean colour difference across the wrap-around seams (left↔right, top↔bottom) divided by
 * the mean difference between adjacent interior pixels. ~1 = seamless; >> 1 = visible seams when tiled.
 */
export function seamScore(tile: RGBAImage): number {
  const { width: W, height: H, data } = tile;
  const d = (a: number, b: number): number =>
    Math.abs(data[a] - data[b]) + Math.abs(data[a + 1] - data[b + 1]) + Math.abs(data[a + 2] - data[b + 2]);
  let wrap = 0, wn = 0, inner = 0, inn = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const r = (y * W + ((x + 1) % W)) * 4;
      const b = (((y + 1) % H) * W + x) * 4;
      if (x === W - 1) { wrap += d(i, r); wn++; } else { inner += d(i, r); inn++; }
      if (y === H - 1) { wrap += d(i, b); wn++; } else { inner += d(i, b); inn++; }
    }
  }
  const EPS = 6;
  return (wrap / Math.max(1, wn) + EPS) / (inner / Math.max(1, inn) + EPS);
}

/** seamScore above this triggers warn.notSeamless. */
const SEAM_WARN = 1.8;

// ---------------------------------------------------------------- field

/** Edge style scaled to the tile size (margin ≈ blur ≈ 9 % of T, noise ≈ 8 %); margin >= blur keeps blob tiles exact. */
export function defaultEdgeStyle(T: number, seed = 1): EdgeStyle {
  return {
    margin: Math.max(1, Math.round(T * 0.09)),
    blur: Math.max(1, Math.round(T * 0.09)),
    noiseAmp: Math.max(1, Math.round(T * 0.08)),
    noiseCells: 4,
    seed,
    outline: undefined,
  };
}

/** Clamps the style so that margin + blur + noiseAmp + 2 < T/2 (the field of a pixel must not see beyond its neighbours). */
function normalizeStyle(s: EdgeStyle, T: number, warnings: Warning[]): EdgeStyle {
  let margin = Math.max(0, s.margin), blur = Math.max(1, s.blur), noiseAmp = Math.max(0, s.noiseAmp);
  const total = margin + blur + noiseAmp;
  if (total + 2 >= T / 2) {
    const f = Math.max(0, T / 2 - 3) / total;
    margin = Math.floor(margin * f);
    blur = Math.max(1, Math.floor(blur * f));
    noiseAmp = Math.floor(noiseAmp * f);
    warnings.push({ key: 'warn.edgeStyleClamped', params: { margin, blur, noiseAmp } });
  }
  return { ...s, margin, blur, noiseAmp, noiseCells: Math.max(1, Math.round(s.noiseCells)) };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Periodic (period T on both axes) value noise in [-1, 1]: two octaves of a smooth lattice interpolation. */
function noiseTable(T: number, cells: number, seed: number): Float32Array {
  const rnd = mulberry32(seed * 7919 + 17);
  const octave = (n: number): Float32Array => {
    const lat = new Float32Array(n * n);
    for (let i = 0; i < lat.length; i++) lat[i] = rnd() * 2 - 1;
    const out = new Float32Array(T * T);
    const fade = (t: number) => t * t * (3 - 2 * t);
    for (let y = 0; y < T; y++) {
      const gy = (y / T) * n, j = Math.floor(gy), fy = fade(gy - j);
      for (let x = 0; x < T; x++) {
        const gx = (x / T) * n, i = Math.floor(gx), fx = fade(gx - i);
        const v = (a: number, b: number) => lat[(b % n) * n + (a % n)];
        const top = v(i, j) * (1 - fx) + v(i + 1, j) * fx;
        const bot = v(i, j + 1) * (1 - fx) + v(i + 1, j + 1) * fx;
        out[y * T + x] = top * (1 - fy) + bot * fy;
      }
    }
    return out;
  };
  const o1 = octave(cells), o2 = octave(cells * 2);
  const out = new Float32Array(T * T);
  for (let i = 0; i < out.length; i++) out[i] = (o1[i] + 0.5 * o2[i]) / 1.5;
  return out;
}

/** Squared Euclidean distance to the nearest 0 pixel (Felzenszwalb–Huttenlocher); 1e20 where there is no zero. */
function distanceSquared(bin: Uint8Array, W: number, H: number): Float64Array {
  const INF = 1e20;
  const d = new Float64Array(W * H);
  for (let i = 0; i < d.length; i++) d[i] = bin[i] ? INF : 0;
  const n = Math.max(W, H);
  const f = new Float64Array(n), z = new Float64Array(n + 1), v = new Int32Array(n), out = new Float64Array(n);
  const pass = (len: number, get: (i: number) => number, set: (i: number, val: number) => void) => {
    for (let i = 0; i < len; i++) f[i] = get(i);
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    for (let q = 1; q < len; q++) {
      let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < len; q++) {
      while (z[k + 1] < q) k++;
      out[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
    }
    for (let i = 0; i < len; i++) set(i, out[i]);
  };
  for (let x = 0; x < W; x++) pass(H, (y) => d[y * W + x], (y, val) => (d[y * W + x] = val));
  for (let y = 0; y < H; y++) pass(W, (x) => d[y * W + x], (x, val) => (d[y * W + x] = val));
  return d;
}

/** Separable Gaussian blur (σ = blur/2, radius = blur), edge-replicated. */
function gaussBlur(src: Float32Array, W: number, H: number, blur: number): Float32Array {
  const R = Math.max(1, Math.round(blur));
  const sigma = blur / 2;
  const k = new Float64Array(2 * R + 1);
  let sum = 0;
  for (let i = -R; i <= R; i++) sum += k[i + R] = Math.exp(-(i * i) / (2 * sigma * sigma));
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const tmp = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let a = 0;
      for (let i = -R; i <= R; i++) a += k[i + R] * src[y * W + Math.min(W - 1, Math.max(0, x + i))];
      tmp[y * W + x] = a;
    }
  }
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let a = 0;
      for (let i = -R; i <= R; i++) a += k[i + R] * tmp[Math.min(H - 1, Math.max(0, y + i)) * W + x];
      out[y * W + x] = a;
    }
  }
  return out;
}

interface Style {
  margin: number;
  blur: number;
  noiseAmp: number;
  noise: Float32Array;
}

function makeStyle(s: EdgeStyle, T: number): Style {
  return { margin: s.margin, blur: s.blur, noiseAmp: s.noiseAmp, noise: noiseTable(T, s.noiseCells, s.seed) };
}

/**
 * Signed field over a W×H canvas of 0/1 data (1 = B), in px: signed distance to the A/B boundary (positive inside B)
 * minus `margin` (= Euclidean erosion), clamped just beyond the noise range, Gaussian-blurred (rounds the corners and
 * the notches) and added periodic noise (so noise moves the edge by at most noiseAmp px and never punches holes).
 * B where field > 0, and only on B source pixels (B stays inside its own data cells). Canvas coordinates are
 * congruent to world coordinates modulo T: noise index = (x mod T, y mod T). A pixel only depends on data within
 * margin + noiseAmp + 2 + blur px of it.
 */
function computeField(bin: Uint8Array, W: number, H: number, T: number, st: Style): Float32Array {
  const inv = new Uint8Array(W * H);
  for (let i = 0; i < inv.length; i++) inv[i] = bin[i] ? 0 : 1;
  const din = distanceSquared(bin, W, H); // B pixel → nearest A pixel
  const dout = distanceSquared(inv, W, H); // A pixel → nearest B pixel
  const C = st.noiseAmp + 2;
  const sd = new Float32Array(W * H);
  for (let i = 0; i < sd.length; i++) {
    const v = bin[i] ? Math.sqrt(din[i]) - 0.5 : -(Math.sqrt(dout[i]) - 0.5);
    sd[i] = Math.max(-C, Math.min(C, v - st.margin));
  }
  const f = gaussBlur(sd, W, H, st.blur);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      f[i] = bin[i] ? f[i] + st.noiseAmp * st.noise[(y % T) * T + (x % T)] : -1e3;
    }
  }
  return f;
}

// ---------------------------------------------------------------- masks and layouts

export const BLOB_N = 1, BLOB_NE = 2, BLOB_E = 4, BLOB_SE = 8, BLOB_S = 16, BLOB_SW = 32, BLOB_W = 64, BLOB_NW = 128;

/** The 47 canonical blob masks, ascending (a diagonal bit is only set when both adjacent side bits are). */
export const BLOB47_MASKS: number[] = (() => {
  const out: number[] = [];
  for (let m = 0; m < 256; m++) {
    const ok =
      (!(m & BLOB_NE) || ((m & BLOB_N) && (m & BLOB_E))) &&
      (!(m & BLOB_SE) || ((m & BLOB_E) && (m & BLOB_S))) &&
      (!(m & BLOB_SW) || ((m & BLOB_S) && (m & BLOB_W))) &&
      (!(m & BLOB_NW) || ((m & BLOB_W) && (m & BLOB_N)));
    if (ok) out.push(m);
  }
  return out;
})();

/** Atlas position of a blob47 tile: index in BLOB47_MASKS → (i % 8, floor(i / 8)); the plain A tile is at BLOB_A_POS. */
export function blobPos(mask: number): { col: number; row: number } {
  const i = BLOB47_MASKS.indexOf(mask);
  if (i < 0) throw new RangeError(`not a canonical blob47 mask: ${mask}`);
  return { col: i % 8, row: Math.floor(i / 8) };
}
export const BLOB_A_POS = { col: 7, row: 5 };

/** Canonical mask of a cell from a 0/1 map (out-of-map = 0). */
export function blobMaskAt(cells: ArrayLike<number>, w: number, h: number, cx: number, cy: number): number {
  const at = (x: number, y: number): number => (x >= 0 && y >= 0 && x < w && y < h && cells[y * w + x] ? 1 : 0);
  const n = at(cx, cy - 1), e = at(cx + 1, cy), s = at(cx, cy + 1), wv = at(cx - 1, cy);
  return (
    n * BLOB_N | e * BLOB_E | s * BLOB_S | wv * BLOB_W |
    (at(cx + 1, cy - 1) & n & e) * BLOB_NE | (at(cx + 1, cy + 1) & e & s) * BLOB_SE |
    (at(cx - 1, cy + 1) & s & wv) * BLOB_SW | (at(cx - 1, cy - 1) & wv & n) * BLOB_NW
  );
}

export const DUAL_TL = 1, DUAL_TR = 2, DUAL_BL = 4, DUAL_BR = 8;

/** dual16 layout: the "Standard" 4×4 preset of the TileMapDual addon (MIT). mask → [col, row]. */
export const DUAL16_POS: Record<number, [number, number]> = {
  0: [0, 3], 1: [3, 3], 2: [0, 2], 3: [1, 2], 4: [0, 0], 5: [3, 2], 6: [2, 3], 7: [3, 1],
  8: [1, 3], 9: [0, 1], 10: [1, 0], 11: [2, 2], 12: [3, 0], 13: [2, 0], 14: [1, 1], 15: [2, 1],
};

const BLOB_BITS: [number, GodotPeeringBit][] = [
  [BLOB_N, 'top_side'], [BLOB_NE, 'top_right_corner'], [BLOB_E, 'right_side'], [BLOB_SE, 'bottom_right_corner'],
  [BLOB_S, 'bottom_side'], [BLOB_SW, 'bottom_left_corner'], [BLOB_W, 'left_side'], [BLOB_NW, 'top_left_corner'],
];
const DUAL_BITS: [number, GodotPeeringBit][] = [
  [DUAL_TL, 'top_left_corner'], [DUAL_TR, 'top_right_corner'], [DUAL_BL, 'bottom_left_corner'], [DUAL_BR, 'bottom_right_corner'],
];

/** Godot peering bits of a blob tile: terrain 0 (= B) where the neighbour is B, absent (no terrain) where it is A. */
export function blobBits(mask: number): TileInfo['bits'] {
  const bits: TileInfo['bits'] = {};
  for (const [bit, name] of BLOB_BITS) if (mask & bit) bits[name] = 0;
  return bits;
}

/** Godot peering bits of a dual tile: every corner is terrain 0 (A) or 1 (B). */
export function dualBits(mask: number): TileInfo['bits'] {
  const bits: TileInfo['bits'] = {};
  for (const [bit, name] of DUAL_BITS) bits[name] = mask & bit ? 1 : 0;
  return bits;
}

// ---------------------------------------------------------------- rendering

interface Ctx {
  T: number;
  mode: ArtMode;
  /** Painted where the field says B. */
  over: RGBAImage;
  /** Painted elsewhere; null = transparent (stacking layer). */
  base: RGBAImage | null;
  st: Style;
  outline: RGBA8 | null;
}

const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

function autoOutline(tile: RGBAImage): RGBA8 {
  let best: RGBA8 = [0, 0, 0, 255], bl = Infinity;
  for (let i = 0; i < tile.data.length; i += 4) {
    if (tile.data[i + 3] < 128) continue;
    const l = lum(tile.data[i], tile.data[i + 1], tile.data[i + 2]);
    if (l < bl) {
      bl = l;
      best = [tile.data[i], tile.data[i + 1], tile.data[i + 2], 255];
    }
  }
  return [Math.round(best[0] * 0.6), Math.round(best[1] * 0.6), Math.round(best[2] * 0.6), 255];
}

const smoothstep = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Colours the region [x0, x0+w) × [y0, y0+h) of a field canvas. Texture index = canvas coordinate mod T (the same
 * convention as the noise). pixel: hard B/A with optional outline on B pixels that have an A 4-neighbour;
 * cartoon: ~2 px soft band.
 */
function paint(ctx: Ctx, f: Float32Array, W: number, H: number, x0: number, y0: number, w: number, h: number): RGBAImage {
  const { T, over, base } = ctx;
  const out = createImage(w, h);
  const isB = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < W && y < H && f[y * W + x] > 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cx = x0 + x, cy = y0 + y;
      const ti = ((cy % T) * T + (cx % T)) * 4;
      const o = (y * w + x) * 4;
      const fv = f[cy * W + cx];
      if (ctx.mode === 'cartoon') {
        const t = smoothstep(-1, 1, fv);
        if (base) {
          for (let k = 0; k < 3; k++) out.data[o + k] = base.data[ti + k] * (1 - t) + over.data[ti + k] * t;
          out.data[o + 3] = 255;
        } else {
          out.data[o] = over.data[ti];
          out.data[o + 1] = over.data[ti + 1];
          out.data[o + 2] = over.data[ti + 2];
          out.data[o + 3] = Math.round(255 * t);
        }
        continue;
      }
      if (fv > 0) {
        const edge = ctx.outline && (!isB(cx - 1, cy) || !isB(cx + 1, cy) || !isB(cx, cy - 1) || !isB(cx, cy + 1));
        if (edge && ctx.outline) out.data.set(ctx.outline, o);
        else out.data.set(over.data.subarray(ti, ti + 4), o);
      } else if (base) {
        out.data.set(base.data.subarray(ti, ti + 4), o);
      }
    }
  }
  return out;
}

/** 3T×3T canvas for a blob mask: centre cell B, neighbours from the mask bits. */
function blobCanvas(mask: number, T: number): Uint8Array {
  const S = 3 * T;
  const cell = [
    [mask & BLOB_NW, mask & BLOB_N, mask & BLOB_NE],
    [mask & BLOB_W, 1, mask & BLOB_E],
    [mask & BLOB_SW, mask & BLOB_S, mask & BLOB_SE],
  ];
  const bin = new Uint8Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) bin[y * S + x] = cell[Math.floor(y / T)][Math.floor(x / T)] ? 1 : 0;
  return bin;
}

/** 2T×2T canvas for a dual mask: quadrants TL/TR/BL/BR. */
function dualCanvas(mask: number, T: number): Uint8Array {
  const S = 2 * T;
  const bin = new Uint8Array(S * S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const bit = y < T ? (x < T ? DUAL_TL : DUAL_TR) : x < T ? DUAL_BL : DUAL_BR;
      bin[y * S + x] = mask & bit ? 1 : 0;
    }
  }
  return bin;
}

export interface TerrainKit {
  tileA: RGBAImage;
  tileB: RGBAImage | null;
  ctx: Ctx;
  warnings: Warning[];
}

/** Reduces the textures and prepares the shared rendering state (also used by renderTerrainMap). */
export function prepareTerrain(
  core: UnfakeCore | null, a: RGBAImage, b: RGBAImage | null, T: number, s: EdgeStyle, mode: ArtMode, palette?: RGBA8[],
): TerrainKit {
  const warnings: Warning[] = [];
  // Pixel mode with a fixed palette: the textures are remapped first, so the automatic outline and the preview use palette colours.
  const fixed = mode === 'pixel' && palette?.length ? palette : null;
  const tileA = fixed ? remapToPalette([makeSeamlessTile(core, a, T, mode)], fixed)[0] : makeSeamlessTile(core, a, T, mode);
  const tileB = b ? (fixed ? remapToPalette([makeSeamlessTile(core, b, T, mode)], fixed)[0] : makeSeamlessTile(core, b, T, mode)) : null;
  const scoreA = seamScore(tileA);
  if (scoreA > SEAM_WARN) warnings.push({ key: 'warn.notSeamless', params: { which: 'A', score: Math.round(scoreA * 100) / 100 } });
  if (tileB) {
    const scoreB = seamScore(tileB);
    if (scoreB > SEAM_WARN) warnings.push({ key: 'warn.notSeamless', params: { which: 'B', score: Math.round(scoreB * 100) / 100 } });
  }
  const style = normalizeStyle(s, T, warnings);
  // b = null: A is painted over transparent as an upper layer (so "B" = A texture, base = nothing).
  const over = tileB ?? tileA;
  const base = tileB ? tileA : null;
  const outline = style.outline === undefined ? null : style.outline === 'auto' ? autoOutline(over) : style.outline;
  return { tileA, tileB, ctx: { T, mode, over, base, st: makeStyle(style, T), outline: mode === 'pixel' ? outline : null }, warnings };
}

/**
 * One-shot render of a whole 0/1 cell map (w×h cells, 1 = B) with the same field pipeline, without any tile: the
 * reference that a map assembled from tiles must reproduce. Returns (w·T)×(h·T) world pixels.
 * blob47: world cell (x,y) = map cell (x,y). dual16: the map holds DATA cells; the world is the same extent and the
 * tile at vertex (i,j) covers world [i·T − T/2, i·T + T/2) × [j·T − T/2, j·T + T/2).
 */
export function renderTerrainMap(kit: TerrainKit, cells: ArrayLike<number>, w: number, h: number): RGBAImage {
  const { T } = kit.ctx;
  const W = w * T, H = h * T;
  const bin = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) bin[y * W + x] = cells[Math.floor(y / T) * w + Math.floor(x / T)] ? 1 : 0;
  const f = computeField(bin, W, H, T, kit.ctx.st);
  return paint(kit.ctx, f, W, H, 0, 0, W, H);
}

/**
 * Generates the transition tiles. A = base terrain, B = overlay terrain; b = null paints A over transparency
 * (an upper layer to stack on any other terrain; the "A" tile is then fully transparent).
 * blob47: 8×6 atlas, tile i = BLOB47_MASKS[i] at (i % 8, floor(i / 8)), plain A at (7,5).
 * dual16: 4×4 atlas, TileMapDual "Standard" positions (DUAL16_POS), tiles offset by half a tile.
 * Warnings: warn.notSeamless {which, score}, warn.edgeStyleClamped {margin, blur, noiseAmp}, warn.dualOddTile.
 * `opts.palette` (pixel mode): textures and the final atlas are remapped to that fixed palette.
 */
export function composeTransitions(
  core: UnfakeCore | null, a: RGBAImage, b: RGBAImage | null, T: number, layout: TileLayout, s: EdgeStyle, mode: ArtMode,
  opts?: { palette?: RGBA8[] },
): TileSetResult {
  const result = composeRaw(core, a, b, T, layout, s, mode, opts?.palette);
  const fixed = mode === 'pixel' && opts?.palette?.length ? opts.palette : null;
  // Blending can still create off-palette colours (outline, antialiasing of the masks): snap the atlas itself.
  return fixed ? { ...result, atlas: remapToPalette([result.atlas], fixed)[0] } : result;
}

function composeRaw(
  core: UnfakeCore | null, a: RGBAImage, b: RGBAImage | null, T: number, layout: TileLayout, s: EdgeStyle, mode: ArtMode, palette?: RGBA8[],
): TileSetResult {
  const kit = prepareTerrain(core, a, b, T, s, mode, palette);
  const { ctx } = kit;
  const warnings = [...kit.warnings];
  const tiles: TileInfo[] = [];

  if (layout === 'blob47') {
    const cols = 8, rows = 6;
    const atlas = createImage(cols * T, rows * T);
    const S = 3 * T;
    BLOB47_MASKS.forEach((mask, i) => {
      const f = computeField(blobCanvas(mask, T), S, S, T, ctx.st);
      const col = i % cols, row = Math.floor(i / cols);
      blit(atlas, paint(ctx, f, S, S, T, T, T, T), col * T, row * T);
      tiles.push({ col, row, mask, terrain: 0, bits: blobBits(mask) });
    });
    // Plain A tile: no B anywhere. Mask -1 = "pure A" (no B centre).
    const flat = ctx.base ?? createImage(T, T);
    blit(atlas, flat, BLOB_A_POS.col * T, BLOB_A_POS.row * T);
    tiles.push({ ...BLOB_A_POS, mask: -1, terrain: -1, bits: {} });
    return { atlas, tiles, tileSize: T, layout, cols, rows, warnings };
  }

  if (T % 2 !== 0) warnings.push({ key: 'warn.dualOddTile', params: { tileSize: T } });
  const cols = 4, rows = 4;
  const atlas = createImage(cols * T, rows * T);
  const S = 2 * T, half = Math.floor(T / 2);
  for (let mask = 0; mask < 16; mask++) {
    const f = computeField(dualCanvas(mask, T), S, S, T, ctx.st);
    const [col, row] = DUAL16_POS[mask];
    blit(atlas, paint(ctx, f, S, S, half, half, T, T), col * T, row * T);
    tiles.push({ col, row, mask, terrain: mask === 0 ? 0 : mask === 15 ? 1 : -1, bits: dualBits(mask) });
  }
  tiles.sort((x, y) => x.mask - y.mask);
  return { atlas, tiles, tileSize: T, layout, cols, rows, warnings };
}

// ---------------------------------------------------------------- Godot / export

const fl = (n: number): string => String(Math.round(n * 1000) / 1000);

function averageColor(img: RGBAImage, col: number, row: number, T: number): RGBA8 {
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = row * T; y < (row + 1) * T; y++) {
    for (let x = col * T; x < (col + 1) * T; x++) {
      const i = (y * img.width + x) * 4;
      if (img.data[i + 3] < 128) continue;
      r += img.data[i];
      g += img.data[i + 1];
      b += img.data[i + 2];
      n++;
    }
  }
  return n ? [r / n, g / n, b / n, 255] : [128, 128, 128, 255];
}

const gdString = (s: string): string => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

/**
 * Godot 4 TileSet .tres with the terrain set filled in. names = [A, B].
 * blob47: terrain_set mode 0 (Match Corners and Sides) with ONE terrain (0 = B); A has no terrain, so
 * bits are only present (= 0) on B neighbours. dual16: mode 1 (Match Corners) with terrains 0 = A, 1 = B.
 * `png` is the texture file name (relative path, no uid). `opts.aTileTerrainSet` also marks the plain A tile with
 * terrain_set 0 (no terrain) — a variant kept for solver experiments.
 */
export function godotTerrainTileSet(r: TileSetResult, png: string, names: [string, string], opts: { aTileTerrainSet?: boolean } = {}): string {
  const T = r.tileSize;
  const blob = r.layout === 'blob47';
  const lines: string[] = [];
  const sorted = [...r.tiles].sort((x, y) => x.row - y.row || x.col - y.col);
  for (const t of sorted) {
    const p = `${t.col}:${t.row}/0`;
    lines.push(`${p} = 0`);
    const isPlainA = blob && t.mask < 0;
    if (isPlainA && !opts.aTileTerrainSet) continue;
    lines.push(`${p}/terrain_set = 0`);
    if (t.terrain >= 0) lines.push(`${p}/terrain = ${t.terrain}`);
    for (const [name, v] of Object.entries(t.bits)) lines.push(`${p}/terrains_peering_bit/${name} = ${v}`);
  }
  const colorOf = (c: RGBA8): string => `Color(${fl(c[0] / 255)}, ${fl(c[1] / 255)}, ${fl(c[2] / 255)}, 1)`;
  const terrains: string[] = [];
  if (blob) {
    const p = blobPos(255);
    terrains.push(`terrain_set_0/terrain_0/name = ${gdString(names[1])}`, `terrain_set_0/terrain_0/color = ${colorOf(averageColor(r.atlas, p.col, p.row, T))}`);
  } else {
    const [ac, ar] = DUAL16_POS[0], [bc, br] = DUAL16_POS[15];
    terrains.push(
      `terrain_set_0/terrain_0/name = ${gdString(names[0])}`, `terrain_set_0/terrain_0/color = ${colorOf(averageColor(r.atlas, ac, ar, T))}`,
      `terrain_set_0/terrain_1/name = ${gdString(names[1])}`, `terrain_set_0/terrain_1/color = ${colorOf(averageColor(r.atlas, bc, br, T))}`,
    );
  }
  return (
    `[gd_resource type="TileSet" load_steps=3 format=3]\n\n` +
    `[ext_resource type="Texture2D" path="${png}" id="1_tex"]\n\n` +
    `[sub_resource type="TileSetAtlasSource" id="src0"]\n` +
    `texture = ExtResource("1_tex")\n` +
    `texture_region_size = Vector2i(${T}, ${T})\n` +
    lines.join('\n') +
    `\n\n[resource]\n` +
    `tile_size = Vector2i(${T}, ${T})\n` +
    `terrain_set_0/mode = ${blob ? 0 : 1}\n` +
    terrains.join('\n') +
    `\nsources/0 = SubResource("src0")\n`
  );
}

function readme(r: TileSetResult, n: string, names: [string, string]): string {
  const T = r.tileSize;
  const blob = r.layout === 'blob47';
  const rowsTxt = blob
    ? BLOB47_MASKS.map((m, i) => {
        const nb = BLOB_BITS.filter(([bit]) => m & bit).map(([, nm]) => nm.replace('_side', '').replace('_corner', '*'));
        return `  (${i % 8},${Math.floor(i / 8)})  mask ${String(m).padStart(3)}  B neighbours: ${nb.length ? nb.join(' ') : 'none'}`;
      }).join('\n') + `\n  (${BLOB_A_POS.col},${BLOB_A_POS.row})  plain ${names[0]}`
    : Object.keys(DUAL16_POS).map(Number).map((m) => {
        const [c, rw] = DUAL16_POS[m];
        const corners = [[DUAL_TL, 'TL'], [DUAL_TR, 'TR'], [DUAL_BL, 'BL'], [DUAL_BR, 'BR']] as const;
        const b = corners.filter(([bit]) => m & bit).map(([, nm]) => nm);
        return `  (${c},${rw})  mask ${String(m).padStart(2)}  ${names[1]} corners: ${b.length ? b.join(' ') : 'none'}`;
      }).join('\n');
  const layoutEn = blob
    ? `blob47: 47 tiles for "Match Corners and Sides" + the plain ${names[0]} tile at (7,5). A corner (*) only counts when both adjacent sides are ${names[1]}.`
    : `dual16: 16 tiles, one per combination of the 4 corners (TL, TR, BL, BR); each tile is offset HALF a tile from the data cells (dual grid).`;
  const layoutEs = blob
    ? `blob47: 47 tiles para "Match Corners and Sides" + el tile ${names[0]} liso en (7,5). Una esquina (*) solo cuenta si sus dos lados adyacentes son ${names[1]}.`
    : `dual16: 16 tiles, uno por cada combinación de las 4 esquinas (TL, TR, BL, BR); cada tile está desplazado MEDIO tile respecto a las celdas de datos (dual grid).`;
  return `${n} - terrain transitions ${names[0]} / ${names[1]} (${T}x${T})

[EN]
${layoutEn}
Godot 4:
1. Copy this folder into your project (res://tiles/${n}/). ${n}.tres loads ${n}.png by relative path.
2. Add a TileMapLayer, set its Tile Set to ${n}.tres and open the TileMap panel > Terrains tab.
3. Pick the terrain "${names[1]}" and paint: the right tile is chosen automatically.${blob ? '' : `
   Dual16 needs the dual-grid logic of the TileMapDual addon (MIT, "Standard" layout) or the manual table below.`}
4. Pixel art: set Texture Filter = Nearest in the TileMapLayer (or project default).
GDevelop: dual16 is the easiest layout to paint by hand (generate it if you can choose). Import the PNG as a tilemap atlas
(${T}x${T} tiles, ${r.cols} columns) and place tiles by hand following the table below (which tile goes where). Tiled/LDtk load it the same way.

[ES]
${layoutEs}
Godot 4:
1. Copia esta carpeta a tu proyecto (res://tiles/${n}/). ${n}.tres carga ${n}.png con ruta relativa.
2. Añade un TileMapLayer, asigna ${n}.tres como Tile Set y abre el panel TileMap > pestaña Terrains.
3. Elige el terreno "${names[1]}" y pinta: el tile correcto se elige solo.${blob ? '' : `
   Dual16 necesita la lógica dual-grid del addon TileMapDual (MIT, layout "Standard") o la tabla manual de abajo.`}
4. Pixel art: pon Texture Filter = Nearest en el TileMapLayer (o en el proyecto).
GDevelop: dual16 es el layout más fácil de pintar a mano (genéralo si puedes elegir). Importa el PNG como atlas de tilemap
(tiles de ${T}x${T}, ${r.cols} columnas) y coloca los tiles a mano siguiendo la tabla de abajo (qué tile va dónde). Tiled/LDtk lo cargan igual.

TABLE / TABLA (col,row = tile position / posición en el atlas):
${rowsTxt}
`;
}

/** PNG + Godot .tres (terrain set) + README (en + es). names = [A, B] (defaults "A"/"B" when slugging a bare name). */
export function terrainExport(r: TileSetResult, name: string, names: [string, string] = ['base', 'overlay']): ExportFile[] {
  const n = slug(name);
  return [
    { path: `${n}/${n}.png`, data: encodePng(r.atlas) },
    { path: `${n}/${n}.tres`, data: godotTerrainTileSet(r, `${n}.png`, names) },
    { path: `${n}/README.txt`, data: readme(r, n, names) },
  ];
}
