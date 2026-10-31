import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { encode } from 'fast-png';
import {
  buildExport, decodePng, encodePng, genericExport, gdevelopFrames, godotSpriteFrames, kaplaySnippet, slug, zipFiles,
} from '../src/core/export/index.ts';
import type { ExportFile, RGBAImage, SpriteResult } from '../src/core/types.ts';

function makeResult(name: string, mode: 'pixel' | 'cartoon' = 'pixel', padBottom = 2): SpriteResult {
  const cell = { w: 64, h: 96 };
  const specs = [
    { name: 'idle', count: 4, fps: 6, loop: true },
    { name: 'attack', count: 3, fps: 12, loop: false },
  ];
  const cols = 4;
  const rows = specs.length;
  const width = cols * cell.w;
  const height = rows * cell.h;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set([(i * 7) % 256, (i * 13) % 256, (i * 29) % 256, i % 5 === 0 ? 0 : 255], i * 4);
  return {
    name,
    sheet: {
      image: { width, height, data }, cell, cols, rows, padBottom, mode,
      anims: specs.map((s, row) => ({ ...s, row })),
    },
    frames: [],
    diag: { scale: 1, refHeight: 90, metrics: [], regions: [], warnings: [] },
  };
}

const text = (files: ExportFile[], path: string): string => {
  const f = files.find((x) => x.path === path);
  if (!f) throw new Error(`missing ${path}: ${files.map((x) => x.path).join(', ')}`);
  return typeof f.data === 'string' ? f.data : strFromU8(f.data);
};

describe('png', () => {
  it('round-trips RGBA exactly', () => {
    const img: RGBAImage = { width: 3, height: 2, data: new Uint8ClampedArray([
      255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0,
      1, 2, 3, 4, 250, 251, 252, 253, 9, 9, 9, 255,
    ]) };
    const back = decodePng(encodePng(img));
    expect(back.width).toBe(3);
    expect(back.height).toBe(2);
    expect(Array.from(back.data)).toEqual(Array.from(img.data));
  });
});

describe('png decode of other colour types', () => {
  it('expands grey, grey+alpha, RGB and indexed to RGBA8', () => {
    expect(Array.from(decodePng(encode({ width: 2, height: 1, data: new Uint8Array([10, 200]), channels: 1 })).data))
      .toEqual([10, 10, 10, 255, 200, 200, 200, 255]);
    expect(Array.from(decodePng(encode({ width: 1, height: 1, data: new Uint8Array([50, 99]), channels: 2 })).data))
      .toEqual([50, 50, 50, 99]);
    expect(Array.from(decodePng(encode({ width: 1, height: 1, data: new Uint8Array([1, 2, 3]), channels: 3 })).data))
      .toEqual([1, 2, 3, 255]);
    const indexed = encode({
      width: 2, height: 1, data: new Uint8Array([0b00010000]), channels: 1, depth: 2,
      palette: [[255, 0, 0], [0, 0, 255]],
    });
    expect(Array.from(decodePng(indexed).data)).toEqual([255, 0, 0, 255, 0, 0, 255, 255]);
    const g16 = encode({ width: 1, height: 1, data: new Uint16Array([65535]), channels: 1, depth: 16 });
    expect(Array.from(decodePng(g16).data)).toEqual([255, 255, 255, 255]);
  });
});

describe('slug', () => {
  it('produces safe ascii names', () => {
    expect(slug('Héroe Ñandú!')).toBe('heroe_nandu');
    expect(slug('  My/Hero..png ')).toBe('my_hero_png');
    expect(slug('ok-name_1')).toBe('ok-name_1');
    expect(slug('???')).toBe('sprite');
  });
});

describe('godot', () => {
  const r = makeResult('Héroe');
  const files = godotSpriteFrames(r);

  it('writes png, tres, tscn and README under <name>/', () => {
    expect(files.map((f) => f.path).sort()).toEqual(['heroe/README.txt', 'heroe/heroe.png', 'heroe/heroe.tres', 'heroe/heroe.tscn']);
    expect(text(files, 'heroe/README.txt')).toContain('[ES]');
  });

  it('tres has one AtlasTexture per frame with the right regions and no uid', () => {
    const tres = text(files, 'heroe/heroe.tres');
    expect(tres.match(/\[sub_resource type="AtlasTexture"/g)).toHaveLength(7);
    expect(tres).toContain('region = Rect2(192, 0, 64, 96)');
    expect(tres).toContain('region = Rect2(128, 96, 64, 96)');
    expect(tres).toContain('[ext_resource type="Texture2D" path="heroe.png" id="1_tex"]');
    expect(tres).toContain('load_steps=9');
    expect(tres).toContain('"name": &"attack"');
    expect(tres).toContain('"speed": 12.0');
    expect(tres).toContain('"loop": false');
    expect(tres).not.toContain('uid=');
  });

  it('tscn puts the origin at the feet; texture_filter only in pixel mode', () => {
    const tscn = text(files, 'heroe/heroe.tscn');
    expect(tscn).toContain('offset = Vector2(-32, -93)');
    expect(tscn).toContain('texture_filter = 1');
    expect(tscn).toContain('autoplay = "idle"');
    expect(tscn).toContain('[node name="Heroe" type="AnimatedSprite2D"]');
    const cartoon = text(godotSpriteFrames(makeResult('x', 'cartoon', 0)), 'x/x.tscn');
    expect(cartoon).not.toContain('texture_filter');
    expect(cartoon).toContain('offset = Vector2(-32, -95)');
  });
});

describe('gdevelop', () => {
  it('writes <name>/<anim>/<anim>_NN.png + README', () => {
    const r = makeResult('hero');
    const files = gdevelopFrames(r);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('hero/idle/idle_00.png');
    expect(paths).toContain('hero/idle/idle_03.png');
    expect(paths).toContain('hero/attack/attack_02.png');
    // 4 + 3 frames, one Piskel strip per animation, README.
    expect(paths).toHaveLength(4 + 3 + 2 + 1);
    expect(paths).toContain('hero/spritesheets/idle.png');
    const strip = decodePng(files.find((f) => f.path === 'hero/spritesheets/idle.png')!.data as Uint8Array);
    expect(strip.height).toBe(r.sheet.cell.h);
    expect(strip.width).toBe(r.sheet.cell.w * 4);
    const readme = text(files, 'hero/README.txt');
    expect(readme).toContain('[EN]');
    expect(readme).toContain('[ES]');
    expect(readme).toContain('(32, 93)');
    const frame = decodePng(files.find((f) => f.path === 'hero/idle/idle_01.png')!.data as Uint8Array);
    expect([frame.width, frame.height]).toEqual([64, 96]);
  });
});

describe('kaplay', () => {
  it('emits loadSprite with slices and per-row anim ranges', () => {
    const files = kaplaySnippet(makeResult('hero'));
    expect(files.map((f) => f.path).sort()).toEqual(['hero.js', 'hero.png']);
    const js = text(files, 'hero.js');
    expect(js).toContain('sliceX: 4');
    expect(js).toContain('sliceY: 2');
    expect(js).toContain('idle: { from: 0, to: 3, loop: true, speed: 6.0 }');
    expect(js).toContain('attack: { from: 4, to: 6, loop: false, speed: 12.0 }');
    expect(js).toContain('texFilter: "nearest"');
    expect(js).toContain('anchor("bot")');
    expect(js).toContain('y + 2');
  });
});

describe('generic (Aseprite hash)', () => {
  const r = makeResult('hero');
  const files = genericExport(r);
  const json = JSON.parse(text(files, 'hero.json'));

  it('has frames and coherent frameTags', () => {
    expect(Object.keys(json.frames)).toHaveLength(7);
    expect(json.frames['hero 0.png']).toMatchObject({
      frame: { x: 0, y: 0, w: 64, h: 96 }, rotated: false, trimmed: false, duration: 167,
    });
    expect(json.frames['hero 4.png'].frame).toEqual({ x: 0, y: 96, w: 64, h: 96 });
    expect(json.frames['hero 4.png'].duration).toBe(83);
    expect(json.meta).toMatchObject({ app: 'align-sprites', image: 'hero.png', format: 'RGBA8888', size: { w: 256, h: 192 }, scale: '1' });
    expect(json.meta.frameTags).toEqual([
      { name: 'idle', from: 0, to: 3, direction: 'forward' },
      { name: 'attack', from: 4, to: 6, direction: 'forward' },
    ]);
  });

  it('adds one PNG per frame under frames/', () => {
    expect(files.filter((f) => f.path.startsWith('frames/hero/'))).toHaveLength(7);
    expect(files.some((f) => f.path === 'frames/hero/attack_02.png')).toBe(true);
  });
});

describe('buildExport + zip', () => {
  const results = [makeResult('Héroe'), makeResult('heroe', 'cartoon', 0)];
  const files = buildExport(results, ['godot', 'gdevelop', 'kaplay', 'generic']);

  it('prefixes every file with its target and dedupes colliding names', () => {
    expect(files.every((f) => /^(godot|gdevelop|kaplay|generic)\//.test(f.path))).toBe(true);
    const paths = files.map((f) => f.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toContain('godot/heroe/heroe.tres');
    expect(paths).toContain('godot/heroe_2/heroe_2.tres');
    expect(paths).toContain('kaplay/heroe_2.js');
  });

  it('zips and unzips with the expected paths and bytes', () => {
    const zip = zipFiles(files);
    const out = unzipSync(zip);
    expect(Object.keys(out).sort()).toEqual(files.map((f) => f.path).sort());
    expect(strFromU8(out['kaplay/heroe.js']!)).toContain('loadSprite("heroe"');
    const png = decodePng(out['generic/heroe.png']!);
    expect([png.width, png.height]).toEqual([256, 192]);
    expect(Array.from(png.data)).toEqual(Array.from(results[0]!.sheet.image.data));
  });
});

describe('static sprites (one animation, one frame)', () => {
  const cell = { w: 48, h: 64 };
  const img = { width: 48, height: 64, data: new Uint8ClampedArray(48 * 64 * 4).fill(255) };
  const stat = (mode: 'pixel' | 'cartoon'): SpriteResult => ({
    name: 'Roca Grande',
    sheet: { image: img, cell, cols: 1, rows: 1, padBottom: 2, mode, anims: [{ name: 'default', row: 0, count: 1, fps: 8, loop: true }] },
    frames: [],
    diag: { scale: 1, refHeight: 60, metrics: [], regions: [], warnings: [] },
  });

  it('godot: png + Sprite2D tscn at the feet, no SpriteFrames', () => {
    const files = godotSpriteFrames(stat('pixel'));
    expect(files.map((f) => f.path).sort()).toEqual(['roca_grande/README.txt', 'roca_grande/roca_grande.png', 'roca_grande/roca_grande.tscn']);
    const tscn = text(files, 'roca_grande/roca_grande.tscn');
    expect(tscn).toContain('type="Sprite2D"');
    expect(tscn).toContain('[node name="RocaGrande" type="Sprite2D"]');
    expect(tscn).toContain('texture = ExtResource("1")');
    expect(tscn).toContain('centered = false');
    expect(tscn).toContain('offset = Vector2(-24, -61)');
    expect(tscn).toContain('texture_filter = 1');
    expect(tscn).not.toContain('AnimatedSprite2D');
    expect(text(godotSpriteFrames(stat('cartoon')), 'roca_grande/roca_grande.tscn')).not.toContain('texture_filter');
  });

  it('gdevelop: one png and a README with the origin, no animation folders or strips', () => {
    const files = gdevelopFrames(stat('pixel'));
    expect(files.map((f) => f.path).sort()).toEqual(['roca_grande/README.txt', 'roca_grande/roca_grande.png']);
    expect(text(files, 'roca_grande/README.txt')).toContain('Origin point: (24, 61)');
  });

  it('kaplay: loadSprite without slice or anims', () => {
    const js = text(kaplaySnippet(stat('pixel')), 'roca_grande.js');
    expect(js).toContain('loadSprite("roca_grande", "roca_grande.png");');
    expect(js).not.toContain('sliceX');
    expect(js).not.toContain('anims');
    expect(js).toContain('pos(x, y + 2)');
  });

  it('generic still exports png + json', () => {
    expect(genericExport(stat('pixel')).map((f) => f.path)).toContain('roca_grande.json');
  });

  it('a multi-animation sheet is not static even with one frame per animation', () => {
    const r = makeResult('x');
    r.sheet.anims = [{ name: 'a', row: 0, count: 1, fps: 1, loop: true }, { name: 'b', row: 1, count: 1, fps: 1, loop: true }];
    expect(godotSpriteFrames(r).some((f) => f.path.endsWith('.tres'))).toBe(true);
  });
});
