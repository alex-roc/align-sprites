import { describe, expect, it } from 'vitest';
import { createImage, setPixel } from '../src/core/image.ts';
import { GAME_RESOLUTIONS, fitScale, integerScaleTo, levelLayout, pickLevelAnims, resolutionByWidth, surfaceInset, tileTopInset } from '../src/core/kit/level.ts';

/** A tile whose rows from `top` down are solid; above, `sparse` px of every row are opaque (grass blades). */
function tileWithTop(size: number, top: number, sparse = 0): ReturnType<typeof createImage> {
  const img = createImage(size, size);
  for (let y = 0; y < size; y++) {
    const n = y >= top ? size : y >= top - 3 ? sparse : 0;
    for (let x = 0; x < n; x++) setPixel(img, x, y, [60, 160, 60, 255]);
  }
  return img;
}

describe('tileTopInset', () => {
  it('is 0 for a full tile and for an empty one', () => {
    expect(tileTopInset(tileWithTop(16, 0))).toBe(0);
    expect(tileTopInset(createImage(16, 16))).toBe(0);
  });
  it('skips empty rows and sparse blades', () => {
    expect(tileTopInset(tileWithTop(16, 5))).toBe(5);
    expect(tileTopInset(tileWithTop(16, 8, 4))).toBe(8);
  });
  it('ignores faint pixels', () => {
    const img = tileWithTop(16, 4);
    for (let x = 0; x < 16; x++) img.data[(2 * 16 + x) * 4 + 3] = 40;
    expect(tileTopInset(img)).toBe(4);
  });
  it('surfaceInset is the median of several tiles', () => {
    expect(surfaceInset([tileWithTop(16, 2), tileWithTop(16, 6), tileWithTop(16, 4)])).toBe(4);
    expect(surfaceInset([])).toBe(0);
  });
});

describe('resolutions', () => {
  it('maps 640×360 to 1920×1080 as ×3 and 1280×720 to Full HD as nothing', () => {
    expect(integerScaleTo(resolutionByWidth(640), 1920)).toBe(3);
    expect(integerScaleTo(resolutionByWidth(1280), 1920)).toBeNull();
    expect(integerScaleTo(resolutionByWidth(1280), 3840)).toBe(3);
  });
  it('are 16:9 and fall back to 640 when unknown', () => {
    for (const r of GAME_RESOLUTIONS) expect(r.w * 9).toBe(r.h * 16);
    expect(resolutionByWidth(123).w).toBe(640);
  });
  it('fitScale is an integer of at least 1', () => {
    expect(fitScale(resolutionByWidth(320), 1300, 800)).toBe(4);
    expect(fitScale(resolutionByWidth(1280), 900, 600)).toBe(1);
  });
});

describe('pickLevelAnims', () => {
  it('matches English and Spanish names', () => {
    expect(pickLevelAnims(['Reposo', 'Correr', 'Saltar'])).toEqual({ idle: 'Reposo', walk: 'Correr', run: 'Correr', jump: 'Saltar' });
    expect(pickLevelAnims(['idle', 'walk', 'run', 'jump'])).toEqual({ idle: 'idle', walk: 'walk', run: 'run', jump: 'jump' });
  });
  it('falls back to idle, then to the first animation', () => {
    expect(pickLevelAnims(['hero'])).toEqual({ idle: 'hero', walk: 'hero', run: 'hero', jump: 'hero' });
    expect(pickLevelAnims(['stand', 'run'])).toMatchObject({ idle: 'stand', walk: 'run', jump: 'stand' });
    expect(pickLevelAnims([])).toBeNull();
  });
});

describe('levelLayout', () => {
  it('keeps the floor on the grid and platforms inside the level and above the floor', () => {
    for (const res of GAME_RESOLUTIONS) {
      const L = levelLayout(res.w, res.h, res.tile);
      expect(L.floorTop + L.floorRows * res.tile).toBe(res.h);
      expect(L.width % res.tile).toBe(0);
      expect(L.platforms.length).toBeGreaterThan(0);
      for (const p of L.platforms) {
        expect(p.top).toBeGreaterThanOrEqual(0);
        expect(p.top).toBeLessThan(L.floorTop);
        expect((p.col + p.len) * res.tile).toBeLessThanOrEqual(L.width);
      }
    }
  });
  it('still builds a floor when the tile is huge for the screen', () => {
    const L = levelLayout(320, 180, 128);
    expect(L.floorRows).toBe(1);
    expect(L.floorTop).toBe(52);
  });
});

describe('levelLayout reach', () => {
  it('raises the platforms with the jump', () => {
    const lo = levelLayout(640, 360, 32, 1);
    const hi = levelLayout(640, 360, 32, 4);
    expect(Math.min(...hi.platforms.map((p) => p.top))).toBeLessThan(Math.min(...lo.platforms.map((p) => p.top)));
    expect(lo.floorTop - Math.min(...lo.platforms.map((p) => p.top))).toBe(32);
  });
});
