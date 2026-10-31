// Frame segmentation on an image whose background is already transparent.
import type { FrameRegion, Rect, RGBAImage } from '../types.ts';

/**
 * A pixel counts as content when alpha >= OPAQUE. Real AI sheets carry stray semi-transparent pixels and
 * soft halos; thresholding at 128 keeps them from bridging frames or inflating bboxes (the crop taken later
 * with the rect still contains the soft edge pixels inside it).
 */
const OPAQUE = 128;

/**
 * Split into rows×cols equal cells. If snapGutters (default true), each cut line moves to the nearest
 * fully-transparent column/row (alpha profile) within ±25% of the cell size, so sprites that overflow the
 * nominal cell are not cut. Returned rects are the cells (not tight bboxes), in reading order.
 * Cells that are fully transparent are omitted.
 */
export function sliceGrid(img: RGBAImage, rows: number, cols: number, snapGutters = true): FrameRegion[] {
  const { width: W, height: H, data } = img;
  rows = Math.max(1, Math.floor(rows));
  cols = Math.max(1, Math.floor(cols));

  // Opaque-pixel counts per column and per row ("empty" = no pixel >= OPAQUE).
  const colCount = new Int32Array(W);
  const rowCount = new Int32Array(H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (data[(y * W + x) * 4 + 3] >= OPAQUE) {
        colCount[x]++;
        rowCount[y]++;
      }

  const xs = cutLines(W, cols, colCount, snapGutters);
  const ys = cutLines(H, rows, rowCount, snapGutters);

  const out: FrameRegion[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const rect: Rect = { x: xs[c], y: ys[r], w: xs[c + 1] - xs[c], h: ys[r + 1] - ys[r] };
      if (rect.w <= 0 || rect.h <= 0 || !hasContent(img, rect)) continue;
      out.push({ rect, row: r, col: c });
    }
  return out;
}

/** n+1 monotone boundaries over [0, size]; interior ones snapped to the middle of the nearest empty run. */
function cutLines(size: number, n: number, count: Int32Array, snap: boolean): number[] {
  const cuts = [0];
  const cellSize = size / n;
  const reach = Math.floor(cellSize * 0.25);
  for (let i = 1; i < n; i++) {
    const nominal = Math.round(i * cellSize);
    let cut = nominal;
    if (snap) {
      const lo = Math.max(cuts[i - 1] + 1, nominal - reach);
      const hi = Math.min(size - 1, nominal + reach);
      let best = -1;
      for (let d = 0; d <= reach && best < 0; d++) {
        if (nominal - d >= lo && count[nominal - d] === 0) best = nominal - d;
        else if (nominal + d <= hi && count[nominal + d] === 0) best = nominal + d;
      }
      if (best >= 0) {
        let a = best, b = best;
        while (a - 1 >= lo && count[a - 1] === 0) a--;
        while (b + 1 <= hi && count[b + 1] === 0) b++;
        cut = Math.round((a + b) / 2);
      }
    }
    cuts.push(Math.max(cuts[i - 1], Math.min(size, cut)));
  }
  cuts.push(size);
  return cuts;
}

function hasContent(img: RGBAImage, r: Rect): boolean {
  for (let y = r.y; y < r.y + r.h; y++)
    for (let x = r.x; x < r.x + r.w; x++) if (img.data[(y * img.width + x) * 4 + 3] >= OPAQUE) return true;
  return false;
}

export interface FindFramesOptions {
  /** Ignore components smaller than this fraction of the largest component's area (default 0.01). */
  minAreaRatio?: number;
  /** Merge components whose bboxes are within this many px (default: 2% of image min side). */
  mergeDist?: number;
  /** Expected frame count, if known (used only for a warning upstream; never forces a split). */
  expected?: number;
}

export interface Comp {
  x0: number;
  y0: number;
  x1: number; // inclusive
  y1: number; // inclusive
  area: number;
}

/** Cap on substantial components entering the O(n²) merge (tilesets can have thousands). */
const MAX_COMPONENTS = 3000;
/** Components with at least this fraction of the largest area are "substantial": candidate frames on their own. */
const SUBSTANTIAL_RATIO = 0.2;
/** Vertical gap (fraction of the taller bbox) allowed for the horizontal-overlap rule when attaching parts. */
const OVERLAP_MAX_GAP = 0.2;

/**
 * Auto-detect frames: 8-connected components on alpha>=128 (see OPAQUE), drop specks, merge components that
 * are close (bbox distance <= mergeDist) or overlap horizontally > 50% of the narrower one (detached
 * weapons/effects, hair) while vertically near, then order in reading order: group into rows by vertical
 * overlap, sort rows top→bottom and items left→right. rect = tight bbox of the merged component.
 * row/col = position in that ordering.
 *
 * Two phases keep neighbouring frames apart (AI sheets often have bboxes that overlap by a few px):
 *  1. substantial components (area >= 20% of the largest) only merge when stacked: horizontal overlap > 50%
 *     of the narrower and vertical gap <= mergeDist (floating head over a body). Side by side they never do.
 *  2. every smaller component ("part": weapon, hair tuft, shadow, speck) attaches to the nearest group it
 *     matches (close, or overlapping horizontally and vertically near). Parts never bridge two groups:
 *     a speck matching several groups is dropped; unmatched parts below minAreaRatio are dropped, larger ones
 *     stay as their own frame.
 */
export function findFrames(img: RGBAImage, o: FindFramesOptions = {}): FrameRegion[] {
  const minAreaRatio = o.minAreaRatio ?? 0.01;
  const mergeDist = o.mergeDist ?? Math.max(1, Math.round(Math.min(img.width, img.height) * 0.02));

  const { comps } = labelComponents(img);
  if (!comps.length) return [];
  let maxArea = 0;
  for (const c of comps) if (c.area > maxArea) maxArea = c.area;
  const minArea = maxArea * minAreaRatio;
  const substantialArea = Math.max(minArea, maxArea * SUBSTANTIAL_RATIO);

  let solid = comps.filter((c) => c.area >= substantialArea);
  if (solid.length > MAX_COMPONENTS) solid = solid.sort((a, b) => b.area - a.area).slice(0, MAX_COMPONENTS);
  const groups = mergeComponents(solid, mergeDist);

  const parts = comps.filter((c) => c.area < substantialArea).sort((a, b) => b.area - a.area);
  for (const part of parts) {
    let best: Comp | null = null;
    let bestD = Infinity;
    let hits = 0;
    for (const g of groups) {
      if (!partMatches(part, g, mergeDist)) continue;
      hits++;
      const { dx, dy } = boxGap(part, g);
      if (dx + dy < bestD) {
        bestD = dx + dy;
        best = g;
      }
    }
    if (part.area < minArea) {
      if (hits === 1 && best) extend(best, part);
    } else if (best) extend(best, part);
    else groups.push({ ...part });
  }

  return readingOrder(groups);
}

/**
 * Two-pass 8-connected labelling (alpha >= OPAQUE) with union-find over Int32Arrays.
 * Returns bbox+area per component and a per-pixel map to the component index (-1 = none).
 */
export function labelComponents(img: RGBAImage): { comps: Comp[]; map: Int32Array } {
  const { width: W, height: H, data } = img;
  const labels = new Int32Array(W * H); // 0 = background
  // Upper bound on provisional labels: each new label needs a pixel with no labelled W/NW/N/NE neighbour.
  const parent = new Int32Array((((W + 1) >> 1) * ((H + 1) >> 1)) + 2);
  let next = 1;
  const find = (a: number): number => {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]];
      a = parent[a];
    }
    return a;
  };
  const union = (a: number, b: number) => {
    const ra = find(a), rb = find(b);
    if (ra === rb) return;
    if (ra < rb) parent[rb] = ra;
    else parent[ra] = rb;
  };

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (data[p * 4 + 3] < OPAQUE) continue;
      const w = x > 0 ? labels[p - 1] : 0;
      const nw = x > 0 && y > 0 ? labels[p - W - 1] : 0;
      const n = y > 0 ? labels[p - W] : 0;
      const ne = x < W - 1 && y > 0 ? labels[p - W + 1] : 0;
      let l = 0;
      for (const v of [w, nw, n, ne]) {
        if (!v) continue;
        if (!l) l = v;
        else union(l, v);
      }
      if (!l) {
        l = next++;
        parent[l] = l;
      }
      labels[p] = l;
    }
  }

  const index = new Int32Array(next).fill(-1);
  const comps: Comp[] = [];
  const map = new Int32Array(W * H).fill(-1);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const l = labels[y * W + x];
      if (!l) continue;
      const root = find(l);
      let k = index[root];
      if (k < 0) {
        k = comps.length;
        index[root] = k;
        comps.push({ x0: x, y0: y, x1: x, y1: y, area: 0 });
      }
      map[y * W + x] = k;
      const c = comps[k];
      if (x < c.x0) c.x0 = x;
      if (x > c.x1) c.x1 = x;
      c.y1 = y; // rows are scanned top→bottom
      c.area++;
    }
  return { comps, map };
}

/** Empty space between two bboxes per axis (0 if they overlap on that axis). */
function boxGap(a: Comp, b: Comp): { dx: number; dy: number } {
  return {
    dx: Math.max(0, Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1) - 1),
    dy: Math.max(0, Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1) - 1),
  };
}

function extend(a: Comp, b: Comp): void {
  a.x0 = Math.min(a.x0, b.x0);
  a.y0 = Math.min(a.y0, b.y0);
  a.x1 = Math.max(a.x1, b.x1);
  a.y1 = Math.max(a.y1, b.y1);
  a.area += b.area;
}

/** Substantial pair: only stacked pieces merge (see findFrames). */
function shouldMerge(a: Comp, b: Comp, mergeDist: number): boolean {
  const { dy } = boxGap(a, b);
  return dy <= mergeDist && overlapsHorizontally(a, b);
}

/** Part vs group: close, or horizontally overlapping and vertically near (shadow, floating weapon, hair). */
function partMatches(part: Comp, g: Comp, mergeDist: number): boolean {
  const { dx, dy } = boxGap(part, g);
  if (dx <= mergeDist && dy <= mergeDist) return true;
  if (!overlapsHorizontally(part, g)) return false;
  const tall = Math.max(part.y1 - part.y0, g.y1 - g.y0) + 1;
  return dy <= Math.max(mergeDist, OVERLAP_MAX_GAP * tall);
}

/** Horizontal overlap > 50% of the narrower bbox. */
function overlapsHorizontally(a: Comp, b: Comp): boolean {
  const overlap = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) + 1;
  const narrower = Math.min(a.x1 - a.x0, b.x1 - b.x0) + 1;
  return overlap > 0.5 * narrower;
}

/** Fixed-point merge on group bboxes (a merged group may now touch further components). */
function mergeComponents(input: Comp[], mergeDist: number): Comp[] {
  let groups = input.map((c) => ({ ...c }));
  for (;;) {
    const n = groups.length;
    const parent = Array.from({ length: n }, (_, i) => i);
    const find = (a: number): number => {
      while (parent[a] !== a) a = parent[a] = parent[parent[a]];
      return a;
    };
    let merged = false;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const ri = find(i), rj = find(j);
        if (ri !== rj && shouldMerge(groups[i], groups[j], mergeDist)) {
          parent[rj] = ri;
          merged = true;
        }
      }
    if (!merged) return groups;
    const byRoot = new Map<number, Comp>();
    groups.forEach((g, i) => {
      const r = find(i);
      const cur = byRoot.get(r);
      if (cur) extend(cur, g);
      else byRoot.set(r, { ...g });
    });
    groups = [...byRoot.values()];
  }
}

/** Rows by vertical overlap (top→bottom), items left→right inside each row. */
export function readingOrder(groups: Comp[]): FrameRegion[] {
  const sorted = [...groups].sort((a, b) => a.y0 + a.y1 - (b.y0 + b.y1));
  const rows: { y0: number; y1: number; items: Comp[] }[] = [];
  for (const g of sorted) {
    const gh = g.y1 - g.y0 + 1;
    const row = rows.find((r) => {
      const overlap = Math.min(r.y1, g.y1) - Math.max(r.y0, g.y0) + 1;
      return overlap > 0.5 * Math.min(gh, r.y1 - r.y0 + 1);
    });
    if (row) {
      row.items.push(g);
      row.y0 = Math.min(row.y0, g.y0);
      row.y1 = Math.max(row.y1, g.y1);
    } else rows.push({ y0: g.y0, y1: g.y1, items: [g] });
  }
  rows.sort((a, b) => a.y0 + a.y1 - (b.y0 + b.y1));
  const out: FrameRegion[] = [];
  rows.forEach((r, ri) => {
    r.items.sort((a, b) => a.x0 - b.x0);
    r.items.forEach((g, ci) =>
      out.push({ rect: { x: g.x0, y: g.y0, w: g.x1 - g.x0 + 1, h: g.y1 - g.y0 + 1 }, row: ri, col: ci }),
    );
  });
  return out;
}
