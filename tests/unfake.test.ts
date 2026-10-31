import { describe, expect, it } from 'vitest';
import { loadUnfake, debugPng } from './helpers.ts';
import { makeCharacterFrames, makeSheet } from './fixtures/synth.ts';

describe('unfake adapter', () => {
  const core = loadUnfake();

  it('detects the ×8 grid of a synthetic sheet and downscales to native size', () => {
    const frames = makeCharacterFrames();
    const sheet = makeSheet(frames, { scale: 8, seed: 7 });
    debugPng('synth-sheet-x8', sheet.image);
    const g = core.detectGrid(sheet.image);
    expect(g).not.toBeNull();
    expect(g!.periodX).toBeCloseTo(8, 0);
    expect(g!.periodY).toBeCloseTo(8, 0);
    const small = core.downscaleGrid(sheet.image, g!, 'dominant');
    expect(Math.abs(small.width - sheet.image.width / 8)).toBeLessThanOrEqual(1);
  });

  it('quantizes and remaps to a fixed palette', () => {
    const frames = makeCharacterFrames();
    const { image, palette } = core.quantize(frames[0], 8);
    expect(palette.length).toBeGreaterThan(0);
    expect(palette.length).toBeLessThanOrEqual(8);
    const re = core.quantize(frames[1], 8, palette);
    expect(re.image.width).toBe(frames[1].width);
    expect(image.width).toBe(frames[0].width);
  });
});
