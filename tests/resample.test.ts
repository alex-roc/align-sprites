import { describe, expect, it } from 'vitest';
import { createImage, getPixel, setPixel } from '../src/core/image.ts';
import { resampleArea, resampleScale } from '../src/core/resample/index.ts';

function disc(size: number, color: [number, number, number]) {
  const img = createImage(size, size);
  const c = size / 2;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) if (Math.hypot(x + 0.5 - c, y + 0.5 - c) <= size * 0.35) setPixel(img, x, y, [...color, 255]);
  return img;
}

describe('resample', () => {
  it('reducing an opaque disc on transparent adds no dark fringe', () => {
    const color: [number, number, number] = [240, 200, 120];
    const out = resampleArea(disc(100, color), 37, 37);
    let semi = 0;
    for (let i = 0; i < out.data.length; i += 4) {
      const a = out.data[i + 3];
      if (a === 0) continue;
      if (a < 255) semi++;
      // Straight colour must stay the disc colour even on partially covered pixels.
      expect(Math.abs(out.data[i] - color[0])).toBeLessThanOrEqual(2);
      expect(Math.abs(out.data[i + 1] - color[1])).toBeLessThanOrEqual(2);
      expect(Math.abs(out.data[i + 2] - color[2])).toBeLessThanOrEqual(2);
    }
    expect(semi).toBeGreaterThan(10);
  });

  it('enlarging keeps the colour too (premultiplied bilinear)', () => {
    const out = resampleArea(disc(20, [10, 200, 30]), 70, 50);
    for (let i = 0; i < out.data.length; i += 4) {
      if (out.data[i + 3] === 0) continue;
      expect(out.data[i]).toBeLessThanOrEqual(12);
      expect(Math.abs(out.data[i + 1] - 200)).toBeLessThanOrEqual(2);
    }
  });

  it('resampleScale gives the right dimensions', () => {
    const img = createImage(40, 30, [1, 2, 3, 255]);
    const half = resampleScale(img, 0.5);
    expect([half.width, half.height]).toEqual([20, 15]);
    const tiny = resampleScale(img, 0.001);
    expect([tiny.width, tiny.height]).toEqual([1, 1]);
    const big = resampleScale(img, 2.5);
    expect([big.width, big.height]).toEqual([100, 75]);
  });

  it('keeps a uniform image uniform (down and up, fractional ratios)', () => {
    const img = createImage(53, 31, [37, 111, 201, 255]);
    for (const [w, h] of [[20, 11], [53, 31], [100, 77], [7, 90]]) {
      const out = resampleArea(img, w, h);
      expect(out.width).toBe(w);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) expect(getPixel(out, x, y)).toEqual([37, 111, 201, 255]);
    }
  });

  it('exact 2x box average and does not mutate the input', () => {
    const img = createImage(2, 2);
    setPixel(img, 0, 0, [255, 0, 0, 255]);
    setPixel(img, 1, 0, [0, 0, 255, 255]);
    const copy = new Uint8ClampedArray(img.data);
    const out = resampleArea(img, 1, 1);
    expect(img.data).toEqual(copy);
    // Two opaque pixels of four: alpha 128, colour is their plain average.
    expect(getPixel(out, 0, 0)).toEqual([128, 0, 128, 128]);
  });
});
