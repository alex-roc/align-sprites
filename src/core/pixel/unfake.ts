// Adapter over the unfake.js WASM core (MIT, github.com/jenissimo/unfake.js).
// Only the pure functions are used; the vendored glue lives in src/vendor/unfake.
// NOTE: the WASM bundles imagequant (GPL-3.0-or-later), hence this project's licence.
import initWasm, * as w from '../../vendor/unfake/unfake_wasm.js';
import type { DsMethod, PixelGrid, RGBA8, RGBAImage } from '../types.ts';

export interface UnfakeCore {
  /** Detect the pixel-art grid of an upscaled image (fractional first, then integer + crop offset). Null if no grid (scale 1). */
  detectGrid(img: RGBAImage): PixelGrid | null;
  /** Grid for a known period (phase re-fitted to this image). */
  gridForScale(img: RGBAImage, period: number): PixelGrid | null;
  /** Downscale on a grid; one output px per cell. */
  downscaleGrid(img: RGBAImage, g: PixelGrid, method?: DsMethod, domThreshold?: number): RGBAImage;
  /** Perceptual (Öztireli–Gross) downscale to exact dims. */
  contentAdaptive(img: RGBAImage, w: number, h: number): RGBAImage;
  /** Quantize to <= maxColors, or remap to `fixed` palette when given (non-empty). */
  quantize(img: RGBAImage, maxColors: number, fixed?: RGBA8[]): { image: RGBAImage; palette: RGBA8[] };
}

const METHOD: Record<DsMethod, number> = { nearest: 0, median: 1, mode: 2, dominant: 3, mean: 5 };

const u8 = (img: RGBAImage) => new Uint8Array(img.data.buffer, img.data.byteOffset, img.data.byteLength);

function unpack(p: Uint8Array): RGBAImage {
  const dv = new DataView(p.buffer, p.byteOffset, p.byteLength);
  const width = dv.getUint32(0, true);
  const height = dv.getUint32(4, true);
  return { width, height, data: new Uint8ClampedArray(p.slice(8, 8 + width * height * 4)) };
}

function gridFromVec(v: Float64Array): PixelGrid | null {
  if (v.length < 4 || !(v[0] > 1) || !(v[1] > 1)) return null;
  return { periodX: v[0], periodY: v[1], offsetX: v[2], offsetY: v[3] };
}

function makeCore(): UnfakeCore {
  return {
    detectGrid(img) {
      const d = u8(img);
      const frac = gridFromVec(w.detect_grid(d, img.width, img.height));
      if (frac) return frac;
      const s = w.detect_auto(d, img.width, img.height);
      if (s <= 1) return null;
      const [ox, oy] = w.crop_offset(d, img.width, img.height, s);
      return { periodX: s, periodY: s, offsetX: ox, offsetY: oy };
    },
    gridForScale(img, period) {
      return gridFromVec(w.grid_for_scale_vec(u8(img), img.width, img.height, period));
    },
    downscaleGrid(img, g, method = 'dominant', domThreshold = 0.05) {
      return unpack(
        w.downscale_grid_packed(u8(img), img.width, img.height, g.periodX, g.periodY, g.offsetX, g.offsetY, METHOD[method], domThreshold),
      );
    },
    contentAdaptive(img, tw, th) {
      return unpack(w.content_adaptive_packed(u8(img), img.width, img.height, tw, th));
    },
    quantize(img, maxColors, fixed) {
      const f = new Uint8Array((fixed ?? []).flat());
      const p = w.quantize_packed(u8(img), img.width, img.height, maxColors, f);
      const dv = new DataView(p.buffer, p.byteOffset, p.byteLength);
      const width = dv.getUint32(0, true);
      const height = dv.getUint32(4, true);
      const n = dv.getUint32(8, true);
      const palette: RGBA8[] = [];
      for (let i = 0; i < n; i++) {
        const o = 12 + i * 4;
        palette.push([p[o], p[o + 1], p[o + 2], p[o + 3]]);
      }
      const start = 12 + n * 4;
      return { image: { width, height, data: new Uint8ClampedArray(p.slice(start, start + width * height * 4)) }, palette };
    },
  };
}

let ready: UnfakeCore | null = null;

/** Node / tests: synchronous init from the .wasm bytes. */
export function unfakeFromBytes(bytes: Uint8Array): UnfakeCore {
  if (!ready) {
    w.initSync({ module: bytes });
    ready = makeCore();
  }
  return ready;
}

/** Browser / worker: async init from the .wasm URL (import wasmUrl from '...wasm?url'). */
export async function unfakeFromUrl(url: string): Promise<UnfakeCore> {
  if (!ready) {
    await initWasm({ module_or_path: url });
    ready = makeCore();
  }
  return ready;
}
