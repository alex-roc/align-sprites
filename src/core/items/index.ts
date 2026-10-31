// Items and icons: an AI image with many separate objects (coins, potions, keys, gems, UI icons) becomes an atlas of
// exact square cells. Every item is FITTED (aspect kept, never stretched) and centred; by default all share ONE scale
// so relative sizes survive (a coin stays smaller than a sword), or each one fills its cell (icons).
import { removeBackground } from '../bg/index.ts';
import { alphaBBox, blit, createImage, crop } from '../image.ts';
import { remapToPalette } from '../palette/index.ts';
import { frameToArt, sharedPalette, type UnfakeCore } from '../pixel/index.ts';
import { resampleScale } from '../resample/index.ts';
import { isolateRegions } from '../segment/isolate.ts';
import { labelComponents, readingOrder, type Comp } from '../segment/index.ts';
import { gridCutsFor } from '../tiles/index.ts';
import type { ArtMode, BgOptions, FrameRegion, RGBA8, RGBAImage, Rect, Warning } from '../types.ts';

export { itemsExport, itemNames, type ItemsExportOptions } from './export.ts';

export interface ItemsOptions {
  /** Output cell size in px (16/32/48/64…): every item sits in a cell of cellSize × cellSize. */
  cellSize: number;
  mode: ArtMode;
  /** Remove the background first (white flood for AI sheets on white, chroma key for magenta/green). */
  bg?: BgOptions;
  /** 'common' (default): one scale for all, the largest item fills the cell. 'each': every item fills its cell. */
  fill?: 'common' | 'each';
  /** Empty px kept on every side of the cell (default 1). */
  margin?: number;
  /** Atlas columns; omitted = the squarest layout. */
  cols?: number;
  /** Find items inside a cols × rows grid (cuts snapped to the gutters) instead of by separate shapes. */
  grid?: { cols: number; rows: number };
  /** Detected item numbers left out of the atlas (and out of the common scale). */
  exclude?: number[];
  /** Pixel mode: shared palette across all items. */
  maxColors?: number;
  /** Pixel mode: fixed palette; every pixel snaps to its nearest colour. Wins over maxColors. */
  palette?: RGBA8[];
}

/** An item the detector found, whether it is in the atlas or crossed out. */
export interface DetectedItem {
  index: number;
  /** Tight box in the original image (px). */
  source: Rect;
  excluded: boolean;
}

export interface ItemEntry {
  /** Detection number (stable under exclusions, it names the item: item_03). */
  index: number;
  /** Default name `item_NN`. */
  name: string;
  col: number;
  row: number;
  /** Its cell in the atlas. */
  rect: Rect;
  /** Where the art sits in the atlas (inside rect). */
  content: Rect;
  source: Rect;
}

export interface ItemsResult {
  atlas: RGBAImage;
  mode: ArtMode;
  cellSize: number;
  cols: number;
  rows: number;
  /** Items in the atlas, reading order. */
  items: ItemEntry[];
  /** Every item found, crossed-out ones included. */
  detected: DetectedItem[];
  /** Keys: warn.noItems, warn.itemsSmall {largest, cell}, warn.itemsTiny {count}. */
  warnings: Warning[];
}

// ---------------------------------------------------------------- detection

/** Components smaller than this share of the largest one are specks (dropped before merging). */
const SPECK_RATIO = 0.005;
/** After merging, shapes under this share of the median area are debris. */
const DEBRIS_RATIO = 0.02;
const MAX_COMPONENTS = 3000;

const gapX = (a: Comp, b: Comp): number => Math.max(0, Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1) - 1);
const gapY = (a: Comp, b: Comp): number => Math.max(0, Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1) - 1);
const inside = (a: Comp, b: Comp): boolean => a.x0 >= b.x0 && a.x1 <= b.x1 && a.y0 >= b.y0 && a.y1 <= b.y1;

function extend(a: Comp, b: Comp): void {
  a.x0 = Math.min(a.x0, b.x0);
  a.y0 = Math.min(a.y0, b.y0);
  a.x1 = Math.max(a.x1, b.x1);
  a.y1 = Math.max(a.y1, b.y1);
  a.area += b.area;
}

/**
 * Separate shapes of an image with transparent background, in reading order. Pieces that touch, sit within
 * `mergeDist` px of each other, or lie inside another piece's box (a gem inside a ring) belong to one item.
 */
export function findItems(img: RGBAImage, mergeDist = Math.max(2, Math.round(Math.min(img.width, img.height) * 0.012))): FrameRegion[] {
  const { comps } = labelComponents(img);
  if (!comps.length) return [];
  const maxArea = Math.max(...comps.map((c) => c.area));
  let groups = comps.filter((c) => c.area >= maxArea * SPECK_RATIO).sort((a, b) => b.area - a.area).slice(0, MAX_COMPONENTS).map((c) => ({ ...c }));
  for (let merged = true; merged; ) {
    merged = false;
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const a = groups[i], b = groups[j];
        if ((gapX(a, b) <= mergeDist && gapY(a, b) <= mergeDist) || inside(a, b) || inside(b, a)) {
          extend(a, b);
          groups.splice(j--, 1);
          merged = true;
        }
      }
    }
  }
  const areas = groups.map((g) => g.area).sort((x, y) => x - y);
  const median = areas[Math.floor(areas.length / 2)];
  groups = groups.filter((g) => g.area >= median * DEBRIS_RATIO);
  return readingOrder(groups);
}

/** Tight box of the opaque pixels inside each cell of a cols × rows grid (cells without content are skipped). */
function gridItems(img: RGBAImage, cols: number, rows: number): FrameRegion[] {
  const { xCuts, yCuts } = gridCutsFor(img, cols, rows);
  const out: FrameRegion[] = [];
  for (let r = 0; r + 1 < yCuts.length; r++) {
    for (let c = 0; c + 1 < xCuts.length; c++) {
      const cell = { x: xCuts[c], y: yCuts[r], w: xCuts[c + 1] - xCuts[c], h: yCuts[r + 1] - yCuts[r] };
      const b = alphaBBox(crop(img, cell), 128);
      if (b) out.push({ rect: { x: cell.x + b.x, y: cell.y + b.y, w: b.w, h: b.h }, row: r, col: c });
    }
  }
  return out;
}

// ---------------------------------------------------------------- fitting

const maxDim = (img: RGBAImage): number => Math.max(img.width, img.height);
const EMPTY_ITEM = (): RGBAImage => createImage(1, 1);

/** Crop to the opaque pixels (a 1×1 transparent image when there are none). */
function trim(img: RGBAImage, alphaMin: number): RGBAImage {
  const b = alphaBBox(img, alphaMin);
  return b ? crop(img, b) : EMPTY_ITEM();
}

const PERIOD_PASSES = 10;

/**
 * Art-pixel versions of `crops` whose longest side is at most `size`, as close to it as the grid allows. Always
 * resampled from the ORIGINAL crops (single resample): the first guess scales the period by L/size and a few
 * corrections absorb the ±1 px of grid phase. Native when everything already fits (pixel art is never upscaled).
 */
function fitPixel(core: UnfakeCore, crops: RGBAImage[], period: number, size: number): RGBAImage[] {
  const art = (p: number) => crops.map((c) => trim(frameToArt(core, c, p, p < period ? 'nearest' : 'dominant'), 128));
  const native = art(period);
  let L = Math.max(...native.map(maxDim));
  if (L <= size) return native;
  let best: RGBAImage[] | null = null;
  let bestL = 0;
  let p = (period * L) / size;
  for (let pass = 0; pass < PERIOD_PASSES; pass++) {
    const arts = art(p);
    L = Math.max(...arts.map(maxDim));
    if (L <= size && L > bestL) {
      best = arts;
      bestL = L;
    }
    if (L === size) break;
    p = L > size ? p * Math.max(L / size, 1.02) : p * (L / size);
  }
  return best ?? art(p * 2);
}

/** Area-filter scale of each trimmed crop so the longest of all (or each one, with `each`) ends at `size`. */
function fitCartoon(crops: RGBAImage[], size: number, each: boolean): RGBAImage[] {
  const tight = crops.map((c) => trim(c, 1));
  const longest = Math.max(...tight.map(maxDim));
  return tight.map((t) => {
    let s = size / (each ? maxDim(t) : longest);
    for (let k = 0; k < 6; k++) {
      const out = trim(resampleScale(t, s), 1);
      if (maxDim(out) <= size) return out;
      s *= 0.97;
    }
    return trim(resampleScale(t, s), 1);
  });
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * Normalizes an items sheet. Background out, items found (separate shapes or a grid), each one resampled ONCE from
 * its original crop (pixel: unfake period detected on the whole sheet; cartoon: area filter), centred in a
 * cellSize × cellSize cell with `margin` px around, and laid out in an atlas.
 */
export function normalizeItems(core: UnfakeCore | null, img: RGBAImage, o: ItemsOptions): ItemsResult {
  const warnings: Warning[] = [];
  const T = o.cellSize;
  const margin = Math.max(0, Math.min(o.margin ?? 1, Math.floor((T - 1) / 2)));
  const size = T - 2 * margin;
  const each = o.fill === 'each';
  const clean = o.bg ? removeBackground(img, o.bg, o.mode) : img;

  const regions = o.grid ? gridItems(clean, o.grid.cols, o.grid.rows) : findItems(clean);
  const skip = new Set(o.exclude ?? []);
  const detected: DetectedItem[] = regions.map((r, index) => ({ index, source: r.rect, excluded: skip.has(index) }));
  const kept = detected.filter((d) => !d.excluded);
  if (!kept.length) {
    warnings.push({ key: 'warn.noItems' });
    return { atlas: createImage(T, T), mode: o.mode, cellSize: T, cols: 1, rows: 1, items: [], detected, warnings };
  }

  // Pixel art: the period comes from the whole sheet, once; each crop is then downscaled from the original.
  let period = 1;
  if (o.mode === 'pixel') {
    if (!core) throw new Error('Pixel mode needs the unfake core');
    const g = core.detectGrid(img);
    if (g) period = (g.periodX + g.periodY) / 2;
  }
  const pad = o.mode === 'pixel' ? Math.ceil(period) * 2 : 2;
  const crops = isolateRegions(clean, kept.map((d) => ({ rect: d.source, row: 0, col: 0 })), pad);
  let arts: RGBAImage[];
  if (o.mode === 'pixel') {
    arts = each ? crops.flatMap((c) => fitPixel(core!, [c], period, size)) : fitPixel(core!, crops, period, size);
  } else {
    arts = fitCartoon(crops, size, each);
  }

  const fixed = o.mode === 'pixel' && o.palette?.length ? o.palette : null;
  if (fixed) arts = remapToPalette(arts, fixed);
  else if (o.mode === 'pixel' && core && (o.maxColors ?? 0) > 0) arts = sharedPalette(core, arts, o.maxColors!).images;

  const n = arts.length;
  const cols = Math.max(1, Math.min(n, o.cols ?? Math.ceil(Math.sqrt(n))));
  const rows = Math.ceil(n / cols);
  const atlas = createImage(cols * T, rows * T);
  const items: ItemEntry[] = arts.map((art, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const rect = { x: col * T, y: row * T, w: T, h: T };
    const x = rect.x + Math.floor((T - art.width) / 2), y = rect.y + Math.floor((T - art.height) / 2);
    blit(atlas, art, x, y);
    const index = kept[i].index;
    return { index, name: `item_${pad2(index)}`, col, row, rect, content: { x, y, w: art.width, h: art.height }, source: kept[i].source };
  });

  const largest = Math.max(...arts.map(maxDim));
  if (o.mode === 'pixel' && largest < 0.6 * size) warnings.push({ key: 'warn.itemsSmall', params: { largest, cell: T } });
  if (!each && n > 1) {
    const tiny = arts.filter((a) => maxDim(a) < 0.3 * size).length;
    if (tiny > 0) warnings.push({ key: 'warn.itemsTiny', params: { count: tiny } });
  }
  return { atlas, mode: o.mode, cellSize: T, cols, rows, items, detected, warnings };
}
