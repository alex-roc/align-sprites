import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { decode } from 'fast-png';
import { cloneImage, createImage, setPixel } from '../src/core/image.ts';
import { findFrames, sliceGrid } from '../src/core/segment/index.ts';
import type { FrameRegion, RGBA8, RGBAImage } from '../src/core/types.ts';
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

function loadReal(name: string): RGBAImage {
  const p = decode(readFileSync(fileURLToPath(new URL('../samples/real/' + name, import.meta.url))));
  if (p.channels !== 4 || p.depth !== 8) throw new Error(name + ': expected RGBA8');
  return { width: p.width, height: p.height, data: new Uint8ClampedArray(p.data as Uint8Array) };
}

/** Draw rect outlines (1-2 px) over a copy of the image, on a checker-ish grey background for visibility. */
function drawRects(img: RGBAImage, regions: FrameRegion[], colour: RGBA8 = [255, 0, 0, 255]): RGBAImage {
  const out = createImage(img.width, img.height, [90, 90, 90, 255]);
  for (let i = 0; i < img.data.length; i += 4) {
    const a = img.data[i + 3] / 255;
    for (let k = 0; k < 3; k++) out.data[i + k] = img.data[i + k] * a + out.data[i + k] * (1 - a);
  }
  for (const { rect: r } of regions) {
    for (let x = r.x; x < r.x + r.w; x++) for (const y of [r.y, r.y + r.h - 1]) if (x >= 0 && x < out.width && y >= 0 && y < out.height) setPixel(out, x, y, colour);
    for (let y = r.y; y < r.y + r.h; y++) for (const x of [r.x, r.x + r.w - 1]) if (x >= 0 && x < out.width && y >= 0 && y < out.height) setPixel(out, x, y, colour);
  }
  return out;
}

describe('synthetic sheet', () => {
  const sheet = makeSheet(makeCharacterFrames(), { scale: 8 });
  const keyed = keyMagenta(sheet.image);

  it('findFrames: 4 frames in order, bboxes ≈ placements', () => {
    const frames = findFrames(keyed);
    debugPng('segment-synth-auto', drawRects(keyed, frames));
    expect(frames).toHaveLength(4);
    frames.forEach((f, i) => {
      const p = sheet.placements[i];
      expect(f.row).toBe(0);
      expect(f.col).toBe(i);
      // Placement is the full art box; the outline/limbs may not fill it entirely, so compare against it with halo slack.
      expect(f.rect.x).toBeGreaterThanOrEqual(p.x - 3);
      expect(f.rect.y).toBeGreaterThanOrEqual(p.y - 3);
      expect(f.rect.x + f.rect.w).toBeLessThanOrEqual(p.x + p.w + 3);
      expect(f.rect.y + f.rect.h).toBeLessThanOrEqual(p.y + p.h + 3);
      // Feet touch the last art row, so the bottom edge must match tightly.
      expect(Math.abs(f.rect.y + f.rect.h - (p.y + p.h))).toBeLessThanOrEqual(3);
    });
  });

  it('sliceGrid(1,4): every region contains its whole placement', () => {
    const regions = sliceGrid(keyed, 1, 4);
    debugPng('segment-synth-grid', drawRects(keyed, regions));
    expect(regions).toHaveLength(4);
    regions.forEach((g, i) => {
      const p = sheet.placements[i];
      expect(g.col).toBe(i);
      expect(g.rect.x).toBeLessThanOrEqual(p.x);
      expect(g.rect.y).toBeLessThanOrEqual(p.y);
      expect(g.rect.x + g.rect.w).toBeGreaterThanOrEqual(p.x + p.w);
      expect(g.rect.y + g.rect.h).toBeGreaterThanOrEqual(p.y + p.h);
    });
  });

  it('sliceGrid snaps cuts to gutters when a sprite overflows its nominal cell', () => {
    // Two blobs; the left one crosses the nominal midline (x=100) but a gutter exists at 130..150.
    const img = createImage(200, 40);
    for (let y = 10; y < 30; y++) {
      for (let x = 60; x < 125; x++) setPixel(img, x, y, [255, 0, 0, 255]);
      for (let x = 160; x < 190; x++) setPixel(img, x, y, [0, 255, 0, 255]);
    }
    const snapped = sliceGrid(img, 1, 2);
    expect(snapped[0].rect.x + snapped[0].rect.w).toBeGreaterThanOrEqual(125);
    expect(snapped[0].rect.x + snapped[0].rect.w).toBeLessThanOrEqual(160);
    const plain = sliceGrid(img, 1, 2, false);
    expect(plain[0].rect.w).toBe(100);
  });

  it('sliceGrid omits fully transparent cells', () => {
    const img = createImage(100, 100);
    for (let y = 10; y < 20; y++) for (let x = 10; x < 20; x++) setPixel(img, x, y, [255, 255, 255, 255]);
    const r = sliceGrid(img, 2, 2);
    expect(r).toHaveLength(1);
    expect(r[0].row).toBe(0);
    expect(r[0].col).toBe(0);
  });
});

describe('findFrames merging', () => {
  const fill = (img: RGBAImage, x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setPixel(img, x, y, [200, 100, 50, 255]);
  };

  it('merges a detached head/weapon/shadow into its body, keeps separate frames apart', () => {
    const img = createImage(400, 200);
    for (const ox of [0, 200]) {
      fill(img, ox + 70, 70, ox + 130, 170); // body
      fill(img, ox + 85, 30, ox + 115, 50); // floating head (gap 19 px)
      fill(img, ox + 140, 100, ox + 160, 110); // sword (gap 9 px)
      fill(img, ox + 60, 178, ox + 140, 184); // shadow under feet
    }
    const f = findFrames(img, { mergeDist: 4 });
    expect(f).toHaveLength(2);
    expect(f[0].rect).toEqual({ x: 60, y: 30, w: 101, h: 155 });
  });

  it('does not let a stray pixel bridge two frames; absorbs it if only one is near', () => {
    const img = createImage(300, 100);
    fill(img, 10, 10, 90, 90);
    fill(img, 200, 10, 280, 90);
    fill(img, 145, 50, 146, 51); // speck between the frames, far from both
    expect(findFrames(img, { mergeDist: 4 })).toHaveLength(2);
    fill(img, 94, 50, 95, 51); // speck 3 px from the left frame
    const f = findFrames(img, { mergeDist: 4 });
    expect(f).toHaveLength(2);
    expect(f[0].rect.x + f[0].rect.w).toBe(96);
  });

  it('keeps large neighbours apart even when their bboxes overlap by a few px', () => {
    const img = createImage(300, 120);
    // diagonal strokes whose bboxes interleave (11..228 vs 224..434 in Correr.png)
    for (let i = 0; i <= 80; i++) for (let t = 0; t < 6; t++) setPixel(img, 10 + i + t, 20 + i, [9, 9, 9, 255]);
    for (let i = 0; i <= 80; i++) for (let t = 0; t < 6; t++) setPixel(img, 80 + i + t, 20 + i, [9, 9, 9, 255]);
    fill(img, 20, 100, 30, 110);
    expect(findFrames(img, { mergeDist: 4 }).length).toBeGreaterThanOrEqual(2);
  });

  it('orders a multi-row sheet by rows then columns', () => {
    const img = createImage(300, 220);
    // row 0 deliberately has a taller sprite in the middle and different tops
    fill(img, 10, 10, 60, 80); fill(img, 110, 5, 160, 90); fill(img, 210, 20, 260, 85);
    fill(img, 10, 130, 60, 200); fill(img, 110, 125, 160, 205); fill(img, 210, 140, 260, 210);
    const f = findFrames(img, { mergeDist: 4 });
    expect(f.map((r) => [r.row, r.col])).toEqual([[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]]);
    expect(f.map((r) => r.rect.x)).toEqual([10, 110, 210, 10, 110, 210]);
  });

  it('returns [] for a fully transparent image', () => {
    expect(findFrames(createImage(50, 50))).toEqual([]);
  });
});

describe('real assets', () => {
  it('Correr.png: exactly 8 frames, left to right', () => {
    const img = loadReal('Correr.png');
    const frames = findFrames(img);
    debugPng('segment-correr', drawRects(img, frames));
    expect(frames.map((f) => [f.row, f.col])).toEqual(Array.from({ length: 8 }, (_, i) => [0, i]));
    for (let i = 1; i < frames.length; i++) expect(frames[i].rect.x).toBeGreaterThan(frames[i - 1].rect.x);
  });

  it('mosaicos-transparente.png and plataforma1.png: no crash, sane count', () => {
    for (const name of ['mosaicos-transparente.png', 'plataforma1.png']) {
      const img = loadReal(name);
      const t = performance.now();
      const frames = findFrames(img);
      debugPng('segment-' + name.replace('.png', ''), drawRects(img, frames));
      console.log(`${name}: ${frames.length} frames in ${Math.round(performance.now() - t)} ms`);
      expect(frames.length).toBeGreaterThanOrEqual(1);
      expect(frames.length).toBeLessThanOrEqual(200);
    }
  });

  it('is fast on a large image', () => {
    const img = createImage(2500, 1500);
    for (let k = 0; k < 8; k++) for (let y = 100; y < 1400; y++) for (let x = 100 + k * 300; x < 350 + k * 300; x++) setPixel(img, x, y, [1, 2, 3, 255]);
    const t = performance.now();
    expect(findFrames(img)).toHaveLength(8);
    expect(performance.now() - t).toBeLessThan(2000);
  });
});
