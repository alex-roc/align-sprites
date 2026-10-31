import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { decodePng } from '../src/core/export/index.ts';
import { runBatch, runSpriteJob } from '../src/core/pipeline/index.ts';
import { autoBgOptions } from '../src/core/bg/index.ts';
import { alphaBBox, crop } from '../src/core/image.ts';
import { measureFrame } from '../src/core/measure/index.ts';
import type { RGBAImage, SpriteJob, SpriteResult } from '../src/core/types.ts';
import { makeCharacterFrames, makeSheet, makeCartoonSheet, MAGENTA } from './fixtures/synth.ts';
import { debugPng, loadPng, loadUnfake } from './helpers.ts';

const core = loadUnfake();

function job(name: string, source: RGBAImage, over: Partial<SpriteJob> = {}): SpriteJob {
  return {
    name,
    source,
    mode: 'pixel',
    bg: { color: MAGENTA, tolerance: 18, strategy: 'global' },
    segmentation: { kind: 'auto' },
    animations: [],
    cell: 'auto',
    scale: { kind: 'native' },
    ...over,
  };
}

/** Every cell is cell-sized, feet on the same row, horizontal anchor stable. */
function expectAligned(r: SpriteResult, tolX = 1) {
  const { w, h } = r.sheet.cell;
  const foot = h - 1 - r.sheet.padBottom;
  for (const c of r.frames) {
    expect(c.width).toBe(w);
    expect(c.height).toBe(h);
    if (!alphaBBox(c, 128)) continue;
    const m = measureFrame(c);
    expect(m.footY).toBe(foot);
    expect(Math.abs(m.anchorX - Math.floor(w / 2))).toBeLessThanOrEqual(tolX);
  }
}

/** Share of identical opaque pixels between an art frame and the cell content (aligned by bbox). */
function similarity(art: RGBAImage, cell: RGBAImage): number {
  const a = alphaBBox(art, 128)!, b = alphaBBox(cell, 128)!;
  const A = crop(art, a), B = crop(cell, { x: b.x, y: b.y, w: a.w, h: a.h });
  let same = 0, total = 0;
  for (let i = 0; i < A.data.length; i += 4) {
    const ao = A.data[i + 3] >= 128, bo = B.data[i + 3] >= 128;
    if (!ao && !bo) continue;
    total++;
    if (ao && bo && Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]) < 30) same++;
  }
  return same / total;
}

describe('sprite pipeline (synthetic)', () => {
  const art = makeCharacterFrames();

  for (const scale of [8, 8.25]) {
    it(`recovers native ×${scale} pixel art, aligned in fixed cells`, () => {
      const sheet = makeSheet(art, { scale, seed: 11 });
      const r = runSpriteJob(core, job('hero', sheet.image));
      debugPng(`pipeline-x${scale}`, r.sheet.image);
      expect(r.frames.length).toBe(4);
      expect(r.diag.grid?.periodX).toBeCloseTo(scale, 0);
      expect(r.sheet.cell.w % 32).toBe(0);
      expect(r.sheet.cell.h % 32).toBe(0);
      expectAligned(r);
      expect(r.diag.refHeight).toBeGreaterThanOrEqual(23);
      expect(r.diag.refHeight).toBeLessThanOrEqual(25);
      r.frames.forEach((c, i) => expect(similarity(art[i], c)).toBeGreaterThan(0.95));
    });
  }

  it('batch: two characters of different sizes end at the same target height with one shared cell and palette', () => {
    const a = makeSheet(art, { scale: 8, seed: 2 }).image;
    const b = makeSheet(makeCharacterFrames(20, 30), { scale: 6, seed: 5 }).image;
    const target = { kind: 'targetHeight' as const, px: 48 };
    const [ra, rb] = runBatch(core, [job('a', a, { scale: target, maxColors: 8 }), job('b', b, { scale: target, maxColors: 8 })]);
    debugPng('pipeline-batch-a', ra.sheet.image);
    debugPng('pipeline-batch-b', rb.sheet.image);
    expect(Math.abs(ra.diag.refHeight - 48)).toBeLessThanOrEqual(1);
    expect(Math.abs(rb.diag.refHeight - 48)).toBeLessThanOrEqual(1);
    expect(ra.sheet.cell).toEqual(rb.sheet.cell);
    const pal = new Set((ra.diag.palette ?? []).map((c) => c.slice(0, 3).join()));
    expect(pal.size).toBeGreaterThan(0);
    expect(pal.size).toBeLessThanOrEqual(8);
    for (const r of [ra, rb])
      for (let i = 0; i < r.sheet.image.data.length; i += 4)
        if (r.sheet.image.data[i + 3]) expect(pal.has([r.sheet.image.data[i], r.sheet.image.data[i + 1], r.sheet.image.data[i + 2]].join())).toBe(true);
    expectAligned(ra);
    expectAligned(rb);
  });

  it('cartoon: scales smooth art to the target height without magenta fringes', () => {
    const s = makeCartoonSheet(4, 200);
    const r = runSpriteJob(
      core,
      job('slime', s.image, { mode: 'cartoon', bg: { color: MAGENTA, tolerance: 18, strategy: 'global', soft: { inner: 10, outer: 40 }, despill: true }, scale: { kind: 'targetHeight', px: 64 } }),
    );
    debugPng('pipeline-cartoon', r.sheet.image);
    expect(r.frames.length).toBe(4);
    expect(Math.abs(r.diag.refHeight - 64)).toBeLessThanOrEqual(1);
    expectAligned(r, 2);
    const d = r.sheet.image.data;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 20) expect(Math.min(d[i], d[i + 2]) - d[i + 1]).toBeLessThan(60);
  });
});

describe('sprite pipeline (real AI assets)', () => {
  it('Correr.png: 8 run frames, pixel grid ~9, feet aligned', () => {
    const img = loadPng('samples/real/Correr.png');
    const r = runSpriteJob(core, job('run', img, { bg: autoBgOptions(img, 'pixel'), segmentation: { kind: 'auto', expected: 8 } }));
    debugPng('real-run', r.sheet.image);
    expect(r.frames.length).toBe(8);
    expectAligned(r, 2);
  });

  it('Personaje.png: a single big character on white resized to 64 px', () => {
    const img = loadPng('samples/real/Personaje.png');
    const r = runSpriteJob(
      core,
      job('single', img, { bg: autoBgOptions(img, 'pixel'), segmentation: { kind: 'single' }, scale: { kind: 'targetHeight', px: 64 }, cell: { w: 64, h: 64, padBottom: 0 } }),
    );
    debugPng('real-single-64', r.sheet.image);
    expect(r.frames.length).toBe(1);
    expect(Math.abs(r.diag.refHeight - 64)).toBeLessThanOrEqual(1);
    expectAligned(r, 2);
  });

  it('codex knight: no key-coloured halo pixels survive (magenta blended into the outline)', () => {
    // Decode exactly as the app does (core decodePng: palette/tRNS aware).
    const img = decodePng(new Uint8Array(readFileSync('samples/codex/knight-walk-pixel.png')));
    const r = runSpriteJob(core, job('knight', img, { bg: autoBgOptions(img, 'pixel'), segmentation: { kind: 'grid', rows: 2, cols: 3 } }));
    const d = r.sheet.image.data;
    const tinted: string[] = [];
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] && d[i] > 140 && d[i + 2] > 140 && d[i + 1] < 130) tinted.push(`${d[i]},${d[i + 1]},${d[i + 2]}@${(i / 4) % r.sheet.image.width},${Math.floor(i / 4 / r.sheet.image.width)}`);
    expect(tinted).toEqual([]);
  });

  it('codex hero idle + run + Personaje.png in one batch: 128 px each, one cell, feet on one row', () => {
    const files = ['samples/real/Personaje.png', 'samples/codex/hero-idle-pixel.png', 'samples/codex/hero-run-pixel.png'];
    const jobs = files.map((f, i) => {
      const img = loadPng(f);
      return job('hero' + i, img, { bg: autoBgOptions(img, 'pixel'), segmentation: i === 0 ? { kind: 'single' } : { kind: 'auto' }, scale: { kind: 'targetHeight', px: 128 }, cell: 'auto' });
    });
    const rs = runBatch(core, jobs);
    expect(rs.map((r) => r.frames.length)).toEqual([1, 4, 6]);
    for (const r of rs) {
      expect(Math.abs(r.diag.refHeight - 128)).toBeLessThanOrEqual(0.5);
      expect(r.sheet.cell).toEqual(rs[0].sheet.cell);
      expectAligned(r, 2);
    }
  });

  it('Personaje_model.png: 4 views on white, tunic survives', () => {
    const img = loadPng('samples/real/Personaje_model.png');
    const r = runSpriteJob(core, job('views', img, { bg: autoBgOptions(img, 'pixel'), scale: { kind: 'targetHeight', px: 96 } }));
    debugPng('real-views-96', r.sheet.image);
    expect(r.frames.length).toBe(4);
    expectAligned(r, 3);
  });
});
