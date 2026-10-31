import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { autoBgOptions } from '../src/core/bg/index.ts';
import { decodePng } from '../src/core/export/index.ts';
import { DUPLICATE_TOLERANCE, findDuplicateFrames, flipCellX, frameDifference } from '../src/core/frames/index.ts';
import { createImage, getPixel, setPixel } from '../src/core/image.ts';
import { runSpriteJob } from '../src/core/pipeline/index.ts';
import type { RGBA8, RGBAImage, SpriteJob } from '../src/core/types.ts';
import { loadUnfake } from './helpers.ts';

const core = loadUnfake();

/** 16×16 cell with a coloured block; `seed` moves it so different seeds are different poses. */
function pose(seed: number): RGBAImage {
  const img = createImage(16, 16);
  for (let y = 4; y < 14; y++) for (let x = 2 + seed * 3; x < 8 + seed * 3; x++) setPixel(img, x, y, [200, 40 + seed * 20, 40, 255]);
  return img;
}

describe('findDuplicateFrames', () => {
  it('groups identical frames (ascending indices, groups of 2+ only)', () => {
    expect(findDuplicateFrames([pose(0), pose(1), pose(0), pose(2), pose(1)])).toEqual([[0, 2], [1, 4]]);
  });

  it('treats a single differing pixel as a duplicate and different poses as distinct', () => {
    const a = pose(0);
    const b = pose(0);
    setPixel(b, 0, 0, [255, 255, 255, 255]);
    expect(frameDifference(a, b)).toBeLessThan(0.05);
    expect(findDuplicateFrames([a, b])).toEqual([[0, 1]]);
    expect(findDuplicateFrames([pose(0), pose(1), pose(2)])).toEqual([]);
  });

  it('a tight tolerance separates the 1-px variant', () => {
    const a = pose(0);
    const b = pose(0);
    setPixel(b, 5, 5, [10, 10, 10, 255]);
    expect(findDuplicateFrames([a, b], 0)).toEqual([]);
    expect(findDuplicateFrames([a, b], 0.05)).toEqual([[0, 1]]);
  });

  it('colour changes under the threshold are ignored; alpha or big colour changes count', () => {
    const a = pose(0);
    const b = pose(0);
    for (let i = 0; i < b.data.length; i += 4) if (b.data[i + 3]) b.data[i] -= 20;
    expect(frameDifference(a, b)).toBe(0);
    for (let i = 0; i < b.data.length; i += 4) if (b.data[i + 3]) b.data[i] -= 40;
    expect(frameDifference(a, b)).toBe(1);
  });

  it('empty frames are identical; different sizes never are', () => {
    expect(findDuplicateFrames([createImage(8, 8), createImage(8, 8)])).toEqual([[0, 1]]);
    expect(findDuplicateFrames([createImage(8, 8), createImage(9, 8)])).toEqual([]);
  });

  it('does not chain: a slow drift never merges both ends', () => {
    const drift = [0, 0.2, 0.4].map((k) => {
      const img = createImage(10, 10);
      for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) if (x + y * 10 < 100 - Math.round(k * 100)) setPixel(img, x, y, [200, 0, 0, 255]);
      return img;
    });
    // pairs (0,1) and (1,2) differ by 0.2, (0,2) by 0.4: with tolerance 0.25, 2 does not join 0's group.
    expect(findDuplicateFrames(drift, 0.25)).toEqual([[0, 1]]);
  });
});

describe('findDuplicateFrames (Codex samples, default tolerance)', () => {
  function cells(file: string, mode: 'pixel' | 'cartoon', px: number, cell: SpriteJob['cell']): RGBAImage[] {
    const source = decodePng(new Uint8Array(readFileSync(`samples/codex/${file}`)));
    return runSpriteJob(core, {
      name: file, source, mode, bg: autoBgOptions(source, mode), segmentation: { kind: 'grid', rows: 2, cols: 3 },
      animations: [], cell, scale: { kind: 'targetHeight', px },
    }).frames;
  }

  it('fox (cartoon, 96 px): the bottom row repeats the top row', () => {
    const f = cells('fox-run-cartoon.png', 'cartoon', 96, 'auto');
    expect(f).toHaveLength(6);
    expect(findDuplicateFrames(f)).toEqual([[0, 3], [1, 4], [2, 5]]);
  });

  it('knight (pixel, 32 px): consecutive distinct frames are never grouped', () => {
    const f = cells('knight-walk-pixel.png', 'pixel', 32, { w: 32, h: 32, padBottom: 0 });
    expect(f).toHaveLength(6);
    expect(findDuplicateFrames(f)).toEqual([]);
    expect(DUPLICATE_TOLERANCE).toBeGreaterThan(0.372);
    expect(DUPLICATE_TOLERANCE).toBeLessThan(0.548);
  });
});

describe('flipCellX', () => {
  it('mirrors around column floor(w/2) and keeps the anchor column', () => {
    for (const w of [9, 10]) {
      const c = createImage(w, 3);
      const mid = Math.floor(w / 2);
      const RED: RGBA8 = [255, 0, 0, 255], BLUE: RGBA8 = [0, 0, 255, 255];
      setPixel(c, mid, 1, RED);
      setPixel(c, mid - 3, 1, BLUE);
      const f = flipCellX(c);
      expect(f.width).toBe(w);
      expect(getPixel(f, mid, 1)).toEqual(RED);
      expect(getPixel(f, mid + 3, 1)).toEqual(BLUE);
      expect(getPixel(f, mid - 3, 1)[3]).toBe(0);
    }
  });

  it('is an involution on content inside the mirror range and does not mutate the input', () => {
    const c = createImage(11, 4);
    setPixel(c, 1, 0, [1, 2, 3, 255]);
    setPixel(c, 9, 3, [4, 5, 6, 255]);
    const before = Array.from(c.data);
    const back = flipCellX(flipCellX(c));
    expect(Array.from(back.data)).toEqual(before);
    expect(Array.from(c.data)).toEqual(before);
  });
});
