// High-quality resampling for cartoon/vector-like art (pixel art uses the unfake grid downscale instead).
import type { RGBAImage } from '../types.ts';

/**
 * Resize to exactly w×h. Downscaling: box/area filter with premultiplied alpha (no dark/magenta fringes).
 * Upscaling: bilinear with premultiplied alpha. Output is straight (non-premultiplied) RGBA.
 */
export function resampleArea(img: RGBAImage, w: number, h: number): RGBAImage {
  void img; void w; void h;
  throw new Error('not implemented');
}

/** Scale by a factor (w = round(width·s), h = round(height·s), min 1). */
export function resampleScale(img: RGBAImage, s: number): RGBAImage {
  void img; void s;
  throw new Error('not implemented');
}
