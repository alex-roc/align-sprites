// Tile atlas normalizer: AI tile sheets come with irregular cell sizes and gutters; this finds the real grid and
// resamples every cell to EXACTLY T×T (one resample per tile), then exports Godot (.tres) and Tiled (.tsx).
import { detectBackground, removeBackground } from '../bg/index.ts';
import { distanceTo } from '../color.ts';
import { blit, createImage, crop, resizeNearest } from '../image.ts';
import { encodePng, slug } from '../export/index.ts';
import { binarizeAlpha, sharedPalette, type UnfakeCore } from '../pixel/index.ts';
import { resampleArea } from '../resample/index.ts';
import type { ArtMode, BgOptions, ExportFile, RGBAImage, Rect, Warning } from '../types.ts';

// ---------------------------------------------------------------- grid detection

/** ΔE (CIELab) from the background colour under which a pixel still counts as empty (covers light-grey gutter lines). */
const EMPTY_TOL = 25;
/** A column/row is a gutter candidate when at most this share of its pixels is content (objects may cross gutters). */
const GUTTER_MAX = 0.35;
/** Cell size bounds relative to the average cell of a candidate count (AI grids are not uniform). */
const CELL_MIN = 0.5;
const CELL_MAX = 1.6;

/** 1 = empty (transparent, or within `tol` ΔE of the dominant border colour when the border is mostly one colour). */
function emptyMask(img: RGBAImage, tol = EMPTY_TOL): Uint8Array {
  const { width: W, height: H, data } = img;
  const bg = detectBackground(img);
  const dist = bg.color[3] > 0 && bg.confidence >= 0.4 ? distanceTo(bg.color) : null;
  const out = new Uint8Array(W * H);
  for (let p = 0, i = 0; p < W * H; p++, i += 4) {
    out[p] = data[i + 3] < 128 || (dist !== null && dist(data[i], data[i + 1], data[i + 2]) <= tol) ? 1 : 0;
  }
  return out;
}

/** Share of non-empty pixels per column and per row. */
function profiles(empty: Uint8Array, W: number, H: number): { col: Float64Array; row: Float64Array } {
  const col = new Float64Array(W);
  const row = new Float64Array(H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!empty[y * W + x]) {
        col[x]++;
        row[y]++;
      }
    }
  }
  for (let x = 0; x < W; x++) col[x] /= H;
  for (let y = 0; y < H; y++) row[y] /= W;
  return { col, row };
}

interface Cut {
  pos: number;
  /** 1 - content share at the gutter (1 = clean gutter). */
  strength: number;
}

/** Interior gutter runs (profile <= tMax, not touching the image border), each reduced to its deepest centre. */
function gutterCandidates(p: Float64Array, tMax: number): Cut[] {
  const len = p.length;
  const out: Cut[] = [];
  let x = 0;
  while (x < len) {
    if (p[x] > tMax) {
      x++;
      continue;
    }
    let e = x;
    while (e + 1 < len && p[e + 1] <= tMax) e++;
    if (x > 0 && e < len - 1) out.push(deepestCentre(p, x, e));
    x = e + 1;
  }
  return out;
}

/** Centre of the longest sub-run of [a, b] whose profile is within 0.02 of the run minimum. */
function deepestCentre(p: Float64Array, a: number, b: number, prefer?: number): Cut {
  let m = Infinity;
  for (let i = a; i <= b; i++) if (p[i] < m) m = p[i];
  let bestS = a, bestE = a, bestScore = -Infinity;
  let i = a;
  while (i <= b) {
    if (p[i] > m + 0.02) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 <= b && p[j + 1] <= m + 0.02) j++;
    const score = prefer === undefined ? j - i : -Math.abs((i + j) / 2 - prefer);
    if (score > bestScore) {
      bestScore = score;
      bestS = i;
      bestE = j;
    }
    i = j + 1;
  }
  return { pos: Math.round((bestS + bestE) / 2), strength: 1 - m };
}

/** Best chain 0 → len made of exactly n cells through the gutter candidates, or null. Maximizes the summed strength. */
function fitCount(cands: Cut[], len: number, n: number): Cut[] | null {
  const nodes: Cut[] = [{ pos: 0, strength: 0 }, ...cands, { pos: len, strength: 0 }];
  const K = nodes.length;
  if (n > K - 1) return null;
  const avg = len / n;
  const lo = CELL_MIN * avg, hi = CELL_MAX * avg;
  const NEG = -1e9;
  const dp: Float64Array[] = [];
  const from: Int32Array[] = [];
  for (let j = 0; j <= n; j++) {
    dp.push(new Float64Array(K).fill(NEG));
    from.push(new Int32Array(K).fill(-1));
  }
  dp[0][0] = 0;
  for (let j = 1; j <= n; j++) {
    for (let k = 1; k < K; k++) {
      for (let i = 0; i < k; i++) {
        if (dp[j - 1][i] === NEG) continue;
        const gap = nodes[k].pos - nodes[i].pos;
        if (gap < lo || gap > hi) continue;
        const v = dp[j - 1][i] + nodes[k].strength;
        if (v > dp[j][k]) {
          dp[j][k] = v;
          from[j][k] = i;
        }
      }
    }
  }
  if (dp[n][K - 1] === NEG) return null;
  const chain: Cut[] = [];
  let k = K - 1;
  for (let j = n; j >= 0; j--) {
    chain.push(nodes[k]);
    k = from[j][k];
  }
  return chain.reverse();
}

interface AxisFit {
  /** n + 1 positions, first 0 and last len. */
  cuts: number[];
  /** Mean gutter strength of the interior cuts (0 when there are none). */
  strength: number;
  /** True when every interior cut sits on a real gutter. */
  onGutters: boolean;
}

/** Keep at most this many gutter candidates (the strongest) so the chain search stays cheap on busy images. */
const MAX_CANDIDATES = 120;

function candidatesFor(p: Float64Array): Cut[] {
  let c = gutterCandidates(p, GUTTER_MAX);
  if (c.length > MAX_CANDIDATES) c = [...c].sort((a, b) => b.strength - a.strength).slice(0, MAX_CANDIDATES).sort((a, b) => a.pos - b.pos);
  return c;
}

function summarize(chain: Cut[], len: number): AxisFit {
  const inner = chain.slice(1, -1);
  return {
    cuts: [0, ...inner.map((c) => c.pos), len],
    strength: inner.length ? inner.reduce((s, c) => s + c.strength, 0) / inner.length : 0,
    onGutters: true,
  };
}

/** Uniform cuts nudged to the deepest gutter within ±20 % of the cell; kept uniform where there is no gutter. */
function uniformCuts(p: Float64Array, len: number, n: number): AxisFit {
  const cuts = [0];
  const w = Math.floor((0.2 * len) / n);
  let strength = 0, hits = 0;
  for (let i = 1; i < n; i++) {
    const c = Math.round((i * len) / n);
    const a = Math.max(0, c - w), b = Math.min(len - 1, c + w);
    let pos = c;
    let m = Infinity;
    for (let x = a; x <= b; x++) if (p[x] < m) m = p[x];
    if (m <= 0.5) {
      const d = deepestCentre(p, a, b, c);
      pos = d.pos;
      strength += d.strength;
      hits++;
    }
    cuts.push(Math.max(pos, cuts[cuts.length - 1] + 1));
  }
  cuts.push(len);
  return { cuts, strength: hits ? strength / hits : 0, onGutters: hits === n - 1 };
}

/** Cuts for exactly n cells: the best chain through real gutters, else uniform cuts nudged to the nearest gutter. */
function cutsForCount(p: Float64Array, len: number, n: number): AxisFit {
  if (n <= 1) return { cuts: [0, len], strength: 0, onGutters: true };
  const chain = fitCount(candidatesFor(p), len, n);
  return chain ? summarize(chain, len) : uniformCuts(p, len, n);
}

/** Largest cell count whose cuts all land on gutters (multiples of the true count put cuts inside tiles, so they fail). */
function detectCount(p: Float64Array, len: number): AxisFit {
  const cands = candidatesFor(p);
  for (let n = Math.min(cands.length + 1, len); n >= 2; n--) {
    const chain = fitCount(cands, len, n);
    if (chain) return summarize(chain, len);
  }
  return { cuts: [0, len], strength: 0, onGutters: true };
}

export interface TileGrid {
  cols: number;
  rows: number;
  /** cols + 1 x positions (first 0, last width). Cell c spans [xCuts[c], xCuts[c+1]). */
  xCuts: number[];
  /** rows + 1 y positions. */
  yCuts: number[];
  /** 0..1: how clean the gutters are (mean gutter strength; low when nothing could be detected). */
  confidence: number;
}

/**
 * Finds the cell grid of a tile sheet. Gutters are the interior runs where (almost) no column/row has content
 * (empty = transparent or background-coloured); their deepest centres are the cut lines. The cell count is the
 * largest one for which a chain of gutters with plausible cell sizes exists — this tolerates objects crossing a
 * gutter (hidden strips) and non-uniform cells, and rejects multiples/sub-multiples of the true count.
 */
export function detectTileGrid(img: RGBAImage): TileGrid {
  const { col, row } = profiles(emptyMask(img), img.width, img.height);
  const x = detectCount(col, img.width);
  const y = detectCount(row, img.height);
  const found = [x, y].filter((f) => f.cuts.length > 2);
  const confidence = found.length ? found.reduce((s, f) => s + f.strength, 0) / found.length : 0.2;
  return { cols: x.cuts.length - 1, rows: y.cuts.length - 1, xCuts: x.cuts, yCuts: y.cuts, confidence };
}

/** Cuts for a user-given cols × rows, snapped to real gutters (chain search; fallback ±20 % of the uniform cell). */
export function gridCutsFor(img: RGBAImage, cols: number, rows: number): { xCuts: number[]; yCuts: number[] } {
  const { col, row } = profiles(emptyMask(img), img.width, img.height);
  return { xCuts: cutsForCount(col, img.width, cols).cuts, yCuts: cutsForCount(row, img.height, rows).cuts };
}

// ---------------------------------------------------------------- normalizer

export interface TileAtlasOptions {
  /** Output tile size in px (16/32/48/64…). */
  tileSize: number;
  /** Cell counts; omitted = detected. */
  cols?: number;
  rows?: number;
  mode: ArtMode;
  /** Remove the background before slicing (e.g. white flood for AI sheets on white). */
  bg?: BgOptions;
  /** Default true: use the tile area between gutters instead of the whole cell (same size for every cell). */
  trimGutters?: boolean;
  /** Pixel mode: shared palette across all tiles. */
  maxColors?: number;
}

export interface TileAtlasResult {
  atlas: RGBAImage;
  tileSize: number;
  cols: number;
  rows: number;
  /** One entry per cell (reading order). `source` is the exact source window (original image px) resampled to the tile. */
  tiles: { col: number; row: number; empty: boolean; source: Rect }[];
  /** Keys: warn.tileGridUncertain {confidence %}, warn.tileUpscaled {from, to}. */
  warnings: Warning[];
}

/** Content bounding box (non-empty pixels) inside a rect, or null. */
function contentBox(empty: Uint8Array, W: number, r: Rect): Rect | null {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      if (!empty[y * W + x]) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

const percentile = (v: number[], q: number): number => {
  const s = [...v].sort((a, b) => a - b);
  return s[Math.floor(q * (s.length - 1))];
};

/** Crop/pad (edge replication) to exactly T×T. */
function fitSquare(img: RGBAImage, T: number): RGBAImage {
  if (img.width === T && img.height === T) return img;
  const out = createImage(T, T);
  for (let y = 0; y < T; y++) {
    const sy = Math.min(y, img.height - 1);
    for (let x = 0; x < T; x++) {
      const si = (sy * img.width + Math.min(x, img.width - 1)) * 4;
      out.data.set(img.data.subarray(si, si + 4), (y * T + x) * 4);
    }
  }
  return out;
}

/**
 * Normalizes a tile sheet to an atlas of exact T×T tiles. Per cell: the tile window (same size for every cell,
 * centred on the content when the tile is full, else on the cell) is reduced to T×T in ONE resample
 * (pixel: unfake grid downscale with period window/T, dominant colour, binary alpha; cartoon: area filter).
 */
export function normalizeTileAtlas(core: UnfakeCore | null, img: RGBAImage, o: TileAtlasOptions): TileAtlasResult {
  const T = o.tileSize;
  const warnings: Warning[] = [];
  const work = o.bg ? removeBackground(img, o.bg, o.mode) : img;
  const { width: W, height: H } = work;
  const empty = emptyMask(work);
  // "Solid" content: fully opaque and not background-like. Tile boxes use it so the antialiased edge band
  // (semi-transparent in transparent sheets, pale in white sheets) never widens the tile window.
  const solid = new Uint8Array(empty);
  for (let p = 0; p < W * H; p++) if (work.data[p * 4 + 3] < 250) solid[p] = 1;
  const { col: colP, row: rowP } = profiles(empty, W, H);
  // Strict background test (near-pure bg only) for the full-bleed check: pale sky is not background.
  const origPure = o.bg ? emptyMask(img, 8) : empty;

  const det = o.cols && o.rows ? null : detectTileGrid(work);
  const xFit = o.cols ? cutsForCount(colP, W, o.cols) : { cuts: det!.xCuts };
  const yFit = o.rows ? cutsForCount(rowP, H, o.rows) : { cuts: det!.yCuts };
  const cols = xFit.cuts.length - 1, rows = yFit.cuts.length - 1;
  if (det && det.confidence < 0.6) warnings.push({ key: 'warn.tileGridUncertain', params: { confidence: Math.round(det.confidence * 100) } });

  // Cell rects and their content boxes.
  const rects: Rect[] = [];
  const boxes: (Rect | null)[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const rect = { x: xFit.cuts[c], y: yFit.cuts[r], w: xFit.cuts[c + 1] - xFit.cuts[c], h: yFit.cuts[r + 1] - yFit.cuts[r] };
      rects.push(rect);
      boxes.push(contentBox(solid, W, rect));
    }
  }

  // Tile window size: the 75th percentile of the content size (full tiles dominate; sparse props are smaller).
  const trim = o.trimGutters !== false;
  const full = boxes.filter((b): b is Rect => b !== null);
  const winW = trim && full.length ? Math.round(percentile(full.map((b) => b.w), 0.75)) : 0;
  const winH = trim && full.length ? Math.round(percentile(full.map((b) => b.h), 0.75)) : 0;

  const atlas = createImage(cols * T, rows * T);
  const tiles: TileAtlasResult['tiles'] = [];
  const images: RGBAImage[] = [];
  let upscaled = 0;
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i], box = boxes[i];
    let src = rect;
    if (trim && winW > 0) {
      // Tiles whose art is (nearly) the window size use the art box itself; props are centred on their cell.
      const axis = (b0: number | null, bl: number, w: number, c0: number, cl: number): [number, number] =>
        b0 !== null && bl >= 0.9 * w && bl <= 1.04 * w ? [b0, bl] : [Math.round(c0 + cl / 2 - w / 2), w];
      const w = Math.min(winW, rect.w), h = Math.min(winH, rect.h);
      const [x, sw] = axis(box ? box.x : null, box ? box.w : 0, w, rect.x, rect.w);
      const [y, sh] = axis(box ? box.y : null, box ? box.h : 0, h, rect.y, rect.h);
      src = { x, y, w: sw, h: sh };
    }
    // Full-bleed tiles (sky, ground, water) keep their own bg-coloured art (clouds touching the edge are connected to
    // the background by the flood), so they are cut from the untouched sheet.
    const win = crop(o.bg && isFullBleed(origPure, W, src) ? img : work, src);
    const isEmpty = !box || nonEmptyShare(empty, W, src) < 0.01;
    let tile: RGBAImage;
    if (isEmpty) {
      tile = createImage(T, T);
    } else {
      if (src.w < 0.9 * T || src.h < 0.9 * T) upscaled++;
      tile = reduceToTile(core, win, T, o.mode);
    }
    tiles.push({ col: i % cols, row: Math.floor(i / cols), empty: isEmpty, source: src });
    images.push(tile);
  }

  let outImages = images;
  if (o.mode === 'pixel' && core && (o.maxColors ?? 0) > 0) {
    const idx = tiles.map((t, i) => (t.empty ? -1 : i)).filter((i) => i >= 0);
    const { images: q } = sharedPalette(core, idx.map((i) => images[i]), o.maxColors!);
    outImages = [...images];
    idx.forEach((i, k) => (outImages[i] = q[k]));
  }
  outImages.forEach((tile, i) => blit(atlas, tile, tiles[i].col * T, tiles[i].row * T));

  if (upscaled > 0) warnings.push({ key: 'warn.tileUpscaled', params: { count: upscaled, to: T } });
  return { atlas, tileSize: T, cols, rows, tiles, warnings };
}

/** True when the window is almost all content and at least 3 of its 4 edge bands (2 px) are too: no background of its own. */
function isFullBleed(empty: Uint8Array, W: number, r: Rect): boolean {
  const share = (x0: number, y0: number, w: number, h: number): number => nonEmptyShare(empty, W, { x: x0, y: y0, w, h });
  const b = 2;
  const bands = [
    share(r.x, r.y, r.w, b), share(r.x, r.y + r.h - b, r.w, b),
    share(r.x, r.y, b, r.h), share(r.x + r.w - b, r.y, b, r.h),
  ];
  return share(r.x, r.y, r.w, r.h) >= 0.8 && bands.filter((v) => v >= 0.7).length >= 3;
}

function nonEmptyShare(empty: Uint8Array, W: number, r: Rect): number {
  let n = 0, total = 0;
  const H = empty.length / W;
  for (let y = Math.max(0, r.y); y < Math.min(H, r.y + r.h); y++) {
    for (let x = Math.max(0, r.x); x < Math.min(W, r.x + r.w); x++) {
      total++;
      if (!empty[y * W + x]) n++;
    }
  }
  return total ? n / total : 0;
}

/** One resample of a tile window to T×T. */
function reduceToTile(core: UnfakeCore | null, win: RGBAImage, T: number, mode: ArtMode): RGBAImage {
  if (mode === 'cartoon') return resampleArea(win, T, T);
  const px = win.width / T, py = win.height / T;
  if (!core || px <= 1.0001 || py <= 1.0001) return binarizeAlpha(resizeNearest(win, T, T));
  // Slightly shrink the period so floating-point error never yields T-1 cells; fitSquare handles any residual ±1.
  const g = { periodX: px * (1 - 1e-9), periodY: py * (1 - 1e-9), offsetX: 0, offsetY: 0 };
  return binarizeAlpha(fitSquare(core.downscaleGrid(win, g, 'dominant'), T));
}

// ---------------------------------------------------------------- export

/** TileSet .tres: one TileSetAtlasSource, a `c:r/0 = 0` line per non-empty tile, relative texture path (no uid). */
export function tileAtlasGodot(r: TileAtlasResult, name: string): ExportFile[] {
  const n = slug(name);
  const T = r.tileSize;
  const lines = r.tiles.filter((t) => !t.empty).map((t) => `${t.col}:${t.row}/0 = 0`);
  const tres =
    `[gd_resource type="TileSet" load_steps=3 format=3]\n\n` +
    `[ext_resource type="Texture2D" path="${n}.png" id="1_tex"]\n\n` +
    `[sub_resource type="TileSetAtlasSource" id="src0"]\n` +
    `texture = ExtResource("1_tex")\n` +
    `texture_region_size = Vector2i(${T}, ${T})\n` +
    lines.join('\n') +
    (lines.length ? '\n' : '') +
    `\n[resource]\n` +
    `tile_size = Vector2i(${T}, ${T})\n` +
    `sources/0 = SubResource("src0")\n`;
  return [
    { path: `${n}/${n}.png`, data: encodePng(r.atlas) },
    { path: `${n}/${n}.tres`, data: tres },
  ];
}

const xmlAttr = (s: string): string => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Tiled .tsx (tile size + atlas image, no margin/spacing). GDevelop's Tilemap object and Tiled/LDtk maps read it. */
export function tileAtlasTiled(r: TileAtlasResult, name: string): ExportFile[] {
  const n = slug(name);
  const T = r.tileSize;
  const tsx =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<tileset version="1.10" tiledversion="1.10.2" name="${xmlAttr(n)}" tilewidth="${T}" tileheight="${T}" tilecount="${r.cols * r.rows}" columns="${r.cols}">\n` +
    ` <image source="${xmlAttr(n)}.png" width="${r.atlas.width}" height="${r.atlas.height}"/>\n` +
    `</tileset>\n`;
  return [
    { path: `${n}/${n}.png`, data: encodePng(r.atlas) },
    { path: `${n}/${n}.tsx`, data: tsx },
  ];
}
