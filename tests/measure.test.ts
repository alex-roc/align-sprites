import { describe, expect, it } from 'vitest';
import { cloneImage, crop, createImage, setPixel } from '../src/core/image.ts';
import { measureFrame, referenceHeight } from '../src/core/measure/index.ts';
import type { RGBAImage } from '../src/core/types.ts';
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
/** Each placement cropped with the same margin around it. */
const PAD = 12;
const crops = sheet.placements.map((p) => crop(keyed, { x: p.x - PAD, y: p.y - PAD, w: p.w + 2 * PAD, h: p.h + 2 * PAD }));

describe('measureFrame', () => {
  it('footY is the same across frames of the synthetic sheet', () => {
    const feet = crops.map((c, i) => measureFrame(c).footY - (sheet.placements[i].h + PAD - 1));
    // Feet touch the last art row of each placement, so the offset to the placement bottom must not vary.
    expect(new Set(feet).size).toBe(1);
    expect(Math.abs(feet[0])).toBeLessThanOrEqual(1);
  });

  it('bbox of an opaque rectangle; alphaMin respected', () => {
    const img = createImage(20, 20);
    for (let y = 5; y < 15; y++) for (let x = 3; x < 9; x++) setPixel(img, x, y, [1, 1, 1, 255]);
    setPixel(img, 18, 2, [1, 1, 1, 100]); // faint pixel below the default threshold
    const m = measureFrame(img);
    expect(m.bbox).toEqual({ x: 3, y: 5, w: 6, h: 10 });
    expect(m.footY).toBe(14);
    expect(measureFrame(img, { alphaMin: 50 }).bbox).toEqual({ x: 3, y: 2, w: 16, h: 13 });
  });

  it('footY ignores a 1-px speck below the feet', () => {
    const img = createImage(20, 30);
    for (let y = 5; y < 20; y++) for (let x = 5; x < 10; x++) setPixel(img, x, y, [1, 1, 1, 255]);
    setPixel(img, 7, 26, [1, 1, 1, 255]);
    const m = measureFrame(img);
    expect(m.bbox.y + m.bbox.h - 1).toBe(26);
    expect(m.footY).toBe(19);
  });

  it('transparent image: documented defaults', () => {
    expect(measureFrame(createImage(30, 40))).toEqual({ bbox: { x: 0, y: 0, w: 0, h: 0 }, footY: 39, anchorX: 15 });
  });

  it('anchorX methods on a symmetric frame agree with the centre', () => {
    const c = crops[0];
    const mid = c.width / 2;
    for (const method of ['medianColumn', 'centroid', 'bboxCenter'] as const) {
      const a = measureFrame(c, { anchorX: method }).anchorX;
      expect(Math.abs(a - mid)).toBeLessThan(sheet.scale * 3);
    }
  });

  it("'medianColumn' is more stable than 'bboxCenter' when one frame gets a long arm", () => {
    const base = crops[1];
    // Same content on a canvas 80 px wider, so the arm fits.
    const wide = crop(base, { x: 0, y: 0, w: base.width + 80, h: base.height });
    const armed = cloneImage(wide);
    // A long sword/arm sticking out to the right at mid-body: 70 px long, 12 px tall.
    const bb = measureFrame(base).bbox;
    const y0 = bb.y + Math.round(bb.h * 0.4);
    for (let y = y0; y < y0 + 12; y++) for (let x = bb.x + bb.w; x < bb.x + bb.w + 70; x++) setPixel(armed, x, y, [200, 200, 200, 255]);

    const shift = (method: 'medianColumn' | 'bboxCenter') =>
      Math.abs(measureFrame(armed, { anchorX: method }).anchorX - measureFrame(wide, { anchorX: method }).anchorX);
    const median = shift('medianColumn');
    const center = shift('bboxCenter');
    expect(center).toBeCloseTo(35, 0);
    expect(median).toBeLessThan(center / 3);
  });
});

describe('referenceHeight', () => {
  const ms = [10, 20, 30, 100].map((h) => ({ bbox: { x: 0, y: 0, w: 5, h }, footY: h - 1, anchorX: 2 }));
  const empty = { bbox: { x: 0, y: 0, w: 0, h: 0 }, footY: 0, anchorX: 0 };

  it('median ignores empty frames', () => {
    expect(referenceHeight([...ms, empty])).toBe(25);
    expect(referenceHeight(ms.slice(0, 3))).toBe(20);
  });
  it('p90 and empty input', () => {
    expect(referenceHeight(ms, 'p90')).toBe(100);
    expect(referenceHeight([empty])).toBe(0);
  });
});
