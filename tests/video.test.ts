import { describe, expect, it } from 'vitest';
import { createImage } from '../src/core/image.ts';
import { composeSheet, cornerColor, fitFrameSize, frameTimes, meanDifference, pickLoopEnd, sheetLayout } from '../src/core/video/index.ts';
import type { RGBAImage } from '../src/core/types.ts';
import { sliceGrid } from '../src/core/segment/index.ts';

function solid(w: number, h: number, c: [number, number, number], patch?: { x: number; y: number; size: number; c: [number, number, number] }): RGBAImage {
  const img = createImage(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inPatch = patch && x >= patch.x && x < patch.x + patch.size && y >= patch.y && y < patch.y + patch.size;
      const k = inPatch ? patch!.c : c;
      img.data.set([k[0], k[1], k[2], 255], (y * w + x) * 4);
    }
  }
  return img;
}

describe('frameTimes', () => {
  it('spaces frames evenly and excludes the end', () => {
    expect(frameTimes(1, 3, 4)).toEqual([1, 1.5, 2, 2.5]);
  });
  it('gives at least one frame and survives an empty range', () => {
    expect(frameTimes(2, 2, 0)).toEqual([2]);
    expect(frameTimes(3, 1, 3)).toEqual([3, 3, 3]);
  });
});

describe('fitFrameSize', () => {
  it('caps the longest side proportionally and never upscales', () => {
    expect(fitFrameSize(1920, 1080, 768)).toEqual({ width: 768, height: 432 });
    expect(fitFrameSize(1080, 1920, 768)).toEqual({ width: 432, height: 768 });
    expect(fitFrameSize(640, 360, 768)).toEqual({ width: 640, height: 360 });
  });
});

describe('sheetLayout / composeSheet', () => {
  it('uses up to 8 columns and as many rows as needed', () => {
    expect(sheetLayout(8, 100, 100)).toMatchObject({ cols: 8, rows: 1 });
    expect(sheetLayout(16, 100, 100)).toMatchObject({ cols: 8, rows: 2 });
    expect(sheetLayout(3, 100, 100)).toMatchObject({ cols: 3, rows: 1 });
  });

  it('avoids empty cells when it can, and keeps within 8 columns when it cannot', () => {
    expect(sheetLayout(12, 100, 100)).toMatchObject({ cols: 6, rows: 2 });
    expect(sheetLayout(9, 100, 100)).toMatchObject({ cols: 3, rows: 3 });
    for (let n = 1; n <= 64; n++) {
      const l = sheetLayout(n, 50, 50);
      expect(l.cols).toBeLessThanOrEqual(8);
      expect(l.cols * l.rows).toBeGreaterThanOrEqual(n);
      expect(l.cols * l.rows - n).toBeLessThan(l.cols);
    }
  });

  it('fills the gaps with the background and copies each frame to its cell', () => {
    const bg: [number, number, number] = [0, 255, 0];
    const frames = [0, 1, 2, 3, 4].map((i) => solid(20, 10, bg, { x: 5, y: 3, size: 4, c: [i * 40, 0, 0] }));
    const { image, layout } = composeSheet(frames, bg, 3);
    expect(layout).toMatchObject({ cols: 3, rows: 2 });
    expect(image.width).toBe(layout.width);
    expect(image.height).toBe(layout.height);
    const px = (x: number, y: number) => [...image.data.slice((y * image.width + x) * 4, (y * image.width + x) * 4 + 4)];
    expect(px(0, 0)).toEqual([0, 255, 0, 255]);
    // frame 4 sits in row 1, column 1
    const ox = layout.gap + 1 * (20 + layout.gap), oy = layout.gap + 1 * (10 + layout.gap);
    expect(px(ox + 5, oy + 3)).toEqual([160, 0, 0, 255]);
    expect(px(ox - 1, oy)).toEqual([0, 255, 0, 255]);
  });

  it('rejects frames of different size', () => {
    expect(() => composeSheet([solid(4, 4, [0, 0, 0]), solid(5, 4, [0, 0, 0])])).toThrow();
  });

  it('lets the grid slicer find every frame', () => {
    const bg: [number, number, number] = [255, 0, 255];
    const frames = [0, 1, 2, 3].map((i) => solid(30, 30, bg, { x: 8 + i, y: 8, size: 12, c: [20, 20, 200] }));
    const { image, layout } = composeSheet(frames, bg, 2);
    const alpha = createImage(image.width, image.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const isBg = image.data[i] === 255 && image.data[i + 1] === 0 && image.data[i + 2] === 255;
      alpha.data.set([image.data[i], image.data[i + 1], image.data[i + 2], isBg ? 0 : 255], i);
    }
    const rects = sliceGrid(alpha, layout.rows, layout.cols);
    expect(rects).toHaveLength(4);
  });
});

describe('cornerColor', () => {
  it('ignores a character in the middle and compression noise', () => {
    const f = solid(40, 40, [10, 200, 30], { x: 10, y: 10, size: 20, c: [250, 250, 250] });
    f.data.set([13, 198, 33, 255], 0);
    expect(cornerColor([f, f])).toEqual([10, 200, 30]);
  });
});

describe('meanDifference', () => {
  it('is zero for equal images, grows with the change and maxes out on a size mismatch', () => {
    const a = solid(10, 10, [0, 0, 0]);
    expect(meanDifference(a, a)).toBe(0);
    expect(meanDifference(a, solid(10, 10, [30, 30, 30]))).toBe(30);
    expect(meanDifference(a, solid(9, 10, [0, 0, 0]))).toBe(255);
  });
});

describe('pickLoopEnd', () => {
  const at = (diffs: number[]) => diffs.map((diff, i) => ({ time: i * 0.1, diff }));
  it('skips the frames that still look like the start and picks where the cycle closes', () => {
    // start 0, leaves the pose, comes back near 0.6 s, second cycle returns at 1.2 s
    const diffs = [0.2, 3, 8, 10, 7, 4, 0.8, 4, 9, 10, 6, 1, 0.5];
    expect(pickLoopEnd(at(diffs))).toBeCloseTo(0.6);
  });
  it('refines to the local minimum after crossing the threshold', () => {
    expect(pickLoopEnd(at([0.5, 6, 10, 3, 1.5, 2.5, 8]))).toBeCloseTo(0.4);
  });
  it('returns null when the clip never comes back', () => {
    expect(pickLoopEnd(at([0.5, 2, 4, 6, 8, 10]))).toBeNull();
    expect(pickLoopEnd([])).toBeNull();
  });
  it('takes the longest range for a clip that never changes', () => {
    expect(pickLoopEnd(at([0, 0, 0]))).toBeCloseTo(0.2);
  });
});
