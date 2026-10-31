import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { decode } from 'fast-png';
import { describe, expect, it } from 'vitest';
import { autoBgOptions, chooseStrategy, detectBackground, removeBackground, DEFAULT_BG, DEFAULT_BG_CARTOON } from '../src/core/bg/index.ts';
import { rgbDistance } from '../src/core/color.ts';
import { createImage, getPixel, setPixel } from '../src/core/image.ts';
import type { BgOptions, RGBAImage } from '../src/core/types.ts';
import { MAGENTA, makeCartoonSheet, makeCharacterFrames, makeSheet } from './fixtures/synth.ts';
import { debugPng } from './helpers.ts';

/** Decode a PNG from samples/real into straight RGBA8 (handles gray / RGB / 16-bit). */
function decodePng(name: string): RGBAImage {
  const png = decode(new Uint8Array(readFileSync(fileURLToPath(new URL('../samples/real/' + name, import.meta.url)))));
  const { width, height, channels, depth } = png;
  const src = png.data as Uint8Array | Uint16Array;
  const shift = depth === 16 ? 8 : 0;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    const v = (k: number) => src[p * channels + k] >> shift;
    const [r, g, b, a] = channels === 1 ? [v(0), v(0), v(0), 255] : channels === 2 ? [v(0), v(0), v(0), v(1)] : channels === 3 ? [v(0), v(1), v(2), 255] : [v(0), v(1), v(2), v(3)];
    data.set([r, g, b, a], p * 4);
  }
  return { width, height, data };
}

/** Byte equality (vitest's toEqual on multi-MB typed arrays is very slow). */
const sameBytes = (a: Uint8ClampedArray, b: Uint8ClampedArray) => Buffer.from(a.buffer, a.byteOffset, a.length).equals(Buffer.from(b.buffer, b.byteOffset, b.length));
const alphaAt = (img: RGBAImage, x: number, y: number) => img.data[(y * img.width + x) * 4 + 3];

// Tunic skirt of each of the 4 characters in Personaje.png (cream ~(254,230,185), only ΔE~12 from the white bg).
const TORSO_X = [0.166, 0.4, 0.606, 0.852];
const TORSO_Y = 0.6;
// White sliver enclosed between the legs of the side-view character: a real "hole" of the bg.
const HOLE = { x: 0.384, y: 0.84 };

describe('detectBackground', () => {
  it('finds the magenta key with full confidence', () => {
    const sheet = makeSheet(makeCharacterFrames(), { scale: 8 });
    const { color, confidence } = detectBackground(sheet.image);
    expect(rgbDistance(color, MAGENTA)).toBeLessThan(5);
    expect(confidence).toBeGreaterThan(0.95);
  });

  it('reports a transparent border as transparent', () => {
    const img = createImage(10, 10);
    setPixel(img, 5, 5, [255, 0, 0, 255]);
    const r = detectBackground(img);
    expect(r.color).toEqual([0, 0, 0, 0]);
    expect(r.confidence).toBe(1);
  });
});

describe('chooseStrategy', () => {
  it('uses global for chroma keys and flood for the rest', () => {
    expect(chooseStrategy([255, 0, 255, 255])).toBe('global');
    expect(chooseStrategy([0, 255, 0, 255])).toBe('global');
    expect(chooseStrategy([0, 0, 255, 255])).toBe('global');
    expect(chooseStrategy([255, 255, 255, 255])).toBe('flood');
    expect(chooseStrategy([0, 0, 0, 255])).toBe('flood');
    expect(chooseStrategy([128, 128, 128, 255])).toBe('flood');
    expect(chooseStrategy([240, 190, 140, 255])).toBe('flood');
    expect(chooseStrategy([0, 0, 0, 0])).toBe('flood');
  });
});

describe('removeBackground (synthetic)', () => {
  it('pixel/global leaves no opaque pixel near magenta and keeps the character', () => {
    const sheet = makeSheet(makeCharacterFrames(), { scale: 8 });
    const copy = new Uint8ClampedArray(sheet.image.data);
    const out = removeBackground(sheet.image, { ...DEFAULT_BG, color: 'auto', strategy: 'global' }, 'pixel');
    expect(sameBytes(sheet.image.data, copy)).toBe(true); // input untouched
    let leaked = 0;
    for (let i = 0; i < out.data.length; i += 4) {
      if (out.data[i + 3] === 255 && rgbDistance([out.data[i], out.data[i + 1], out.data[i + 2]], MAGENTA) < 15) leaked++;
    }
    expect(leaked).toBe(0);
    // Interior of every placed character stays opaque (a 1-art-px margin is skipped).
    for (const r of sheet.placements) {
      const m = sheet.scale * 2;
      const c = getPixel(out, r.x + r.w / 2, r.y + Math.round(r.h * 0.45));
      expect(c[3]).toBe(255);
      expect(alphaAt(out, r.x + r.w / 2, r.y + m)).toBe(255);
    }
    debugPng('bg-synth-pixel', out);
  });

  it('flood+holes empties an enclosed hole but flood keeps it', () => {
    const img = createImage(40, 40, [255, 255, 255, 255]);
    for (let y = 5; y < 35; y++) for (let x = 5; x < 35; x++) setPixel(img, x, y, [30, 30, 30, 255]);
    for (let y = 15; y < 25; y++) for (let x = 15; x < 25; x++) setPixel(img, x, y, [255, 255, 255, 255]);
    const base = { color: 'auto', tolerance: 18, minHole: 16 } as const;
    const flood = removeBackground(img, { ...base, strategy: 'flood' }, 'pixel');
    const holes = removeBackground(img, { ...base, strategy: 'flood+holes' }, 'pixel');
    const global = removeBackground(img, { ...base, strategy: 'global' }, 'pixel');
    expect(alphaAt(flood, 0, 0)).toBe(0);
    expect(alphaAt(flood, 20, 20)).toBe(255);
    expect(alphaAt(holes, 20, 20)).toBe(0);
    expect(alphaAt(holes, 10, 10)).toBe(255);
    expect(alphaAt(global, 20, 20)).toBe(0);
    // Hole smaller than minHole survives.
    const small = removeBackground(img, { ...base, strategy: 'flood+holes', minHole: 1000 }, 'pixel');
    expect(alphaAt(small, 20, 20)).toBe(255);
  });

  it('cartoon soft+despill leaves no magenta tint on semi-transparent pixels', () => {
    const sheet = makeCartoonSheet();
    const out = removeBackground(sheet.image, { ...DEFAULT_BG_CARTOON, color: 'auto', strategy: 'global' }, 'cartoon');
    const tints = (img: RGBAImage) => {
      const v: number[] = [];
      for (let i = 0; i < img.data.length; i += 4) {
        const a = img.data[i + 3];
        if (a > 0 && a < 255) v.push(Math.min(img.data[i], img.data[i + 2]) - img.data[i + 1]);
      }
      return v.sort((x, y) => x - y);
    };
    const tint = tints(out);
    expect(tint.length).toBeGreaterThan(100);
    // Pure magenta gives min(r,b)-g = 255; the discs are green (-110) and skin (-50). Edge matting recovers the
    // local foreground colour, so almost no semi-transparent pixel keeps a magenta tint.
    expect(tint[Math.floor(tint.length * 0.5)]).toBeLessThan(0);
    expect(tint.filter((t) => t > 30).length / tint.length).toBeLessThan(0.05);
    // Despill must clearly beat doing nothing.
    const plain = tints(removeBackground(sheet.image, { ...DEFAULT_BG_CARTOON, color: 'auto', strategy: 'global', despill: false }, 'cartoon'));
    expect(tint[Math.floor(tint.length * 0.5)]).toBeLessThan(plain[Math.floor(plain.length * 0.5)] - 150);
    // Disc centres stay opaque.
    for (const r of sheet.placements) expect(alphaAt(out, r.x + r.w / 2, Math.round(r.y + r.h * 0.75))).toBe(255);
    debugPng('bg-synth-cartoon', out);
  });

  it('autoBgOptions picks global + magenta for the synthetic sheet', () => {
    const sheet = makeSheet(makeCharacterFrames(), { scale: 8 });
    const o = autoBgOptions(sheet.image, 'pixel');
    expect(o.strategy).toBe('global');
    expect(o.soft).toBeUndefined();
    expect(autoBgOptions(makeCartoonSheet().image, 'cartoon').soft).toBeDefined();
  });
});

describe('removeBackground (real assets)', () => {
  it('Personaje.png: white bg → flood; the cream tunic survives', () => {
    const img = decodePng('Personaje.png');
    const det = detectBackground(img);
    expect(rgbDistance(det.color, [255, 255, 255, 255])).toBeLessThan(8);
    const o = autoBgOptions(img, 'cartoon');
    expect(o.strategy).toBe('flood');
    for (const mode of ['cartoon', 'pixel'] as const) {
      const out = removeBackground(img, autoBgOptions(img, mode), mode);
      debugPng('bg-personaje-' + mode, out);
      for (const [x, y] of [[0, 0], [img.width - 1, 0], [0, img.height - 1], [img.width - 1, img.height - 1]]) {
        expect(alphaAt(out, x, y)).toBe(0);
      }
      for (const fx of TORSO_X) {
        const [r, g, b, a] = getPixel(out, Math.round(img.width * fx), Math.round(img.height * TORSO_Y));
        expect(a).toBe(255);
        expect([r > 240, g > 220, b > 150 && b < 210]).toEqual([true, true, true]); // cream: we did hit the tunic
      }
    }
  });

  it('Personaje.png: flood+holes also clears the enclosed sliver and keeps the tunic', () => {
    const img = decodePng('Personaje.png');
    const o: BgOptions = { ...autoBgOptions(img, 'pixel'), strategy: 'flood+holes' };
    const flood = removeBackground(img, { ...o, strategy: 'flood' }, 'pixel');
    const holes = removeBackground(img, o, 'pixel');
    const hx = Math.round(img.width * HOLE.x), hy = Math.round(img.height * HOLE.y);
    expect(alphaAt(flood, hx, hy)).toBe(255);
    expect(alphaAt(holes, hx, hy)).toBe(0);
    for (const fx of TORSO_X) expect(alphaAt(holes, Math.round(img.width * fx), Math.round(img.height * TORSO_Y))).toBe(255);
  });

  it('Correr.png: already transparent → reported as such and left untouched', () => {
    const img = decodePng('Correr.png');
    const det = detectBackground(img);
    expect(det.color).toEqual([0, 0, 0, 0]);
    const o = autoBgOptions(img, 'cartoon');
    const out = removeBackground(img, o, 'cartoon');
    expect(out.width).toBe(img.width);
    expect(sameBytes(out.data, img.data)).toBe(true);
    const outPx = removeBackground(img, autoBgOptions(img, 'pixel'), 'pixel');
    expect(sameBytes(outPx.data, img.data)).toBe(true);
  });
});

