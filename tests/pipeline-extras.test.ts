import { describe, expect, it } from 'vitest';
import { flipCellX } from '../src/core/frames/index.ts';
import { alphaBBox, createImage } from '../src/core/image.ts';
import { measureFrame } from '../src/core/measure/index.ts';
import { packFrames, placementMetrics, suggestCell } from '../src/core/pack/index.ts';
import { PALETTES, hexToRgba, rgbaToHex } from '../src/core/palette/index.ts';
import { runBatch, runSpriteJob } from '../src/core/pipeline/index.ts';
import type { RGBAImage, SpriteJob } from '../src/core/types.ts';
import { MAGENTA, OUTLINE, PANTS, SHIRT, SKIN, makeCartoonSheet, makeCharacterFrames, makeSheet } from './fixtures/synth.ts';
import { loadUnfake } from './helpers.ts';

const core = loadUnfake();
const art = makeCharacterFrames();
const source = makeSheet(art, { scale: 8, seed: 11 }).image;
const CELL = { w: 64, h: 64, padBottom: 0 };

function job(over: Partial<SpriteJob> = {}): SpriteJob {
  return {
    name: 'hero', source, mode: 'pixel', bg: { color: MAGENTA, tolerance: 18, strategy: 'global' },
    segmentation: { kind: 'auto' }, animations: [], cell: CELL, scale: { kind: 'native' }, ...over,
  };
}

const px = (img: RGBAImage, x: number, y: number): number[] => Array.from(img.data.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 4));
const colors = (img: RGBAImage): Set<string> => {
  const s = new Set<string>();
  for (let i = 0; i < img.data.length; i += 4) if (img.data[i + 3]) s.add(rgbaToHex([img.data[i], img.data[i + 1], img.data[i + 2], 255]));
  return s;
};

describe('AnimSpec.flipX', () => {
  it('mirrors each frame around its anchor, keeps feet and anchor column', () => {
    const idx = [0, 1, 2, 3];
    const r = runSpriteJob(core, job({
      animations: [{ name: 'right', frames: idx, fps: 8, loop: true }, { name: 'left', frames: idx, fps: 8, loop: true, flipX: true }],
    }));
    expect(r.sheet.anims.map((a) => a.name)).toEqual(['right', 'left']);
    const c = Math.floor(CELL.w / 2);
    for (let k = 0; k < 4; k++) {
      const a = r.frames[k], b = r.frames[4 + k];
      // b(x) == a(2c - x) for every column that has a mirror image inside the cell
      for (let y = 0; y < CELL.h; y++) for (let x = 1; x < CELL.w; x++) expect(px(b, x, y)).toEqual(px(a, 2 * c - x, y));
      const m = measureFrame(b);
      expect(m.footY).toBe(CELL.h - 1);
      expect(Math.abs(m.anchorX - c)).toBeLessThanOrEqual(1);
    }
  });

  it('agrees with flipCellX when nothing touches column 0', () => {
    const r = runSpriteJob(core, job({ animations: [{ name: 'a', frames: [0], fps: 8, loop: true }, { name: 'b', frames: [0], fps: 8, loop: true, flipX: true }] }));
    expect(Array.from(r.frames[1].data)).toEqual(Array.from(flipCellX(r.frames[0]).data));
  });

  it('placementMetrics sizes the cell for the mirrored placement', () => {
    // 33 px wide, anchor on its first column: unflipped needs 2·32+2 = 66 px (→ 96), mirrored 2·32 = 64 px.
    const f = createImage(33, 10, [255, 0, 0, 255]);
    const m = { ...measureFrame(f), anchorX: 0 };
    const plain = placementMetrics([f], [m], [{ name: 'x', frames: [0], fps: 1, loop: true }]);
    const mirrored = placementMetrics([f], [m], [{ name: 'x', frames: [0], fps: 1, loop: true, flipX: true }]);
    expect(suggestCell(plain.frames, plain.metrics).w).toBe(96);
    expect(suggestCell(mirrored.frames, mirrored.metrics).w).toBe(64);
    const cell = { w: 64, h: 32, padBottom: 0 };
    const spec = { name: 'x', frames: [0], fps: 1, loop: true };
    expect(packFrames([f], [m], cell, [{ ...spec, flipX: true }], 'pixel').warnings).toEqual([]);
    expect(packFrames([f], [m], cell, [spec], 'pixel').warnings.map((w) => w.key)).toEqual(['warn.clipped']);
  });
});

describe('SpriteJob.frameOffsets', () => {
  const base = runSpriteJob(core, job());

  it('shifts the frame in the cell by (dx, dy) and leaves the others alone', () => {
    const r = runSpriteJob(core, job({ frameOffsets: { 1: { dx: 3, dy: -2 } } }));
    const b0 = alphaBBox(base.frames[1], 128)!, b1 = alphaBBox(r.frames[1], 128)!;
    expect(b1.x - b0.x).toBe(3);
    expect(b1.y - b0.y).toBe(-2);
    expect(Array.from(r.frames[0].data)).toEqual(Array.from(base.frames[0].data));
    expect(Array.from(r.frames[2].data)).toEqual(Array.from(base.frames[2].data));
  });

  it('the same detected frame gets the same offset in every animation', () => {
    const r = runSpriteJob(core, job({
      frameOffsets: { 0: { dx: -4, dy: 0 } },
      animations: [{ name: 'a', frames: [0, 1], fps: 8, loop: true }, { name: 'b', frames: [2, 0], fps: 8, loop: true }],
    }));
    expect(Array.from(r.frames[0].data)).toEqual(Array.from(r.frames[3].data));
    const b0 = alphaBBox(base.frames[0], 128)!, b1 = alphaBBox(r.frames[0], 128)!;
    expect(b1.x - b0.x).toBe(-4);
  });

  it("optional packFrames argument: existing 5-arg calls are unchanged", () => {
    const f = createImage(8, 8, [1, 2, 3, 255]);
    const m = measureFrame(f);
    const a = packFrames([f], [m], { w: 32, h: 32, padBottom: 0 }, [], 'pixel');
    const b = packFrames([f], [m], { w: 32, h: 32, padBottom: 0 }, [], 'pixel', { offsets: {} });
    expect(Array.from(a.sheet.image.data)).toEqual(Array.from(b.sheet.image.data));
  });
});

describe('SpriteJob.palette / colorMap', () => {
  const four = [OUTLINE, SKIN, SHIRT, PANTS];

  it('a fixed palette wins over maxColors and is reported in diag.palette', () => {
    const palette = four;
    const r = runSpriteJob(core, job({ palette, maxColors: 2 }));
    expect(r.diag.palette).toEqual(palette);
    const allowed = new Set(palette.map((c) => rgbaToHex(c)));
    const used = colors(r.sheet.image);
    expect(used.size).toBeGreaterThan(2);
    for (const h of used) expect(allowed.has(h)).toBe(true);
  });

  it('works with a preset (PICO-8) and keeps alpha binary', () => {
    const pico = PALETTES.find((p) => p.id === 'pico8')!.colors;
    const r = runSpriteJob(core, job({ palette: pico }));
    const allowed = new Set(pico.map(rgbaToHex));
    for (const h of colors(r.sheet.image)) expect(allowed.has(h)).toBe(true);
    for (let i = 3; i < r.sheet.image.data.length; i += 4) expect([0, 255]).toContain(r.sheet.image.data[i]);
  });

  it('batch: jobs with maxColors still share a quantized palette; fixed-palette jobs keep their own', () => {
    const [a, b] = runBatch(core, [job({ name: 'a', maxColors: 4 }), job({ name: 'b', palette: four })]);
    expect(a.diag.palette!.length).toBeLessThanOrEqual(4);
    expect(b.diag.palette).toEqual(four);
  });

  it('cartoon ignores the palette (it would posterize the antialiasing)', () => {
    const s = makeCartoonSheet(2, 200);
    const cj = job({ source: s.image, mode: 'cartoon', bg: { color: MAGENTA, tolerance: 18, strategy: 'global', soft: { inner: 10, outer: 40 }, despill: true }, cell: 'auto' });
    const plain = runSpriteJob(core, cj);
    const withPal = runSpriteJob(core, { ...cj, palette: four, maxColors: 3 });
    expect(withPal.diag.palette).toBeUndefined();
    expect(Array.from(withPal.sheet.image.data)).toEqual(Array.from(plain.sheet.image.data));
  });

  it('colorMap swaps colours after the palette, in the sheet and in diag.palette', () => {
    const red = '#ff0000';
    const r = runSpriteJob(core, job({ palette: four, colorMap: { [rgbaToHex(SHIRT)]: red } }));
    const used = colors(r.sheet.image);
    expect(used.has(red)).toBe(true);
    expect(used.has(rgbaToHex(SHIRT))).toBe(false);
    expect(r.diag.palette!.map(rgbaToHex)).toContain(red);
    expect(r.diag.palette!.map(rgbaToHex)).not.toContain(rgbaToHex(SHIRT));
    expect(hexToRgba(red)).toEqual([255, 0, 0, 255]);
  });

  it('colorMap also applies to cartoon frames (exact matches only)', () => {
    const s = makeCartoonSheet(2, 200);
    const cj = job({ source: s.image, mode: 'cartoon', bg: { color: MAGENTA, tolerance: 18, strategy: 'global', soft: { inner: 10, outer: 40 }, despill: true }, cell: 'auto' });
    const plain = runSpriteJob(core, cj);
    const swapped = runSpriteJob(core, { ...cj, colorMap: { '#3caa5a': '#ff0000' } });
    expect(colors(swapped.sheet.image).size).toBeLessThanOrEqual(colors(plain.sheet.image).size);
  });
});
