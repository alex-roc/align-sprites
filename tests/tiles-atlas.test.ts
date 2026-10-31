import { describe, expect, it } from 'vitest';
import { strFromU8 } from 'fflate';
import { crop, createImage } from '../src/core/image.ts';
import { decodePng } from '../src/core/export/index.ts';
import {
  detectTileGrid, gridCutsFor, normalizeTileAtlas, tileAtlasGodot, tileAtlasTiled,
} from '../src/core/tiles/index.ts';
import type { BgOptions, RGBAImage, RGBA8 } from '../src/core/types.ts';
import { rng } from './fixtures/synth.ts';
import { debugPng, loadPng, loadUnfake } from './helpers.ts';

const core = loadUnfake();
const WHITE_FLOOD: BgOptions = { color: 'auto', tolerance: 25, strategy: 'flood' };

/**
 * AI-like sheet: cols×rows tiles of 10×10 art px upscaled ×4 (40 px) with colour noise, white gutters of 3 px
 * (also around the sheet). Tile i gets its own base hue; `blank` cells stay white.
 */
function synthSheet(cols: number, rows: number, blank: number[] = []): { img: RGBAImage; base: RGBA8[] } {
  const gut = 3, art = 10, up = 4, size = art * up;
  const W = gut + cols * (size + gut), H = gut + rows * (size + gut);
  const img = createImage(W, H, [255, 255, 255, 255]);
  const r = rng(99);
  const base: RGBA8[] = [];
  for (let i = 0; i < cols * rows; i++) {
    const c: RGBA8 = [40 + ((i * 53) % 150), 40 + ((i * 97) % 150), 40 + ((i * 31) % 150), 255];
    base.push(c);
    if (blank.includes(i)) continue;
    const x0 = gut + (i % cols) * (size + gut), y0 = gut + Math.floor(i / cols) * (size + gut);
    const artPx = Array.from({ length: art * art }, () => (r() - 0.5) * 60);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const n = artPx[Math.floor(y / up) * art + Math.floor(x / up)] + (r() - 0.5) * 6;
        img.data.set([c[0] + n, c[1] + n, c[2] + n, 255], ((y0 + y) * W + x0 + x) * 4);
      }
    }
  }
  return { img, base };
}

const mean = (img: RGBAImage): number[] => {
  const s = [0, 0, 0];
  const n = img.width * img.height;
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) s[k] += img.data[i * 4 + k] / n;
  return s;
};

describe('detectTileGrid / gridCutsFor (synthetic)', () => {
  const { img } = synthSheet(4, 3);

  it('finds 4×3 cells with cuts on the gutters', () => {
    const g = detectTileGrid(img);
    expect([g.cols, g.rows]).toEqual([4, 3]);
    expect(g.xCuts).toHaveLength(5);
    expect(g.yCuts).toHaveLength(4);
    expect(g.confidence).toBeGreaterThan(0.9);
    // interior cuts sit in the middle of the 3-px gutters: 3 + k·43 + 40 + 1
    for (const [k, x] of g.xCuts.slice(1, -1).entries()) expect(Math.abs(x - (43 + k * 43 + 1))).toBeLessThanOrEqual(1);
  });

  it('gridCutsFor snaps user counts to the same gutters', () => {
    const g = detectTileGrid(img);
    const c = gridCutsFor(img, 4, 3);
    expect(c.xCuts).toEqual(g.xCuts);
    expect(c.yCuts).toEqual(g.yCuts);
    // a wrong count falls back to the uniform grid nudged to the nearest gutters: still a valid monotonic cut list
    const w = gridCutsFor(img, 6, 3);
    expect(w.xCuts).toHaveLength(7);
    expect(w.xCuts.every((x, i, a) => i === 0 || x > a[i - 1])).toBe(true);
  });
});

describe('normalizeTileAtlas (synthetic)', () => {
  it('4×3 tiles of 40 px → exact 64×48 atlas at T=16 (period 2.5, one resample)', () => {
    const { img, base } = synthSheet(4, 3, [11]);
    const r = normalizeTileAtlas(core, img, { tileSize: 16, mode: 'pixel' });
    debugPng('tiles-atlas-synth', r.atlas);
    expect([r.atlas.width, r.atlas.height, r.cols, r.rows, r.tileSize]).toEqual([64, 48, 4, 3, 16]);
    expect(r.tiles).toHaveLength(12);
    expect(r.tiles.filter((t) => t.empty).map((t) => t.row * 4 + t.col)).toEqual([11]);
    expect(r.warnings).toEqual([]);
    for (const t of r.tiles.filter((x) => !x.empty)) {
      const m = mean(crop(r.atlas, { x: t.col * 16, y: t.row * 16, w: 16, h: 16 }));
      const b = base[t.row * 4 + t.col];
      for (let k = 0; k < 3; k++) expect(Math.abs(m[k] - b[k])).toBeLessThan(12);
      // tile window = the 40-px art, not the gutter
      expect(t.source.w).toBe(40);
      expect(t.source.h).toBe(40);
    }
    // empty tile is transparent; the others are fully opaque (binary alpha)
    const e = crop(r.atlas, { x: 3 * 16, y: 2 * 16, w: 16, h: 16 });
    expect(e.data.every((v) => v === 0)).toBe(true);
    const full = crop(r.atlas, { x: 0, y: 0, w: 16, h: 16 });
    for (let i = 3; i < full.data.length; i += 4) expect(full.data[i]).toBe(255);
  });

  it('user cols/rows, cartoon mode and shared palette keep the exact size', () => {
    const { img } = synthSheet(4, 3);
    for (const tileSize of [16, 32, 48]) {
      const r = normalizeTileAtlas(core, img, { tileSize, cols: 4, rows: 3, mode: 'cartoon' });
      expect([r.atlas.width, r.atlas.height]).toEqual([4 * tileSize, 3 * tileSize]);
    }
    const q = normalizeTileAtlas(core, img, { tileSize: 16, mode: 'pixel', maxColors: 8 });
    expect([q.atlas.width, q.atlas.height]).toEqual([64, 48]);
    const colours = new Set<number>();
    for (let i = 0; i < q.atlas.data.length; i += 4) colours.add((q.atlas.data[i] << 16) | (q.atlas.data[i + 1] << 8) | q.atlas.data[i + 2]);
    expect(colours.size).toBeLessThanOrEqual(8);
    // null core: nearest fallback, still exact
    const n = normalizeTileAtlas(null, img, { tileSize: 16, mode: 'pixel' });
    expect([n.atlas.width, n.atlas.height]).toEqual([64, 48]);
  });

  it('warns when the tile is smaller than the output size', () => {
    const { img } = synthSheet(4, 3);
    const r = normalizeTileAtlas(core, img, { tileSize: 64, mode: 'pixel' });
    expect(r.warnings.map((w) => w.key)).toContain('warn.tileUpscaled');
  });
});

describe('real AI sheets', () => {
  it('Andean mountains (white background, 4 px fake pixels): 10×7 cells → exact 320×224 atlas', () => {
    const img = loadPng('samples/real/Tileset pixel art de montañas andinas.png');
    const g = detectTileGrid(img);
    expect([g.cols, g.rows]).toEqual([10, 7]);
    expect(g.confidence).toBeGreaterThan(0.8);
    const r = normalizeTileAtlas(core, img, { tileSize: 32, mode: 'pixel', bg: WHITE_FLOOD });
    debugPng('tiles-atlas-montanas', r.atlas);
    expect([r.atlas.width, r.atlas.height, r.cols, r.rows]).toEqual([320, 224, 10, 7]);
    // the 3 unused cells of the last row are the only empty ones
    expect(r.tiles.filter((t) => t.empty).map((t) => `${t.col},${t.row}`)).toEqual(['7,6', '8,6', '9,6']);
    // the sky tiles (row 5) keep their blue sky: opaque, mostly blue
    for (let c = 0; c < 10; c++) {
      const t = crop(r.atlas, { x: c * 32, y: 5 * 32, w: 32, h: 32 });
      let opaque = 0;
      for (let i = 3; i < t.data.length; i += 4) if (t.data[i] === 255) opaque++;
      expect(opaque / (32 * 32)).toBeGreaterThan(0.97);
      const m = mean(t);
      expect(m[2]).toBeGreaterThan(m[0]);
    }
    // the white background is gone from the corner of a grass tile
    expect(r.atlas.data[3]).toBe(0);
  });

  it('transparent mosaics (612×408): same 10×7 grid → exact 320×224 atlas', () => {
    const img = loadPng('samples/real/mosaicos-transparente.png');
    const g = detectTileGrid(img);
    expect([g.cols, g.rows]).toEqual([10, 7]);
    const r = normalizeTileAtlas(core, img, { tileSize: 32, mode: 'pixel' });
    debugPng('tiles-atlas-mosaicos', r.atlas);
    expect([r.atlas.width, r.atlas.height, r.cols, r.rows]).toEqual([320, 224, 10, 7]);
    expect(r.tiles.filter((t) => t.empty)).toHaveLength(3);
    const cartoon = normalizeTileAtlas(null, img, { tileSize: 32, mode: 'cartoon' });
    expect([cartoon.atlas.width, cartoon.atlas.height]).toEqual([320, 224]);
  });
});

describe('atlas export', () => {
  it('Godot: png + .tres with TileSetAtlasSource, one line per non-empty tile', () => {
    const { img } = synthSheet(4, 3, [11]);
    const r = normalizeTileAtlas(core, img, { tileSize: 16, mode: 'pixel' });
    const files = tileAtlasGodot(r, 'Pasto Tierra');
    expect(files.map((f) => f.path)).toEqual(['pasto_tierra/pasto_tierra.png', 'pasto_tierra/pasto_tierra.tres']);
    const png = decodePng(files[0].data as Uint8Array);
    expect([png.width, png.height]).toEqual([64, 48]);
    const tres = typeof files[1].data === 'string' ? files[1].data : strFromU8(files[1].data);
    expect(tres).toContain('[ext_resource type="Texture2D" path="pasto_tierra.png" id="1_tex"]');
    expect(tres).toContain('texture_region_size = Vector2i(16, 16)');
    expect(tres).toContain('tile_size = Vector2i(16, 16)');
    expect(tres.match(/^\d+:\d+\/0 = 0$/gm)).toHaveLength(11);
    expect(tres).not.toContain('3:2/0');
    expect(tres).not.toContain('uid');
  });

  it('Tiled: .tsx with tile size, columns and image', () => {
    const { img } = synthSheet(4, 3);
    const r = normalizeTileAtlas(core, img, { tileSize: 16, mode: 'pixel' });
    const tsx = tileAtlasTiled(r, 'mapa');
    expect(tsx.map((f) => f.path)).toEqual(['mapa/mapa.png', 'mapa/mapa.tsx']);
    const x = tsx[1].data as string;
    expect(x).toContain('tilewidth="16" tileheight="16" tilecount="12" columns="4"');
    expect(x).toContain('<image source="mapa.png" width="64" height="48"/>');
  });
});
