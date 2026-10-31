import { describe, expect, it } from 'vitest';
import { createImage, crop } from '../src/core/image.ts';
import {
  BLOB47_MASKS, BLOB_A_POS, DUAL16_POS, blobMaskAt, composeTransitions, defaultEdgeStyle, godotTerrainTileSet,
  makeSeamlessTile, prepareTerrain, renderTerrainMap, seamScore, terrainExport,
} from '../src/core/tiles/index.ts';
import type { ArtMode, EdgeStyle, RGBAImage, TileLayout, TileSetResult } from '../src/core/types.ts';
import { rng } from './fixtures/synth.ts';
import { debugPng, loadUnfake } from './helpers.ts';

const core = loadUnfake();

/** T×T noisy texture around `base` (i.i.d. noise, so it wraps). */
function tex(T: number, base: [number, number, number], seed: number): RGBAImage {
  const r = rng(seed);
  const img = createImage(T, T);
  for (let i = 0; i < T * T; i++) {
    const n = (r() - 0.5) * 50;
    img.data.set([base[0] + n, base[1] + n, base[2] + n, 255], i * 4);
  }
  return img;
}

const GREEN = (T: number) => tex(T, [70, 150, 60], 1);
const BROWN = (T: number) => tex(T, [130, 90, 50], 2);

function randomCells(w: number, h: number, seed: number, p = 0.55): Uint8Array {
  const r = rng(seed);
  const c = new Uint8Array(w * h);
  for (let i = 0; i < c.length; i++) c[i] = r() < p ? 1 : 0;
  return c;
}

/** Number of pixels whose channels differ by more than `tol` levels. */
const same = (a: RGBAImage, b: RGBAImage, tol = 0): number => {
  let bad = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    if (Math.max(...[0, 1, 2, 3].map((k) => Math.abs(a.data[i + k] - b.data[i + k]))) > tol) bad++;
  }
  return bad;
};

describe('masks and tables', () => {
  it('has 47 canonical blob masks (diagonals only with both sides) and 16 dual masks at distinct positions', () => {
    expect(BLOB47_MASKS).toHaveLength(47);
    expect(new Set(BLOB47_MASKS).size).toBe(47);
    expect(BLOB47_MASKS[0]).toBe(0);
    expect(BLOB47_MASKS[46]).toBe(255);
    for (const m of BLOB47_MASKS) {
      if (m & 2) expect(m & 5).toBe(5); // NE needs N and E
      if (m & 8) expect(m & 20).toBe(20); // SE needs E and S
      if (m & 32) expect(m & 80).toBe(80); // SW needs S and W
      if (m & 128) expect(m & 65).toBe(65); // NW needs W and N
    }
    expect(new Set(Object.values(DUAL16_POS).map(([c, r]) => c + r * 4)).size).toBe(16);
  });
});

describe.each([['pixel', 16], ['pixel', 32], ['cartoon', 16]] as [ArtMode, number][])('composeTransitions (%s, T=%i)', (mode, T) => {
  const style: EdgeStyle = { ...defaultEdgeStyle(T, 7), outline: mode === 'pixel' ? 'auto' : undefined };

  it('blob47: 8×6 atlas, 47 unique masks + plain A, bits match masks', () => {
    const r = composeTransitions(core, GREEN(T), BROWN(T), T, 'blob47', style, mode);
    debugPng(`tiles-blob47-${mode}-${T}`, r.atlas);
    expect([r.atlas.width, r.atlas.height, r.cols, r.rows]).toEqual([8 * T, 6 * T, 8, 6]);
    expect(new Set(r.tiles.filter((t) => t.mask >= 0).map((t) => t.mask)).size).toBe(47);
    const names = ['top_side', 'top_right_corner', 'right_side', 'bottom_right_corner', 'bottom_side', 'bottom_left_corner', 'left_side', 'top_left_corner'];
    for (const t of r.tiles.filter((x) => x.mask >= 0)) {
      expect(t.terrain).toBe(0);
      names.forEach((n, k) => expect((t.bits as Record<string, number | undefined>)[n]).toBe(t.mask & (1 << k) ? 0 : undefined));
    }
    const a = r.tiles.find((t) => t.mask === -1)!;
    expect([a.col, a.row, a.terrain]).toEqual([BLOB_A_POS.col, BLOB_A_POS.row, -1]);
    expect(r.warnings).toEqual([]);
  });

  it('dual16: 4×4 atlas, 16 unique masks at the Standard positions, corner bits 0/1', () => {
    const r = composeTransitions(core, GREEN(T), BROWN(T), T, 'dual16', style, mode);
    debugPng(`tiles-dual16-${mode}-${T}`, r.atlas);
    expect([r.atlas.width, r.atlas.height]).toEqual([4 * T, 4 * T]);
    expect(new Set(r.tiles.map((t) => t.mask)).size).toBe(16);
    for (const t of r.tiles) {
      expect([t.col, t.row]).toEqual(DUAL16_POS[t.mask]);
      expect(t.bits.top_left_corner).toBe(t.mask & 1 ? 1 : 0);
      expect(t.bits.top_right_corner).toBe(t.mask & 2 ? 1 : 0);
      expect(t.bits.bottom_left_corner).toBe(t.mask & 4 ? 1 : 0);
      expect(t.bits.bottom_right_corner).toBe(t.mask & 8 ? 1 : 0);
      expect(t.terrain).toBe(t.mask === 0 ? 0 : t.mask === 15 ? 1 : -1);
    }
  });

  it('blob47: a 32×32 random map assembled from tiles is pixel-identical to the one-shot render of the mask', () => {
    const w = 32, h = 32;
    const cells = randomCells(w, h, 11);
    const r = composeTransitions(core, GREEN(T), BROWN(T), T, 'blob47', style, mode);
    const kit = prepareTerrain(core, GREEN(T), BROWN(T), T, style, mode);
    const ref = renderTerrainMap(kit, cells, w, h);
    const byMask = new Map(r.tiles.map((t) => [t.mask, t]));
    // The canonical 47 masks ignore a diagonal B unless both sides are B. The tile cannot know the real diagonal, so
    // where it differs, the blur of the pixels next to that corner reads a slightly different field: exact at
    // T=16 in pixel mode, and a few stray pixels (< 0.2 %) at larger T / with the cartoon soft band.
    const tol = mode === 'pixel' ? 0 : 3;
    const maxBad = mode === 'pixel' && T === 16 ? 0 : 0.002 * 30 * 30 * T * T;
    let bad = 0, checked = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const t = byMask.get(cells[y * w + x] ? blobMaskAt(cells, w, h, x, y) : -1)!;
        const built = crop(r.atlas, { x: t.col * T, y: t.row * T, w: T, h: T });
        bad += same(built, crop(ref, { x: x * T, y: y * T, w: T, h: T }), tol);
        checked++;
      }
    }
    expect(checked).toBe(30 * 30);
    expect(bad).toBeLessThanOrEqual(maxBad);
  });

  it('dual16: a 32×32 random data map assembled from tiles (half-tile offset) is pixel-identical to the one-shot render', () => {
    const w = 32, h = 32;
    const cells = randomCells(w, h, 5);
    const r = composeTransitions(core, GREEN(T), BROWN(T), T, 'dual16', style, mode);
    const kit = prepareTerrain(core, GREEN(T), BROWN(T), T, style, mode);
    const ref = renderTerrainMap(kit, cells, w, h);
    const byMask = new Map(r.tiles.map((t) => [t.mask, t]));
    const c = (x: number, y: number) => cells[y * w + x];
    let bad = 0;
    for (let j = 1; j < h; j++) {
      for (let i = 1; i < w; i++) {
        const m = c(i - 1, j - 1) * 1 + c(i, j - 1) * 2 + c(i - 1, j) * 4 + c(i, j) * 8;
        const t = byMask.get(m)!;
        const built = crop(r.atlas, { x: t.col * T, y: t.row * T, w: T, h: T });
        bad += same(built, crop(ref, { x: i * T - T / 2, y: j * T - T / 2, w: T, h: T }));
      }
    }
    expect(bad).toBe(0);
  });
});

describe('composeTransitions details', () => {
  const T = 16;
  const style = defaultEdgeStyle(T, 3);

  it('blob47: full-B tile is the B texture and the A tile the A texture', () => {
    const r = composeTransitions(core, GREEN(T), BROWN(T), T, 'blob47', style, 'pixel');
    const t = r.tiles.find((x) => x.mask === 255)!;
    expect(same(crop(r.atlas, { x: t.col * T, y: t.row * T, w: T, h: T }), BROWN(T))).toBe(0);
    expect(same(crop(r.atlas, { x: 7 * T, y: 5 * T, w: T, h: T }), GREEN(T))).toBe(0);
  });

  it('pixel mode is binary (only A/B colours + outline) and the lone-B tile keeps an A margin', () => {
    const r = composeTransitions(core, GREEN(T), BROWN(T), T, 'blob47', { ...style, outline: [10, 20, 30, 255] }, 'pixel');
    const t0 = crop(r.atlas, { x: 0, y: 0, w: T, h: T }); // mask 0: island
    const px = (x: number, y: number) => Array.from(t0.data.slice((y * T + x) * 4, (y * T + x) * 4 + 4));
    expect(px(0, 0)[1]).toBeGreaterThan(px(0, 0)[0]); // corner = green (A)
    const outline = [10, 20, 30, 255];
    let n = 0;
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (px(x, y).join() === outline.join()) n++;
    expect(n).toBeGreaterThan(8);
  });

  it('b = null paints A over transparency (transparent plain tile, opaque full tile)', () => {
    const r = composeTransitions(core, GREEN(T), null, T, 'blob47', style, 'pixel');
    expect(r.atlas.data[((5 * T) * r.atlas.width + 7 * T) * 4 + 3]).toBe(0);
    const t = r.tiles.find((x) => x.mask === 255)!;
    expect(same(crop(r.atlas, { x: t.col * T, y: t.row * T, w: T, h: T }), GREEN(T))).toBe(0);
    const t0 = crop(r.atlas, { x: 0, y: 0, w: T, h: T });
    expect(t0.data[3]).toBe(0);
    expect(t0.data[((T >> 1) * T + (T >> 1)) * 4 + 3]).toBe(255);
  });

  it('warns about non-seamless textures and clamps a style that is too large', () => {
    const grad = createImage(T, T);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) grad.data.set([x * 16, y * 16, 100, 255], (y * T + x) * 4);
    expect(seamScore(grad)).toBeGreaterThan(1.8);
    expect(seamScore(GREEN(T))).toBeLessThan(1.4);
    const r = composeTransitions(core, grad, BROWN(T), T, 'dual16', { ...style, margin: 6, blur: 6, noiseAmp: 6 }, 'pixel');
    const keys = r.warnings.map((w) => w.key);
    expect(keys).toContain('warn.notSeamless');
    expect(keys).toContain('warn.edgeStyleClamped');
  });

  it('makeSeamlessTile reduces a larger upscaled texture to exactly T×T', () => {
    const big = createImage(128, 128);
    const small = GREEN(32);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) big.data.set(small.data.subarray(((y >> 2) * 32 + (x >> 2)) * 4, ((y >> 2) * 32 + (x >> 2)) * 4 + 4), (y * 128 + x) * 4);
    const t = makeSeamlessTile(core, big, 16, 'pixel');
    expect([t.width, t.height]).toEqual([16, 16]);
    const c = makeSeamlessTile(core, big, 16, 'cartoon');
    expect([c.width, c.height]).toEqual([16, 16]);
  });
});

describe('godot / export', () => {
  const T = 16;
  const rs: Record<TileLayout, TileSetResult> = {
    blob47: composeTransitions(core, GREEN(T), BROWN(T), T, 'blob47', defaultEdgeStyle(T), 'pixel'),
    dual16: composeTransitions(core, GREEN(T), BROWN(T), T, 'dual16', defaultEdgeStyle(T), 'pixel'),
  };

  it('blob47 .tres: mode 0, one terrain, 47 tiles with terrain, A tile without terrain_set', () => {
    const s = godotTerrainTileSet(rs.blob47, 'x.png', ['pasto', 'tierra']);
    expect(s).toContain('terrain_set_0/mode = 0');
    expect(s).toContain('terrain_set_0/terrain_0/name = "tierra"');
    expect(s).not.toContain('terrain_1');
    expect(s.match(/\/terrain = 0/g)).toHaveLength(47);
    expect(s.match(/\/terrain_set = 0/g)).toHaveLength(47);
    expect(s).toContain('7:5/0 = 0\n');
    expect(s).toContain('texture_region_size = Vector2i(16, 16)');
    expect(s).toContain('path="x.png"');
    expect(godotTerrainTileSet(rs.blob47, 'x.png', ['a', 'b'], { aTileTerrainSet: true }).match(/\/terrain_set = 0/g)).toHaveLength(48);
  });

  it('dual16 .tres: mode 1, two terrains, 16 tiles, corner bits 0/1', () => {
    const s = godotTerrainTileSet(rs.dual16, 'x.png', ['pasto', 'tierra']);
    expect(s).toContain('terrain_set_0/mode = 1');
    expect(s).toContain('terrain_set_0/terrain_1/name = "tierra"');
    expect(s.match(/\/terrain_set = 0/g)).toHaveLength(16);
    expect(s.match(/terrains_peering_bit\//g)).toHaveLength(64);
    expect(s).not.toContain('_side =');
  });

  it('terrainExport: png + tres + bilingual README', () => {
    const files = terrainExport(rs.dual16, 'Pasto Tierra', ['pasto', 'tierra']);
    expect(files.map((f) => f.path)).toEqual(['pasto_tierra/pasto_tierra.png', 'pasto_tierra/pasto_tierra.tres', 'pasto_tierra/README.txt']);
    const readme = files[2].data as string;
    expect(readme).toContain('[EN]');
    expect(readme).toContain('[ES]');
    expect(readme).toContain('GDevelop');
    expect(readme).toContain('Terrains');
  });
});
