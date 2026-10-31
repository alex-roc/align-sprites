import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { zipFiles } from '../src/core/export/index.ts';
import { createImage } from '../src/core/image.ts';
import { buildKitExport, type KitInput } from '../src/core/kit/index.ts';
import { PALETTES, rgbaToHex } from '../src/core/palette/index.ts';
import { runSpriteJob } from '../src/core/pipeline/index.ts';
import { composeTransitions, defaultEdgeStyle, normalizeTileAtlas } from '../src/core/tiles/index.ts';
import type { ExportTarget, RGBAImage, SpriteJob } from '../src/core/types.ts';
import { MAGENTA, makeCharacterFrames, makeSheet, rng } from './fixtures/synth.ts';
import { loadUnfake } from './helpers.ts';

const core = loadUnfake();
const pico = PALETTES.find((p) => p.id === 'pico8')!.colors;
const allowed = new Set(pico.map(rgbaToHex));

function noisy(w: number, h: number, base: [number, number, number], seed: number): RGBAImage {
  const r = rng(seed);
  const img = createImage(w, h);
  for (let i = 0; i < w * h; i++) {
    const n = (r() - 0.5) * 60;
    img.data.set([base[0] + n, base[1] + n, base[2] + n, 255], i * 4);
  }
  return img;
}

function offPalette(img: RGBAImage): number {
  let bad = 0;
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i + 3] && !allowed.has(rgbaToHex([img.data[i], img.data[i + 1], img.data[i + 2], 255]))) bad++;
  }
  return bad;
}

function sprite(name: string, over: Partial<SpriteJob> = {}) {
  const source = makeSheet(makeCharacterFrames(), { scale: 8, seed: 3 }).image;
  return runSpriteJob(core, {
    name, source, mode: 'pixel', bg: { color: MAGENTA, tolerance: 18, strategy: 'global' }, segmentation: { kind: 'auto' },
    animations: [{ name: 'walk', frames: [0, 1, 2, 3], fps: 10, loop: true }], cell: { w: 32, h: 32, padBottom: 0 },
    scale: { kind: 'native' }, ...over,
  });
}

describe('tiles with a fixed palette', () => {
  it('normalizeTileAtlas remaps every tile to the palette (wins over maxColors)', () => {
    const sheet = noisy(32, 32, [90, 160, 70], 5);
    const without = normalizeTileAtlas(core, sheet, { tileSize: 16, cols: 2, rows: 2, mode: 'pixel', maxColors: 4 });
    const withPal = normalizeTileAtlas(core, sheet, { tileSize: 16, cols: 2, rows: 2, mode: 'pixel', maxColors: 4, palette: pico });
    expect(offPalette(without.atlas)).toBeGreaterThan(0);
    expect(offPalette(withPal.atlas)).toBe(0);
  });

  it('composeTransitions: the whole atlas uses only palette colours; cartoon ignores it', () => {
    const a = noisy(16, 16, [90, 160, 70], 1), b = noisy(16, 16, [140, 100, 60], 2);
    const style = defaultEdgeStyle(16, 1);
    const plain = composeTransitions(core, a, b, 16, 'dual16', style, 'pixel');
    const pal = composeTransitions(core, a, b, 16, 'dual16', style, 'pixel', { palette: pico });
    expect(offPalette(plain.atlas)).toBeGreaterThan(0);
    expect(offPalette(pal.atlas)).toBe(0);
    expect(pal.tiles).toEqual(plain.tiles);
    const cartoon = composeTransitions(core, a, b, 16, 'dual16', style, 'cartoon', { palette: pico });
    expect(offPalette(cartoon.atlas)).toBeGreaterThan(0);
  });
});

describe('buildKitExport', () => {
  const hero = sprite('Héroe', { palette: pico });
  const kitInput: KitInput = {
    sprites: [hero, sprite('slime')],
    atlas: { name: 'Mundo', result: normalizeTileAtlas(core, noisy(64, 32, [90, 160, 70], 7), { tileSize: 16, cols: 4, rows: 2, mode: 'pixel' }) },
    terrain: {
      name: 'Hierba',
      names: ['pasto', 'tierra'],
      result: composeTransitions(core, noisy(16, 16, [90, 160, 70], 1), noisy(16, 16, [140, 100, 60], 2), 16, 'dual16', defaultEdgeStyle(16, 1), 'pixel'),
    },
  };
  const paths = (t: ExportTarget): string[] => buildKitExport(kitInput, t).map((f) => f.path).sort();

  it('godot: sprites/<name>/…tres+tscn, tiles/<atlas>.tres, tiles/<terrain>.tres, README', () => {
    const p = paths('godot');
    for (const x of [
      'godot/sprites/heroe/heroe.png', 'godot/sprites/heroe/heroe.tres', 'godot/sprites/heroe/heroe.tscn',
      'godot/sprites/slime/slime.tscn', 'godot/tiles/mundo/mundo.png', 'godot/tiles/mundo/mundo.tres',
      'godot/tiles/hierba/hierba.png', 'godot/tiles/hierba/hierba.tres', 'godot/README.txt',
    ]) expect(p).toContain(x);
  });

  it('gdevelop: animation folders + Tiled .tsx for atlas and terrain', () => {
    const p = paths('gdevelop');
    expect(p).toContain('gdevelop/sprites/heroe_walk_00.png');
    expect(p).toContain('gdevelop/tiles/mundo/mundo.png');
    expect(p).toContain('gdevelop/tiles/mundo/mundo.tsx');
    expect(p).toContain('gdevelop/tiles/hierba/hierba.tsx');
    expect(p).toContain('gdevelop/README.txt');
    const tsx = buildKitExport(kitInput, 'gdevelop').find((f) => f.path === 'gdevelop/tiles/hierba/hierba.tsx')!.data as string;
    expect(tsx).toContain('tilewidth="16"');
    expect(tsx).toContain('columns="4"');
  });

  it('kaplay: atlas PNG + loadSprite snippet with sliceX/sliceY', () => {
    const files = buildKitExport(kitInput, 'kaplay');
    const p = files.map((f) => f.path);
    expect(p).toContain('kaplay/sprites/heroe.png');
    expect(p).toContain('kaplay/sprites/heroe.js');
    expect(p).toContain('kaplay/tiles/mundo.png');
    expect(p).toContain('kaplay/tiles/hierba.png');
    const js = files.find((f) => f.path === 'kaplay/tiles/mundo.js')!.data as string;
    expect(js).toContain('loadSprite("mundo", "mundo.png", { sliceX: 4, sliceY: 2 });');
  });

  it('generic: sheet + Aseprite JSON + tiles atlas', () => {
    const p = paths('generic');
    expect(p).toContain('generic/sprites/heroe.json');
    expect(p).toContain('generic/tiles/mundo/mundo.tsx');
  });

  it('README lists sprites (height, frame size, animations), tile size and palette in en + es', () => {
    const t = buildKitExport(kitInput, 'godot').find((f) => f.path === 'godot/README.txt')!.data as string;
    expect(t).toContain('[EN]');
    expect(t).toContain('[ES]');
    expect(t).toMatch(/heroe: height \d+ px, frame 32x32 px, walk \(4f, 10 fps\)/);
    expect(t).toMatch(/heroe: altura \d+ px, frame 32x32 px, walk \(4f, 10 fps\)/);
    expect(t).toContain('Tile size: 16x16 px');
    expect(t).toContain('Tamaño de tile: 16x16 px');
    for (const h of hero.diag.palette!.map(rgbaToHex)) expect(t).toContain(h);
  });

  it('works without tiles or sprites and packs into a zip', () => {
    const only = buildKitExport({ sprites: [hero] }, 'godot');
    expect(only.some((f) => f.path.startsWith('godot/tiles/'))).toBe(false);
    expect(strFromU8(unzipSync(zipFiles(only))['godot/README.txt']!)).toContain('Tile size: -');
    const none = buildKitExport({ sprites: [], atlas: kitInput.atlas }, 'kaplay');
    expect(none.map((f) => f.path)).toContain('kaplay/tiles/mundo.js');
  });

  it('same name for atlas and terrain does not collide', () => {
    const p = buildKitExport({ ...kitInput, terrain: { ...kitInput.terrain!, name: 'mundo' } }, 'godot').map((f) => f.path);
    expect(new Set(p).size).toBe(p.length);
  });

  it('single static sprites keep a clean layout', () => {
    const one = sprite('piedra', { segmentation: { kind: 'single' }, animations: [{ name: 'default', frames: [0], fps: 8, loop: true }] });
    const p = buildKitExport({ sprites: [one] }, 'godot').map((f) => f.path);
    expect(p).toContain('godot/sprites/piedra/piedra.tscn');
    expect(p).not.toContain('godot/sprites/piedra/piedra.tres');
  });
});
