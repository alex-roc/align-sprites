import { describe, expect, it } from 'vitest';
import { createImage } from '../src/core/image.ts';
import { inspectImage } from '../src/core/inspect/index.ts';
import type { RGBA8, RGBAImage } from '../src/core/types.ts';
import { loadPng } from './helpers.ts';

function rect(img: RGBAImage, x0: number, y0: number, w: number, h: number, c: RGBA8): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) img.data.set(c, (y * img.width + x) * 4);
}

describe('inspectImage (real assets)', () => {
  const cases: [string, 'single' | 'sheet', number][] = [
    ['samples/real/Personaje suelto.png', 'single', 1],
    ['samples/real/Correr.png', 'sheet', 8],
    ['samples/real/Personaje.png', 'sheet', 4],
    ['samples/codex/wizard-single-pixel-large.png', 'single', 1],
    ['samples/codex/knight-walk-pixel.png', 'sheet', 6],
  ];
  for (const [file, kind, count] of cases) {
    it(`${file}: ${kind} (${count})`, () => {
      const r = inspectImage(loadPng(file), 'pixel');
      expect(r.kind).toBe(kind);
      expect(r.frameCount).toBe(count);
      expect(r.sourceHeight).toBeGreaterThan(100);
    });
  }

  it('reports the height in ORIGINAL px (wizard is ~960 px on a 1254 px canvas)', () => {
    const img = loadPng('samples/codex/wizard-single-pixel-large.png');
    const r = inspectImage(img, 'pixel');
    expect(r.sourceHeight).toBeGreaterThan(940);
    expect(r.sourceHeight).toBeLessThan(985);
    expect(r.bg.color[3]).toBe(255);
  });
});

describe('inspectImage (synthetic)', () => {
  const BLUE: RGBA8 = [40, 90, 200, 255];
  const GOLD: RGBA8 = [230, 190, 40, 255];

  it('a detached hair tuft or weapon does not make a second frame', () => {
    const img = createImage(400, 400, [255, 255, 255, 255]);
    rect(img, 150, 120, 100, 220, BLUE); // body
    rect(img, 170, 90, 50, 22, BLUE); // tuft floating 8 px above the head
    rect(img, 262, 200, 12, 80, GOLD); // sword separate from the arm
    const r = inspectImage(img, 'pixel');
    expect(r.kind).toBe('single');
    expect(r.frameCount).toBe(1);
  });

  it('two characters on white are a sheet', () => {
    const img = createImage(500, 300, [255, 255, 255, 255]);
    rect(img, 60, 60, 100, 200, BLUE);
    rect(img, 300, 80, 100, 180, BLUE);
    const r = inspectImage(img, 'cartoon');
    expect(r.kind).toBe('sheet');
    expect(r.frameCount).toBe(2);
    expect(r.sourceHeight).toBe(200);
  });

  it('is fast on 2000x1000 and measures in original px', () => {
    const img = createImage(2000, 1000, [255, 0, 255, 255]);
    for (let i = 0; i < 4; i++) rect(img, 100 + i * 480, 150, 300, 700, BLUE);
    let best = Infinity;
    let r = inspectImage(img, 'pixel');
    for (let k = 0; k < 3; k++) {
      const t = performance.now();
      r = inspectImage(img, 'pixel');
      best = Math.min(best, performance.now() - t);
    }
    expect(best).toBeLessThan(150);
    expect(r.frameCount).toBe(4);
    expect(Math.abs(r.sourceHeight - 700)).toBeLessThanOrEqual(8);
  });

  it('empty or transparent images give a single zero-height result', () => {
    const r = inspectImage(createImage(64, 64), 'pixel');
    expect(r.frameCount).toBe(0);
    expect(r.sourceHeight).toBe(0);
  });
});
