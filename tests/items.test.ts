import { describe, expect, it } from 'vitest';
import { strFromU8 } from 'fflate';
import { removeBackground } from '../src/core/bg/index.ts';
import { crop, createImage } from '../src/core/image.ts';
import { decodePng } from '../src/core/export/index.ts';
import { findItems, itemNames, itemsExport, normalizeItems, type ItemsResult } from '../src/core/items/index.ts';
import type { BgOptions, ExportFile, RGBA8 } from '../src/core/types.ts';
import { ITEM_ART, makeItemsSheet } from './fixtures/items.ts';
import { loadUnfake } from './helpers.ts';

const core = loadUnfake();
const WHITE: BgOptions = { color: 'auto', tolerance: 25, strategy: 'flood' };
const sheet = makeItemsSheet();
const N = ITEM_ART.length;
const idx = (name: string) => ITEM_ART.findIndex((a) => a.name === name);
const longest = (c: { w: number; h: number }) => Math.max(c.w, c.h);
const text = (files: ExportFile[], path: string): string => {
  const f = files.find((x) => x.path === path);
  if (!f) throw new Error(`missing ${path}: ${files.map((x) => x.path).join(', ')}`);
  return typeof f.data === 'string' ? f.data : strFromU8(f.data);
};
const run = (o: Partial<Parameters<typeof normalizeItems>[2]> = {}): ItemsResult =>
  normalizeItems(core, sheet.img, { cellSize: 32, mode: 'pixel', bg: WHITE, ...o });

describe('findItems', () => {
  const clean = removeBackground(sheet.img, WHITE, 'pixel');

  it('finds every separate item, in reading order', () => {
    const regions = findItems(clean);
    expect(regions).toHaveLength(N);
    regions.forEach((r, i) => {
      const want = sheet.rects[i];
      expect(Math.abs(r.rect.x - want.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(r.rect.y - want.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(r.rect.w - want.w)).toBeLessThanOrEqual(1);
      expect(Math.abs(r.rect.h - want.h)).toBeLessThanOrEqual(1);
    });
  });

  it('ignores specks and keeps a piece inside another one with it', () => {
    const img = createImage(200, 100);
    // Ring (opaque square with a transparent hole) with a separate gem inside, plus a 2 px speck far away.
    for (let y = 10; y < 70; y++) for (let x = 10; x < 70; x++) if (x < 20 || x >= 60 || y < 20 || y >= 60) img.data.set([200, 50, 50, 255], (y * 200 + x) * 4);
    for (let y = 30; y < 50; y++) for (let x = 30; x < 50; x++) img.data.set([50, 50, 200, 255], (y * 200 + x) * 4);
    for (let x = 150; x < 152; x++) img.data.set([0, 0, 0, 255], (90 * 200 + x) * 4);
    for (let y = 10; y < 60; y++) for (let x = 110; x < 160; x++) img.data.set([50, 200, 50, 255], (y * 200 + x) * 4);
    const regions = findItems(img);
    expect(regions.map((r) => r.rect)).toEqual([{ x: 10, y: 10, w: 60, h: 60 }, { x: 110, y: 10, w: 50, h: 50 }]);
  });
});

describe('normalizeItems (pixel)', () => {
  it('puts every item in its own exact cell, centred, inside the margin, at native size when it fits', () => {
    const r = run({ cellSize: 32, margin: 1 });
    expect(r.items).toHaveLength(N);
    expect(r.cols).toBe(3);
    expect(r.rows).toBe(3);
    expect(r.atlas.width).toBe(96);
    expect(r.atlas.height).toBe(96);
    r.items.forEach((it, i) => {
      expect(it.rect).toEqual({ x: (i % 3) * 32, y: Math.floor(i / 3) * 32, w: 32, h: 32 });
      const c = it.content;
      expect(c.x).toBeGreaterThanOrEqual(it.rect.x + 1);
      expect(c.y).toBeGreaterThanOrEqual(it.rect.y + 1);
      expect(c.x + c.w).toBeLessThanOrEqual(it.rect.x + 31);
      expect(c.y + c.h).toBeLessThanOrEqual(it.rect.y + 31);
      // Native art size (no resampling when everything fits), centred within a pixel.
      expect(c.w).toBe(ITEM_ART[i].w);
      expect(c.h).toBe(ITEM_ART[i].h);
      expect(Math.abs(c.x - it.rect.x - (32 - c.w) / 2)).toBeLessThanOrEqual(0.5);
      // Pixels exist only inside the content box.
      const cell = crop(r.atlas, it.rect);
      let outside = 0;
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        const inside = x >= c.x - it.rect.x && x < c.x - it.rect.x + c.w && y >= c.y - it.rect.y && y < c.y - it.rect.y + c.h;
        if (!inside && cell.data[(y * 32 + x) * 4 + 3] > 0) outside++;
      }
      expect(outside).toBe(0);
    });
    expect(r.warnings).toEqual([]);
  });

  it('keeps ONE scale for all when it has to shrink: the largest fills the cell, relative sizes hold', () => {
    const r = run({ cellSize: 16, margin: 1 });
    const size = 14;
    const sizes = r.items.map((it) => it.content);
    expect(Math.max(...sizes.map(longest))).toBeLessThanOrEqual(size);
    expect(Math.max(...sizes.map(longest))).toBeGreaterThanOrEqual(size - 1);
    const sword = sizes[idx('sword')], coin = sizes[idx('coin')];
    expect(sword.h).toBeGreaterThanOrEqual(size - 1);
    // The coin is 12 art px against 22 for the sword: same ratio after the single resample (±1 px).
    expect(Math.abs(coin.h / sword.h - 12 / 22)).toBeLessThan(0.12);
    r.items.forEach((it) => expect(it.content.x + it.content.w).toBeLessThanOrEqual(it.rect.x + 15));
  });

  it('never upscales pixel art and says so when nothing reaches the cell', () => {
    const r = run({ cellSize: 64 });
    expect(r.items[idx('sword')].content.h).toBe(22);
    expect(r.warnings.map((w) => w.key)).toContain('warn.itemsSmall');
  });

  it('leaves crossed-out items out, keeps detection numbers in the names and rescales the rest', () => {
    const full = run({ cellSize: 16 });
    const r = run({ cellSize: 16, exclude: [idx('sword')] });
    expect(r.items).toHaveLength(N - 1);
    expect(r.detected).toHaveLength(N);
    expect(r.detected[idx('sword')].excluded).toBe(true);
    expect(r.items.map((i) => i.name)).not.toContain(`item_0${idx('sword')}`);
    expect(r.items[idx('sword')].name).toBe(`item_0${idx('sword') + 1}`);
    // Without the sword the key (16 art px wide) is the largest: bigger than before at the same cell size.
    const keyBefore = full.items[idx('key')].content, keyAfter = r.items[idx('key')].content;
    expect(longest(keyAfter)).toBeGreaterThan(longest(keyBefore) - 1);
    expect(longest(keyAfter)).toBeGreaterThanOrEqual(13);
  });

  it('can lay the atlas out with a given number of columns', () => {
    const r = run({ cols: 4 });
    expect([r.cols, r.rows]).toEqual([4, 2]);
    expect(r.atlas.width).toBe(128);
    expect(r.items[5].col).toBe(1);
    expect(r.items[5].row).toBe(1);
  });

  it('finds the items inside a given grid too', () => {
    const r = run({ grid: { cols: 3, rows: 3 } });
    expect(r.detected).toHaveLength(N);
    expect(r.items.map((i) => i.content.w)).toEqual(ITEM_ART.map((a) => a.w));
  });

  it('snaps every pixel to a fixed palette', () => {
    const palette: RGBA8[] = [[0, 0, 0, 255], [255, 255, 255, 255], [220, 50, 60, 255], [250, 200, 40, 255]];
    const r = run({ palette });
    const ok = new Set(palette.map((c) => c.join(',')));
    for (let i = 0; i < r.atlas.data.length; i += 4) {
      if (r.atlas.data[i + 3] === 0) continue;
      expect(ok.has(`${r.atlas.data[i]},${r.atlas.data[i + 1]},${r.atlas.data[i + 2]},${r.atlas.data[i + 3]}`)).toBe(true);
    }
  });

  it('reports an empty sheet', () => {
    const r = run({ exclude: Array.from({ length: N }, (_, i) => i) });
    expect(r.items).toHaveLength(0);
    expect(r.warnings.map((w) => w.key)).toEqual(['warn.noItems']);
    expect(normalizeItems(core, createImage(50, 50, [255, 255, 255, 255]), { cellSize: 16, mode: 'pixel', bg: WHITE }).items).toHaveLength(0);
  });
});

describe('normalizeItems (cartoon)', () => {
  it('"each fills its cell" scales every item to the same longest side, aspect kept', () => {
    const r = normalizeItems(null, sheet.img, { cellSize: 32, mode: 'cartoon', bg: WHITE, fill: 'each', margin: 2 });
    expect(r.items).toHaveLength(N);
    r.items.forEach((it, i) => {
      expect(longest(it.content)).toBe(28);
      const a = ITEM_ART[i];
      expect(Math.abs(it.content.w / it.content.h - a.w / a.h)).toBeLessThan(0.12);
    });
  });

  it('common scale: relative sizes stay, the largest fills the cell, nothing is clipped', () => {
    const r = normalizeItems(null, sheet.img, { cellSize: 32, mode: 'cartoon', bg: WHITE });
    const sizes = r.items.map((i) => i.content);
    expect(Math.max(...sizes.map(longest))).toBe(30);
    expect(longest(sizes[idx('sword')])).toBe(30);
    expect(Math.abs(sizes[idx('coin')].h / sizes[idx('sword')].h - 12 / 22)).toBeLessThan(0.06);
    r.items.forEach((it) => {
      expect(it.content.x).toBeGreaterThanOrEqual(it.rect.x + 1);
      expect(it.content.x + it.content.w).toBeLessThanOrEqual(it.rect.x + 31);
    });
  });
});

describe('items export', () => {
  const r = run({ cellSize: 32 });

  it('names are slugged and unique; blanks keep the default', () => {
    const names = itemNames(r, ['Poción roja', 'coin', 'coin', '', undefined, 'COIN']);
    expect(names.slice(0, 6)).toEqual(['pocion_roja', 'coin', 'coin_2', 'item_03', 'item_04', 'coin_3']);
    expect(new Set(names).size).toBe(names.length);
  });

  it('Godot: atlas + one AtlasTexture .tres per item, relative path, no uid', () => {
    const files = itemsExport(r, 'Icons', ['coin'], ['godot']);
    expect(text(files, 'icons/coin.tres')).toBe(
      '[gd_resource type="AtlasTexture" load_steps=2 format=3]\n\n' +
        '[ext_resource type="Texture2D" path="icons.png" id="1_tex"]\n\n' +
        '[resource]\natlas = ExtResource("1_tex")\nregion = Rect2(0, 0, 32, 32)\nfilter_clip = true\n',
    );
    expect(text(files, 'icons/item_05.tres')).toContain('region = Rect2(64, 32, 32, 32)');
    expect(files.filter((f) => f.path.endsWith('.tres'))).toHaveLength(N);
    expect(files.some((f) => /uid/.test(typeof f.data === 'string' ? f.data : ''))).toBe(false);
    const png = decodePng(files.find((f) => f.path === 'icons/icons.png')!.data as Uint8Array);
    expect([png.width, png.height]).toEqual([96, 96]);
  });

  it('GDevelop: one PNG per item with names unique across sets', () => {
    const a = itemsExport(r, 'icons', [], ['gdevelop']).filter((f) => f.path.endsWith('.png')).map((f) => f.path);
    const b = itemsExport(r, 'loot', [], ['gdevelop']).filter((f) => f.path.endsWith('.png')).map((f) => f.path);
    expect(a).toHaveLength(N);
    expect(a[0]).toBe('icons/icons_item_00.png');
    const leaf = [...a, ...b].map((p) => p.split('/').pop());
    expect(new Set(leaf).size).toBe(2 * N);
    const one = decodePng(itemsExport(r, 'icons', [], ['gdevelop']).find((f) => f.path === a[3])!.data as Uint8Array);
    expect([one.width, one.height]).toEqual([32, 32]);
  });

  it('Kaplay: loadSpriteAtlas with every rect', () => {
    const js = text(itemsExport(r, 'icons', ['coin', 'my gem'], ['kaplay']), 'icons.js');
    expect(js).toContain('loadSpriteAtlas("icons.png", {');
    expect(js).toContain('  coin: { x: 0, y: 0, width: 32, height: 32 },');
    expect(js).toContain('  my_gem: { x: 32, y: 0, width: 32, height: 32 },');
    expect(js).toContain('crisp: true');
  });

  it('generic: JSON name → rect plus the individual PNGs; several targets get folders', () => {
    const files = itemsExport(r, 'icons', ['coin'], ['generic', 'kaplay']);
    const json = JSON.parse(text(files, 'generic/icons.json'));
    expect(json.cell).toBe(32);
    expect(json.items.coin).toEqual({ x: 0, y: 0, w: 32, h: 32 });
    expect(Object.keys(json.items)).toHaveLength(N);
    expect(files.some((f) => f.path === 'generic/items/icons/icons_coin.png')).toBe(true);
    expect(files.some((f) => f.path === 'kaplay/icons.png')).toBe(true);
  });
});
