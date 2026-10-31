// Palettes: presets, palettes taken from an image, and colour swaps for variants.
import type { UnfakeCore } from '../pixel/unfake.ts';
import type { RGBA8, RGBAImage } from '../types.ts';

export interface PalettePreset {
  id: string;
  name: string;
  colors: RGBA8[];
}

/** Well-known pixel-art palettes (exact published colours): pico8 (16), sweetie16 (16), endesga32 (32), gameboy (4). */
export const PALETTES: PalettePreset[] = [];

export function hexToRgba(hex: string): RGBA8 {
  void hex;
  throw new Error('not implemented');
}

export function rgbaToHex(c: RGBA8): string {
  void c;
  throw new Error('not implemented');
}

/** Up to `max` colours representing the image (opaque pixels only), via unfake quantize. */
export function paletteFromImage(core: UnfakeCore, img: RGBAImage, max: number): RGBA8[] {
  void core; void img; void max;
  throw new Error('not implemented');
}

/** Exact colour swap ('#rrggbb' keys and values, case-insensitive); alpha untouched. Returns a new image. */
export function applyColorMap(img: RGBAImage, map: Record<string, string>): RGBAImage {
  void img; void map;
  throw new Error('not implemented');
}

/** Distinct opaque colours of an image, most frequent first (for the swatches the UI recolours). */
export function imageColors(img: RGBAImage, max = 64): { color: RGBA8; count: number }[] {
  void img; void max;
  throw new Error('not implemented');
}
