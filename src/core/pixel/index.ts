// Pixel-art helpers on top of the unfake adapter: per-frame grid downscale and shared palettes.
import { createImage, blit, crop } from '../image.ts';
import type { DsMethod, PixelGrid, RGBA8, RGBAImage } from '../types.ts';
import type { UnfakeCore } from './unfake.ts';

export type { UnfakeCore } from './unfake.ts';

/** Make alpha binary (>= threshold → 255, else fully transparent black). Returns a new image. */
export function binarizeAlpha(img: RGBAImage, threshold = 128): RGBAImage {
  const data = new Uint8ClampedArray(img.data);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] >= threshold) data[i + 3] = 255;
    else data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
  }
  return { width: img.width, height: img.height, data };
}

/**
 * Downscale one frame crop to art resolution with a known source period (source px per art px).
 * The grid phase is re-fitted to this crop (AI sheets keep the period but drift the phase).
 */
export function frameToArt(core: UnfakeCore, frame: RGBAImage, period: number, method: DsMethod = 'dominant'): RGBAImage {
  if (period <= 1.0001) return binarizeAlpha(frame);
  const g: PixelGrid = core.gridForScale(frame, period) ?? { periodX: period, periodY: period, offsetX: 0, offsetY: 0 };
  return binarizeAlpha(core.downscaleGrid(frame, g, method));
}

const TRANSPARENT: RGBA8 = [0, 0, 0, 0];

/**
 * Quantize several images to ONE shared palette (<= maxColors opaque colours). Alpha is preserved exactly
 * (images are expected to have binary alpha). Returns new images plus the palette (without the transparent entry).
 */
export function sharedPalette(core: UnfakeCore, images: RGBAImage[], maxColors: number): { images: RGBAImage[]; palette: RGBA8[] } {
  if (!images.length || maxColors <= 0) return { images, palette: [] };
  // Atlas of every image stacked vertically, opaque pixels only matter.
  const W = Math.max(...images.map((i) => i.width));
  const H = images.reduce((s, i) => s + i.height, 0);
  const atlas = createImage(W, H);
  let y = 0;
  for (const im of images) {
    blit(atlas, im, 0, y);
    y += im.height;
  }
  const { palette: raw } = core.quantize(atlas, maxColors);
  const palette = raw.filter((c) => c[3] >= 128).map((c) => [c[0], c[1], c[2], 255] as RGBA8);
  const fixed = [...palette, TRANSPARENT];
  const out = images.map((im) => {
    const { image: q } = core.quantize(im, maxColors, fixed);
    const data = new Uint8ClampedArray(q.data);
    for (let i = 0; i < data.length; i += 4) {
      const a = im.data[i + 3];
      if (a < 128) data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
      else data[i + 3] = 255;
    }
    return { width: im.width, height: im.height, data };
  });
  return { images: out, palette };
}

/** Pad a crop by `pad` px on every side (transparent outside the source). */
export function cropPadded(img: RGBAImage, r: { x: number; y: number; w: number; h: number }, pad: number): RGBAImage {
  return crop(img, { x: r.x - pad, y: r.y - pad, w: r.w + 2 * pad, h: r.h + 2 * pad });
}
