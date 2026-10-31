// Palettes: presets, palettes taken from an image, and colour swaps for variants.
import { deltaE, rgbToLab, type Lab } from '../color.ts';
import type { UnfakeCore } from '../pixel/unfake.ts';
import type { RGBA8, RGBAImage } from '../types.ts';

export interface PalettePreset {
  id: string;
  name: string;
  colors: RGBA8[];
}

const OPAQUE = 128;

/** '#rrggbb' list → opaque colours. */
const fromHex = (hexes: string[]): RGBA8[] => hexes.map(hexToRgba);

/**
 * Well-known pixel-art palettes (exact published colours, checked against lospec.com/palette-list):
 * pico8 (16), sweetie16 (16, GrafxKid), endesga32 (32, Endesga), gameboy (4, DMG greens).
 */
export const PALETTES: PalettePreset[] = [
  {
    id: 'pico8',
    name: 'PICO-8',
    colors: fromHex([
      '#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
      '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa',
    ]),
  },
  {
    id: 'sweetie16',
    name: 'Sweetie 16',
    colors: fromHex([
      '#1a1c2c', '#5d275d', '#b13e53', '#ef7d57', '#ffcd75', '#a7f070', '#38b764', '#257179',
      '#29366f', '#3b5dc9', '#41a6f6', '#73eff7', '#f4f4f4', '#94b0c2', '#566c86', '#333c57',
    ]),
  },
  {
    id: 'endesga32',
    name: 'Endesga 32',
    colors: fromHex([
      '#be4a2f', '#d77643', '#ead4aa', '#e4a672', '#b86f50', '#733e39', '#3e2731', '#a22633',
      '#e43b44', '#f77622', '#feae34', '#fee761', '#63c74d', '#3e8948', '#265c42', '#193c3e',
      '#124e89', '#0099db', '#2ce8f5', '#ffffff', '#c0cbdc', '#8b9bb4', '#5a6988', '#3a4466',
      '#262b44', '#181425', '#ff0044', '#68386c', '#b55088', '#f6757a', '#e8b796', '#c28569',
    ]),
  },
  {
    id: 'gameboy',
    name: 'Game Boy',
    colors: fromHex(['#0f380f', '#306230', '#8bac0f', '#9bbc0f']),
  },
];

/** '#rgb', '#rrggbb' or '#rrggbbaa' (the '#' is optional, case-insensitive) → RGBA8. Throws on anything else. */
export function hexToRgba(hex: string): RGBA8 {
  let h = hex.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.replace(/./g, (c) => c + c);
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(h)) throw new Error(`Invalid hex colour: ${hex}`);
  const n = (i: number): number => parseInt(h.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), h.length === 8 ? n(6) : 255];
}

/** '#rrggbb' in lower case (alpha is ignored). */
export function rgbaToHex(c: RGBA8): string {
  const b = (v: number): string => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${b(c[0])}${b(c[1])}${b(c[2])}`;
}

/** Up to `max` colours representing the image (opaque pixels only), via unfake quantize. */
export function paletteFromImage(core: UnfakeCore, img: RGBAImage, max: number): RGBA8[] {
  if (max <= 0) return [];
  // Only opaque pixels vote: soft edges and the background must not take palette slots.
  const data = new Uint8ClampedArray(img.data);
  let opaque = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] >= OPAQUE) {
      data[i + 3] = 255;
      opaque++;
    } else data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
  }
  if (!opaque) return [];
  const { palette } = core.quantize({ width: img.width, height: img.height, data }, max);
  return palette.filter((c) => c[3] >= OPAQUE).map((c) => [c[0], c[1], c[2], 255] as RGBA8);
}

/** Exact colour swap ('#rrggbb' keys and values, case-insensitive); alpha untouched. Returns a new image. */
export function applyColorMap(img: RGBAImage, map: Record<string, string>): RGBAImage {
  const out: RGBAImage = { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) };
  // Packed 0xRRGGBB → replacement; entries that are not valid colours are skipped (the UI may pass half-typed values).
  const table = new Map<number, RGBA8>();
  for (const [from, to] of Object.entries(map)) {
    try {
      const f = hexToRgba(from), t = hexToRgba(to);
      table.set((f[0] << 16) | (f[1] << 8) | f[2], t);
    } catch {
      // ignore
    }
  }
  if (!table.size) return out;
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const t = table.get((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    if (t) {
      d[i] = t[0];
      d[i + 1] = t[1];
      d[i + 2] = t[2];
    }
  }
  return out;
}

/** Distinct opaque colours of an image, most frequent first (for the swatches the UI recolours). */
export function imageColors(img: RGBAImage, max = 64): { color: RGBA8; count: number }[] {
  const counts = new Map<number, number>();
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < OPAQUE) continue;
    const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, max)
    .map(([k, count]) => ({ color: [(k >> 16) & 255, (k >> 8) & 255, k & 255, 255] as RGBA8, count }));
}

/**
 * Remap every pixel to the nearest colour (ΔE in CIELab) of a FIXED palette, exactly and without dithering.
 * Alpha is made binary (>= 128 → opaque, else transparent black). Returns new images; empty palette = copies.
 * Meant for pixel art: on antialiased art it would posterize the soft edges.
 */
export function remapToPalette(images: RGBAImage[], palette: RGBA8[]): RGBAImage[] {
  const labs: Lab[] = palette.map((c) => rgbToLab(c[0], c[1], c[2]));
  const cache = new Map<number, RGBA8>();
  const nearest = (r: number, g: number, b: number): RGBA8 => {
    const k = (r << 16) | (g << 8) | b;
    let hit = cache.get(k);
    if (!hit) {
      const lab = rgbToLab(r, g, b);
      let best = 0, bestD = Infinity;
      for (let i = 0; i < labs.length; i++) {
        const d = deltaE(lab, labs[i]);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      hit = palette[best];
      cache.set(k, hit);
    }
    return hit;
  };
  return images.map((img) => {
    const data = new Uint8ClampedArray(img.data);
    if (palette.length) {
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < OPAQUE) {
          data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
          continue;
        }
        const c = nearest(data[i], data[i + 1], data[i + 2]);
        data[i] = c[0];
        data[i + 1] = c[1];
        data[i + 2] = c[2];
        data[i + 3] = 255;
      }
    }
    return { width: img.width, height: img.height, data };
  });
}

export * from './formats.ts';
export * from './swap.ts';
