// Parallax layers: AI background layers (far → near) → looping layers at the game height, ready for export.
// Order of work per layer: optional background removal, ONE resample from the original (cartoon: area filter to the
// game height; pixel art: the unfake grid downscale to the art's own pixels), optional shared palette, the seamless
// loop, and for pixel art an integer enlargement that is fitted to the game height at the top (the art keeps its grid).
import { autoBgOptions, chooseStrategy, detectBackground, removeBackground } from '../bg/index.ts';
import { createImage, crop, resizeNearest } from '../image.ts';
import { remapToPalette } from '../palette/index.ts';
import type { UnfakeCore } from '../pixel/index.ts';
import { resampleArea } from '../resample/index.ts';
import type { ArtMode, BgOptions, RGBA8, RGBAImage, Warning } from '../types.ts';
import { ALREADY_LOOPS, LOOP_WARN, bestLoop, loopScore } from './loop.ts';

export interface ParallaxInput {
  image: RGBAImage;
  /** Cut the flat background colour out (nearer layers on a chroma key). */
  removeBg: boolean;
  /** Scroll factor: 0 = fixed to the screen, 1 = moves with the camera. */
  factor: number;
}

export interface ParallaxOptions {
  mode: ArtMode;
  /** Game height in px: every layer gets exactly this height, the width follows the aspect ratio. */
  height: number;
  /** Make the layers repeat (skipped for a layer that already repeats). */
  loop: boolean;
  /** Overlap band for the loop, as a share of the layer width. */
  overlap: number;
  /** Background removal tolerance (ΔE). */
  bgTolerance?: number;
  /** Fixed shared palette (pixel art only). */
  palette?: RGBA8[];
}

export interface LoopInfo {
  /** Wrap score of the resampled layer before the loop was made (1 = clean). */
  before: number;
  /** Wrap score of the final layer. */
  after: number;
  /** Columns overlapped (= columns lost); 0 when no loop was made. */
  band: number;
  /** false when the layer already repeats or the loop is off. */
  applied: boolean;
  alreadyLoops: boolean;
}

export interface ParallaxLayer {
  /** far, mid, near, front: by position among the layers. */
  role: string;
  image: RGBAImage;
  factor: number;
  loop: LoopInfo;
  /** Art height of the source (source height / detected pixel period); null for cartoon or when there is no grid. */
  nativeHeight: number | null;
}

export interface ParallaxResult {
  mode: ArtMode;
  height: number;
  layers: ParallaxLayer[];
  warnings: Warning[];
}

/** Names of the layers by count, far → near. */
export function layerRoles(count: number): string[] {
  const roles = ['far', 'mid', 'near', 'front'];
  if (count <= 1) return ['far'];
  if (count === 2) return ['far', 'near'];
  return roles.slice(0, Math.min(count, roles.length));
}

/** Default scroll factors by count, far → near (far 0.2, mid 0.5, near 0.8). */
export function defaultFactors(count: number): number[] {
  switch (Math.min(count, 4)) {
    case 1: return [0.5];
    case 2: return [0.2, 0.8];
    case 3: return [0.2, 0.5, 0.8];
    default: return [0.1, 0.3, 0.55, 0.8];
  }
}

/** Crop/pad (edge replicate) to exactly w×h: grid downscales can come out one cell off. */
function fitTo(img: RGBAImage, w: number, h: number): RGBAImage {
  if (img.width === w && img.height === h) return img;
  const out = createImage(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = (Math.min(y, img.height - 1) * img.width + Math.min(x, img.width - 1)) * 4;
      out.data.set(img.data.subarray(si, si + 4), (y * w + x) * 4);
    }
  }
  return out;
}

/** One resample of `img` to w×h. Pixel art: grid cells of period (source / target), phase fitted by unfake. */
function resampleLayer(core: UnfakeCore | null, img: RGBAImage, w: number, h: number, mode: ArtMode): RGBAImage {
  if (mode === 'cartoon') return resampleArea(img, w, h);
  const px = img.width / w, py = img.height / h;
  if (!core || py <= 1.0001) return resizeNearest(img, w, h);
  const phase = core.gridForScale(img, py);
  // Slightly shrink the period so floating-point error never yields one cell too few; fitTo handles any ±1.
  const g = { periodX: px * (1 - 1e-9), periodY: py * (1 - 1e-9), offsetX: phase?.offsetX ?? 0, offsetY: phase?.offsetY ?? 0 };
  return fitTo(core.downscaleGrid(img, g, 'dominant'), w, h);
}

/** Rows of the top border that say what the layer's background is (nearer layers touch the bottom edge with ground). */
const TOP_ROWS = 4;

/** Background colour of a layer from its TOP rows: near layers always have ground along the bottom edge. */
function topBackground(img: RGBAImage): { color: RGBA8; confidence: number } {
  return detectBackground(crop(img, { x: 0, y: 0, w: img.width, h: Math.min(TOP_ROWS, img.height) }));
}

/**
 * Should the background of layer `index` (0 = far) be cut out by default? A chroma key (magenta, green) along the
 * top, or a top that is almost all one flat colour. The far layer never: it is the sky.
 */
export function wantsCutout(img: RGBAImage, index: number): boolean {
  if (index === 0) return false;
  const top = topBackground(img);
  if (top.color[3] === 0) return false;
  return chooseStrategy(top.color) === 'global' ? top.confidence >= 0.5 : top.confidence >= 0.95;
}

/** Background options from the top rows (the whole border mixes in the ground), then the usual defaults. */
function layerBgOptions(img: RGBAImage, mode: ArtMode, tolerance?: number): BgOptions {
  const top = topBackground(img);
  const base = autoBgOptions(img, mode);
  const useTop = top.color[3] > 0 && top.confidence >= 0.5;
  const color = useTop ? top.color : base.color;
  const strategy = useTop ? chooseStrategy(top.color) : base.strategy;
  return { ...base, color, strategy, ...(tolerance !== undefined ? { tolerance } : {}) };
}

/** Pink, magenta and purple: the colours a magenta key leaves on the rim of a shape (the art has none of its own). */
function isMagentaish(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max < 51 || (max - min) / max < 0.25) return false;
  const d = max - min;
  const hue = max === r ? 60 * (((g - b) / d + 6) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  return hue >= 265 && hue <= 355;
}

/**
 * Pixel art cut out of a magenta key keeps a rim of pink and purple pixels (the AI blended the key into the edge).
 * Removes pixels of those colours that touch the transparency, up to `depth` px inwards. Returns a new image.
 */
function peelMagentaRim(img: RGBAImage, depth = 3): RGBAImage {
  const { width: W, height: H } = img;
  const data = new Uint8ClampedArray(img.data);
  let frontier: number[] = [];
  for (let p = 0; p < W * H; p++) if (data[p * 4 + 3] < 128) frontier.push(p);
  for (let d = 0; d < depth && frontier.length; d++) {
    const next: number[] = [];
    for (const p of frontier) {
      const x = p % W, y = (p - x) / W;
      for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1]) {
        if (q < 0 || data[q * 4 + 3] < 128 || !isMagentaish(data[q * 4], data[q * 4 + 1], data[q * 4 + 2])) continue;
        data[q * 4] = data[q * 4 + 1] = data[q * 4 + 2] = data[q * 4 + 3] = 0;
        next.push(q);
      }
    }
    frontier = next;
  }
  return { width: W, height: H, data };
}

/** Enlarge by a whole factor (every art pixel becomes k×k identical pixels). */
function enlarge(img: RGBAImage, k: number): RGBAImage {
  if (k === 1) return img;
  const out = createImage(img.width * k, img.height * k);
  for (let y = 0; y < out.height; y++) {
    const sy = Math.floor(y / k);
    for (let x = 0; x < out.width; x++) {
      const si = (sy * img.width + Math.floor(x / k)) * 4;
      out.data.set(img.data.subarray(si, si + 4), (y * out.width + x) * 4);
    }
  }
  return out;
}

/**
 * Makes the picture exactly `h` px high with the BOTTOM kept in place: a taller one loses its top rows; a shorter one
 * is extended upwards with its own top row when that row is opaque (a sky), else with transparency.
 */
function fitHeightAtTop(img: RGBAImage, h: number): RGBAImage {
  if (img.height === h) return img;
  const { width: W, height: H } = img;
  if (H > h) return crop(img, { x: 0, y: H - h, w: W, h });
  const out = createImage(W, h);
  let opaque = 0;
  for (let x = 0; x < W; x++) if (img.data[x * 4 + 3] >= 128) opaque++;
  const pad = h - H;
  if (opaque * 2 >= W) for (let y = 0; y < pad; y++) out.data.set(img.data.subarray(0, W * 4), y * W * 4);
  out.data.set(img.data, pad * W * 4);
  return out;
}

/** Share of the game height that may be padded or cropped before the user is told (art 40 px tall at 360 → ×9 = 360). */
const FIT_WARN = 0.25;

/** Cartoon layers blend this many px across the seam; pixel art keeps every pixel from the source. */
const CARTOON_FEATHER = 3;

export function buildParallax(core: UnfakeCore | null, inputs: ParallaxInput[], o: ParallaxOptions): ParallaxResult {
  const warnings: Warning[] = [];
  const roles = layerRoles(inputs.length);
  const H = Math.max(1, Math.round(o.height));
  const feather = o.mode === 'cartoon' ? CARTOON_FEATHER : 0;

  // Resample every layer first so one palette can be applied to all of them. Pixel art with a detectable grid is
  // reduced to its own art pixels (k = 0 below means: not on a grid, already at the game height).
  const reduced = inputs.map((inp) => {
    const bgo = inp.removeBg ? layerBgOptions(inp.image, o.mode, o.bgTolerance) : null;
    const src = bgo ? removeBackground(inp.image, bgo, o.mode) : inp.image;
    const grid = o.mode === 'pixel' && core ? core.detectGrid(inp.image) : null;
    if (grid && core) {
      const art = core.downscaleGrid(src, grid, 'dominant');
      const key = bgo && bgo.color !== 'auto' ? bgo.color : null;
      return { image: key && isMagentaish(key[0], key[1], key[2]) ? peelMagentaRim(art) : art, onGrid: true };
    }
    const W = Math.max(1, Math.round((src.width * H) / src.height));
    return { image: resampleLayer(core, src, W, H, o.mode), onGrid: false };
  });
  const fixed = o.mode === 'pixel' && o.palette?.length ? o.palette : null;
  const images = fixed ? remapToPalette(reduced.map((r) => r.image), fixed) : reduced.map((r) => r.image);

  const layers = images.map<ParallaxLayer>((art, i) => {
    const before = loopScore(art);
    const alreadyLoops = before <= ALREADY_LOOPS;
    const applied = o.loop && !alreadyLoops && art.width >= 24;
    let image = art;
    let band = 0;
    if (applied) {
      const best = bestLoop(art, o.overlap, feather);
      image = best.image;
      band = best.band;
    }
    const after = band > 0 ? loopScore(image) : before;
    if (after > LOOP_WARN) warnings.push({ key: 'warn.parallaxSeam', params: { layer: i + 1, score: Math.round(after * 10) / 10 } });

    let nativeHeight: number | null = null;
    if (reduced[i]!.onGrid) {
      nativeHeight = art.height;
      const k = Math.max(1, Math.round(H / art.height));
      image = fitHeightAtTop(enlarge(image, k), H);
      if (Math.abs(art.height * k - H) / H > FIT_WARN) {
        warnings.push({ key: 'warn.parallaxFit', params: { layer: i + 1, native: art.height, k, fit: art.height * k, height: H } });
      }
    }
    return { role: roles[i]!, image, factor: inputs[i]!.factor, loop: { before, after, band, applied: band > 0, alreadyLoops }, nativeHeight };
  });
  return { mode: o.mode, height: H, layers, warnings };
}
