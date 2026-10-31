import { describe, expect, it } from 'vitest';
import { cloneImage, crop, createImage, setPixel } from '../src/core/image.ts';
import { measureFrame } from '../src/core/measure/index.ts';
import { packFrames, suggestCell } from '../src/core/pack/index.ts';
import type { RGBAImage } from '../src/core/types.ts';
import { debugPng } from './helpers.ts';
import { makeCharacterFrames, makeSheet } from './fixtures/synth.ts';

/** Minimal chroma key for tests (does not depend on src/core/bg): RGB distance < 60 from magenta → alpha 0. */
function keyMagenta(img: RGBAImage): RGBAImage {
  const out = cloneImage(img);
  for (let i = 0; i < out.data.length; i += 4) {
    const d = Math.hypot(out.data[i] - 255, out.data[i + 1], out.data[i + 2] - 255);
    if (d < 60) out.data[i + 3] = 0;
  }
  return out;
}

const sheet = makeSheet(makeCharacterFrames(), { scale: 8 });
const keyed = keyMagenta(sheet.image);
const frames = sheet.placements.map((p) => crop(keyed, { x: p.x - 12, y: p.y - 12, w: p.w + 24, h: p.h + 24 }));
const metrics = frames.map((f) => measureFrame(f));

/** Last row containing an opaque pixel (alpha >= 128). */
function lastOpaqueRow(img: RGBAImage): number {
  for (let y = img.height - 1; y >= 0; y--) for (let x = 0; x < img.width; x++) if (img.data[(y * img.width + x) * 4 + 3] >= 128) return y;
  return -1;
}

describe('suggestCell', () => {
  it('returns multiples of 32 that fit every frame', () => {
    for (const pad of [0, 3, 20]) {
      const c = suggestCell(frames, metrics, pad);
      expect(c.w % 32).toBe(0);
      expect(c.h % 32).toBe(0);
      for (const m of metrics) {
        expect(c.h).toBeGreaterThanOrEqual(m.footY - m.bbox.y + 1 + pad);
        expect(c.w).toBeGreaterThanOrEqual(2 * Math.max(m.anchorX - m.bbox.x, m.bbox.x + m.bbox.w - m.anchorX) - 2);
      }
      // minimal: one step less must not fit the tallest frame
      const need = Math.max(...metrics.map((m) => m.footY - m.bbox.y + 1)) + pad;
      expect(c.h - 32).toBeLessThan(need);
    }
  });

  it('honours a custom step and tiny content', () => {
    const img = createImage(4, 4);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) setPixel(img, x, y, [1, 1, 1, 255]);
    const m = measureFrame(img);
    expect(suggestCell([img], [m], 0, 16)).toEqual({ w: 16, h: 16 });
  });
});

describe('packFrames', () => {
  const cell = { ...suggestCell(frames, metrics, 4), padBottom: 4 };

  it('feet land on cell.h-1-padBottom and the anchor on floor(cell.w/2) in every cell', () => {
    const { sheet: s, cells, warnings } = packFrames(frames, metrics, cell, [], 'pixel');
    debugPng('pack-synth', s.image);
    expect(warnings).toEqual([]);
    expect(cells).toHaveLength(4);
    expect(s.cols).toBe(4);
    expect(s.rows).toBe(1);
    expect(s.padBottom).toBe(4);
    expect(s.cell).toEqual({ w: cell.w, h: cell.h });
    expect(s.image.width).toBe(4 * cell.w);
    expect(s.image.height).toBe(cell.h);
    expect(s.anims).toEqual([{ name: 'default', row: 0, count: 4, fps: 8, loop: true }]);
    for (const c of cells) {
      expect(c.width).toBe(cell.w);
      expect(c.height).toBe(cell.h);
      expect(lastOpaqueRow(c)).toBe(cell.h - 1 - cell.padBottom);
      expect(Math.abs(measureFrame(c).anchorX - Math.floor(cell.w / 2))).toBeLessThanOrEqual(1);
    }
  });

  it('sheet image equals the cells laid out row by row (several animations)', () => {
    const anims = [
      { name: 'walk', frames: [0, 1, 2, 3], fps: 10, loop: true },
      { name: 'hit', frames: [3, 0], fps: 12, loop: false },
    ];
    const { sheet: s, cells } = packFrames(frames, metrics, cell, anims, 'cartoon');
    expect(s.rows).toBe(2);
    expect(s.cols).toBe(4);
    expect(s.mode).toBe('cartoon');
    expect(s.anims.map((a) => [a.name, a.row, a.count, a.fps, a.loop])).toEqual([['walk', 0, 4, 10, true], ['hit', 1, 2, 12, false]]);
    expect(cells).toHaveLength(6);
    const at = (i: number, row: number, col: number) => {
      const w = cell.w, h = cell.h;
      return crop(s.image, { x: col * w, y: row * h, w, h }).data.every((v, k) => v === cells[i].data[k]);
    };
    expect([at(0, 0, 0), at(3, 0, 3), at(4, 1, 0), at(5, 1, 1)]).toEqual([true, true, true, true]);
    // unused slot of the shorter animation stays transparent
    expect(crop(s.image, { x: 2 * cell.w, y: cell.h, w: cell.w, h: cell.h }).data.every((v) => v === 0)).toBe(true);
  });

  it('does not mutate the inputs and warns about clipped content', () => {
    const before = frames.map((f) => new Uint8ClampedArray(f.data));
    const small = { w: 32, h: 32, padBottom: 0 };
    const { warnings } = packFrames(frames, metrics, small, [], 'pixel');
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].key).toBe('warn.clipped');
    expect(warnings[0].params?.px).toBeGreaterThan(0);
    frames.forEach((f, i) => expect(f.data).toEqual(before[i]));
  });

  it('pasting at integer offsets keeps pixel values untouched', () => {
    const img = createImage(6, 6);
    setPixel(img, 2, 5, [10, 20, 30, 255]);
    setPixel(img, 3, 5, [10, 20, 30, 255]);
    const m = measureFrame(img);
    const { cells } = packFrames([img], [m], { w: 16, h: 16, padBottom: 2 }, [], 'pixel');
    const c = cells[0];
    const y = 16 - 1 - 2;
    const hits: number[] = [];
    for (let x = 0; x < 16; x++) if (c.data[(y * 16 + x) * 4 + 3] === 255) hits.push(x);
    expect(hits.length).toBe(2);
    expect(Number.isInteger(m.anchorX)).toBe(true);
  });
});
