import { describe, expect, it } from 'vitest';
import { createImage, setPixel } from '../src/core/image.ts';
import {
  PALETTES, applyColorMap, hexToRgba, imageColors, paletteFromImage, remapToPalette, rgbaToHex,
} from '../src/core/palette/index.ts';
import type { RGBA8, RGBAImage } from '../src/core/types.ts';
import { loadUnfake } from './helpers.ts';

const core = loadUnfake();
const hexes = (id: string): string[] => PALETTES.find((p) => p.id === id)!.colors.map(rgbaToHex);

describe('presets', () => {
  it('have the published sizes and exact values', () => {
    expect(PALETTES.map((p) => [p.id, p.colors.length])).toEqual([['pico8', 16], ['sweetie16', 16], ['endesga32', 32], ['gameboy', 4]]);
    expect(hexes('gameboy')).toEqual(['#0f380f', '#306230', '#8bac0f', '#9bbc0f']);
    expect(hexes('pico8')[0]).toBe('#000000');
    expect(hexes('pico8')[8]).toBe('#ff004d');
    expect(hexes('pico8')[15]).toBe('#ffccaa');
    expect(hexes('sweetie16')[0]).toBe('#1a1c2c');
    expect(hexes('sweetie16')[15]).toBe('#333c57');
    expect(hexes('endesga32')[0]).toBe('#be4a2f');
    expect(hexes('endesga32')[31]).toBe('#c28569');
  });

  it('colours are unique, opaque and in range', () => {
    for (const p of PALETTES) {
      expect(new Set(p.colors.map(rgbaToHex)).size).toBe(p.colors.length);
      for (const c of p.colors) expect(c[3]).toBe(255);
    }
  });
});

describe('hex helpers', () => {
  it('round-trips and normalizes', () => {
    expect(hexToRgba('#FF8000')).toEqual([255, 128, 0, 255]);
    expect(hexToRgba('f80')).toEqual([255, 136, 0, 255]);
    expect(hexToRgba('#11223344')).toEqual([17, 34, 51, 68]);
    expect(rgbaToHex([255, 128, 0, 255])).toBe('#ff8000');
    expect(rgbaToHex([1, 2, 3, 0])).toBe('#010203');
    expect(() => hexToRgba('#12345')).toThrow();
    expect(() => hexToRgba('zzzzzz')).toThrow();
  });
});

function sample(): RGBAImage {
  const img = createImage(8, 8);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) setPixel(img, x, y, x < 4 ? [200, 30, 30, 255] : y < 4 ? [30, 30, 200, 255] : [0, 0, 0, 0]);
  setPixel(img, 0, 0, [10, 200, 10, 255]);
  return img;
}

describe('imageColors / paletteFromImage', () => {
  it('lists distinct opaque colours, most frequent first, capped by max', () => {
    const c = imageColors(sample());
    expect(c.map((x) => rgbaToHex(x.color))).toEqual(['#c81e1e', '#1e1ec8', '#0ac80a']);
    expect(c.map((x) => x.count)).toEqual([31, 16, 1]);
    expect(imageColors(sample(), 2)).toHaveLength(2);
  });

  it('quantizes to at most max opaque colours and ignores transparent pixels', () => {
    const p = paletteFromImage(core, sample(), 2);
    expect(p.length).toBeGreaterThan(0);
    expect(p.length).toBeLessThanOrEqual(2);
    for (const c of p) expect(c[3]).toBe(255);
    expect(paletteFromImage(core, createImage(4, 4), 4)).toEqual([]);
  });
});

describe('applyColorMap', () => {
  it('swaps exact colours (case-insensitive), keeps alpha and does not mutate', () => {
    const img = sample();
    setPixel(img, 7, 0, [200, 30, 30, 128]);
    const before = Array.from(img.data);
    const out = applyColorMap(img, { '#C81E1E': '#00ff00', 'nonsense': '#000000' });
    expect(Array.from(img.data)).toEqual(before);
    expect(Array.from(out.data.slice(4 * 8 + 4, 4 * 8 + 8))).toEqual([0, 255, 0, 255]);
    expect(Array.from(out.data.slice(7 * 4, 7 * 4 + 4))).toEqual([0, 255, 0, 128]);
    // transparent pixels are untouched even if their RGB matches
    expect(Array.from(out.data.slice((7 * 8 + 7) * 4, (7 * 8 + 7) * 4 + 4))).toEqual([0, 0, 0, 0]);
    expect(applyColorMap(img, {}).data).toEqual(img.data);
  });
});

describe('remapToPalette', () => {
  it('snaps every opaque pixel to the nearest palette colour, binary alpha, no mutation', () => {
    const pal: RGBA8[] = [[255, 0, 0, 255], [0, 0, 255, 255]];
    const img = createImage(3, 1);
    setPixel(img, 0, 0, [200, 30, 40, 255]);
    setPixel(img, 1, 0, [20, 20, 230, 200]);
    setPixel(img, 2, 0, [255, 255, 255, 50]);
    const [out] = remapToPalette([img], pal);
    expect(Array.from(out.data)).toEqual([255, 0, 0, 255, 0, 0, 255, 255, 0, 0, 0, 0]);
    expect(img.data[0]).toBe(200);
  });
});
