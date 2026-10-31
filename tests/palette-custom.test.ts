import { describe, expect, it } from 'vitest';
import { createImage, setPixel } from '../src/core/image.ts';
import {
  MAX_PALETTE_COLORS, PALETTES, applyColorMap, dedupeColors, mergeColorMaps, normalizeHex, paletteSwapMap, parsePalette,
  rgbaToHex, serializeGpl, serializeHex,
} from '../src/core/palette/index.ts';
import { parseCustomColors, parsePaletteChoice } from '../src/ui/persist.ts';

describe('normalizeHex / dedupeColors', () => {
  it('accepts #rgb, #rrggbb, rrggbb and rrggbbaa (alpha dropped); rejects the rest', () => {
    expect(normalizeHex('#F0a')).toBe('#ff00aa');
    expect(normalizeHex(' 1A1C2C ')).toBe('#1a1c2c');
    expect(normalizeHex('#11223344')).toBe('#112233');
    for (const bad of ['abc', '#12345', '#gggggg', '', 'red', '#1234567']) expect(normalizeHex(bad)).toBeNull();
  });

  it('drops invalid and repeated colours, keeps order, caps the size', () => {
    expect(dedupeColors(['#FF0000', 'nope', '#ff0000', '#00f'])).toEqual(['#ff0000', '#0000ff']);
    const many = Array.from({ length: 300 }, (_, i) => '#' + i.toString(16).padStart(6, '0'));
    expect(dedupeColors(many)).toHaveLength(MAX_PALETTE_COLORS);
  });
});

describe('parsePalette', () => {
  it('reads pasted lists with mixed separators and counts what it skipped', () => {
    const r = parsePalette('#ff0000, 00ff00\n  #00f ; hello\n#ff0000');
    expect(r.colors).toEqual(['#ff0000', '#00ff00', '#0000ff']);
    expect(r.skipped).toBe(1);
  });

  it('reads a Lospec .hex file (CRLF, no #)', () => {
    expect(parsePalette('0f380f\r\n306230\r\n8bac0f\r\n9bbc0f\r\n', 'gb.hex').colors).toEqual(['#0f380f', '#306230', '#8bac0f', '#9bbc0f']);
  });

  it('reads a GIMP .gpl palette, ignoring header, comments and bad rows', () => {
    const gpl = 'GIMP Palette\nName: Test\nColumns: 4\n#\n255   0   0\tred\n  0 255   0 green\n300 0 0 bad\n0 0 255\n';
    const r = parsePalette(gpl, 'x.gpl');
    expect(r.colors).toEqual(['#ff0000', '#00ff00', '#0000ff']);
    expect(r.skipped).toBe(1);
  });

  it('reads a Paint.NET .txt palette (AARRGGBB, ; comments, transparent entries dropped)', () => {
    const txt = ';paint.net Palette File\n; Name: x\nFFFF0000\nFF00FF00\n00123456\n';
    expect(parsePalette(txt, 'x.txt').colors).toEqual(['#ff0000', '#00ff00']);
  });

  it('round-trips through .hex and .gpl', () => {
    const colors = PALETTES[1].colors.map(rgbaToHex);
    expect(parsePalette(serializeHex(colors), 'a.hex').colors).toEqual(colors);
    const gpl = serializeGpl(colors, 'Sweetie');
    expect(gpl.startsWith('GIMP Palette\nName: Sweetie\n')).toBe(true);
    expect(parsePalette(gpl, 'a.gpl')).toEqual({ colors, skipped: 0 });
  });
});

describe('swaps', () => {
  it('paletteSwapMap pairs colours by position and skips no-ops and repeats', () => {
    expect(paletteSwapMap(['#ff0000', '#00ff00', '#0000ff'], ['#ff0000', '#112233', '#445566'])).toEqual({ '#00ff00': '#112233', '#0000ff': '#445566' });
    expect(paletteSwapMap(['#ff0000', '#ff0000'], ['#111111', '#222222'])).toEqual({ '#ff0000': '#111111' });
    expect(paletteSwapMap(['#ff0000', '#00ff00'], ['#111111'])).toEqual({ '#ff0000': '#111111' });
  });

  it('preset → preset of the same size recolours an image drawn with the first palette', () => {
    const a = PALETTES[0].colors.map(rgbaToHex), b = PALETTES[1].colors.map(rgbaToHex);
    const img = createImage(4, 4);
    a.slice(0, 4).forEach((hex, i) => setPixel(img, i, 0, [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255]));
    const out = applyColorMap(img, paletteSwapMap(a, b));
    expect(Array.from({ length: 4 }, (_, i) => rgbaToHex([out.data[i * 4], out.data[i * 4 + 1], out.data[i * 4 + 2], 255]))).toEqual(b.slice(0, 4));
  });

  it('a map from colours an image does not have leaves it untouched', () => {
    const img = createImage(2, 1);
    setPixel(img, 0, 0, [10, 20, 30, 255]);
    expect(Array.from(applyColorMap(img, { '#ff0000': '#00ff00' }).data)).toEqual(Array.from(img.data));
  });

  it('mergeColorMaps lets the later map win and lower-cases', () => {
    expect(mergeColorMaps({ '#FF0000': '#111111', '#00ff00': '#222222' }, { '#ff0000': '#333333' })).toEqual({ '#ff0000': '#333333', '#00ff00': '#222222' });
  });
});

describe('persistence of the custom palette', () => {
  it('keeps valid codes only and accepts the custom choice', () => {
    expect(parseCustomColors(['#FFF', 'zz', 3, '#ffffff', '#000000'])).toEqual(['#ffffff', '#000000']);
    expect(parseCustomColors('nope')).toEqual([]);
    expect(parsePaletteChoice({ kind: 'custom' }, [])).toEqual({ kind: 'custom' });
  });
});
