// Sprite roles: centre-anchored effects, automatic collision boxes (and their exports), one animation per row.
import { describe, expect, it } from 'vitest';
import { strFromU8 } from 'fflate';
import { alphaBBox, createImage } from '../src/core/image.ts';
import { collisionBox } from '../src/core/measure/collision.ts';
import { measureFrame, referenceHeight } from '../src/core/measure/index.ts';
import { packFrames, placementMetrics, suggestCell } from '../src/core/pack/index.ts';
import { runBatch, runSpriteJob } from '../src/core/pipeline/index.ts';
import { gdevelopFrames, genericExport, godotSpriteFrames, kaplaySnippet } from '../src/core/export/index.ts';
import type { ExportFile, RGBA8, RGBAImage, SpriteJob, SpriteResult } from '../src/core/types.ts';
import { rowAnimations } from '../src/ui/lib/frameOps.ts';
import { makeCharacterFrames, makeSheet, MAGENTA } from './fixtures/synth.ts';
import { loadUnfake } from './helpers.ts';

const text = (files: ExportFile[], path: string): string => {
  const f = files.find((x) => x.path === path);
  if (!f) throw new Error(`missing ${path}: ${files.map((x) => x.path).join(', ')}`);
  return typeof f.data === 'string' ? f.data : strFromU8(f.data);
};

const RED: RGBA8 = [220, 40, 40, 255];

/** A frame image with a filled rect (x, y, w, h) in a W×H transparent canvas. */
function rectFrame(W: number, H: number, rects: [number, number, number, number][]): RGBAImage {
  const img = createImage(W, H);
  for (const [x, y, w, h] of rects)
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) img.data.set(RED, (yy * W + xx) * 4);
  return img;
}

describe('centre anchor: pack', () => {
  // Three "explosion" frames of growing size at different spots of their images.
  const frames = [rectFrame(40, 40, [[3, 5, 10, 10]]), rectFrame(60, 60, [[20, 30, 21, 17]]), rectFrame(80, 80, [[1, 2, 50, 60]])];
  const metrics = frames.map((f) => measureFrame(f));
  const anims = [{ name: 'boom', frames: [0, 1, 2], fps: 12, loop: false }];

  it('centres the bbox of every frame on the cell centre and ignores padBottom', () => {
    const p = placementMetrics(frames, metrics, anims, undefined, 'center');
    const cell = suggestCell(p.frames, p.metrics, 0, 32, 'center');
    expect(cell).toEqual({ w: 64, h: 64 });
    const { sheet, cells, warnings } = packFrames(frames, metrics, { ...cell, padBottom: 9 }, anims, 'pixel', { anchor: 'center' });
    expect(warnings).toEqual([]);
    expect(sheet.anchor).toBe('center');
    expect(sheet.padBottom).toBe(0);
    for (const c of cells) {
      const bb = alphaBBox(c, 128)!;
      // Continuous centre of the bbox vs the centre of the cell: at most half a pixel (odd sizes).
      expect(Math.abs(bb.x + bb.w / 2 - cell.w / 2)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(bb.y + bb.h / 2 - cell.h / 2)).toBeLessThanOrEqual(0.5);
    }
  });

  it('keeps the feet layout (and no anchor field) by default', () => {
    const { sheet } = packFrames(frames, metrics, { w: 96, h: 96, padBottom: 4 }, anims, 'pixel');
    expect(sheet.anchor).toBeUndefined();
    expect(sheet.padBottom).toBe(4);
  });

  it('mirroring and nudging keep the cell sized for the placements', () => {
    const offsets = { 2: { dx: 6, dy: -4 } };
    const flipped = [{ ...anims[0]!, flipX: true }];
    const p = placementMetrics(frames, metrics, flipped, offsets, 'center');
    const cell = suggestCell(p.frames, p.metrics, 0, 32, 'center');
    const { warnings } = packFrames(frames, metrics, { ...cell, padBottom: 0 }, flipped, 'pixel', { anchor: 'center', offsets });
    expect(warnings).toEqual([]);
  });
});

describe('referenceHeight "largest"', () => {
  it('is the biggest side of the biggest frame (a beam counts by its length)', () => {
    const ms = [rectFrame(60, 60, [[0, 0, 40, 6]]), rectFrame(60, 60, [[0, 0, 10, 12]])].map((f) => measureFrame(f));
    expect(referenceHeight(ms, 'largest')).toBe(40);
    expect(referenceHeight(ms, 'median')).toBe(9);
  });
});

describe('centre anchor: pipeline', () => {
  /** Growing discs (radius 10, 20, 30) on magenta, cartoon mode so no pixel grid is needed. */
  function discs(): RGBAImage {
    const img = createImage(3 * 100, 100, MAGENTA);
    [10, 20, 30].forEach((r, i) => {
      for (let y = 0; y < 100; y++)
        for (let x = 0; x < 100; x++) if (Math.hypot(x - 50, y - 50) < r) img.data.set([255, 200, 40, 255], (y * img.width + i * 100 + x) * 4);
    });
    return img;
  }
  const job = (over: Partial<SpriteJob> = {}): SpriteJob => ({
    name: 'boom', source: discs(), mode: 'cartoon', bg: { color: MAGENTA, tolerance: 18, strategy: 'global' },
    segmentation: { kind: 'auto' }, animations: [], cell: 'auto', scale: { kind: 'native' }, anchor: 'center', ...over,
  });

  it('sizes the effect by its largest frame, centres every frame and boxes it around the centre', () => {
    const r = runSpriteJob(null, job({ scale: { kind: 'targetHeight', px: 40 } }));
    expect(r.diag.refHeight).toBeGreaterThanOrEqual(39);
    expect(r.diag.refHeight).toBeLessThanOrEqual(41);
    expect(r.sheet.anchor).toBe('center');
    expect(r.sheet.cell).toEqual({ w: 64, h: 64 });
    for (const c of r.frames) {
      const bb = alphaBBox(c, 128)!;
      expect(Math.abs(bb.x + bb.w / 2 - 32)).toBeLessThanOrEqual(1);
      expect(Math.abs(bb.y + bb.h / 2 - 32)).toBeLessThanOrEqual(1);
    }
    const box = r.sheet.collision!;
    expect(box.x + box.w / 2).toBeCloseTo(32, 5);
    expect(box.y + box.h / 2).toBeCloseTo(32, 5);
    // Median frame (radius 20 ≈ 27 px after scaling) shrunk to 90 %.
    expect(box.w).toBeGreaterThan(18);
    expect(box.w).toBeLessThan(28);
  });

  it('feet jobs of the same image keep the old median reference', () => {
    const r = runSpriteJob(null, job({ anchor: undefined, scale: { kind: 'targetHeight', px: 40 } }));
    expect(r.sheet.anchor).toBeUndefined();
    expect(r.diag.refHeight).toBeGreaterThanOrEqual(39);
    expect(r.diag.refHeight).toBeLessThanOrEqual(41);
    // Median frame is 40 px here, so the biggest one (60 px source) ends up larger than with 'largest'.
    const big = alphaBBox(r.frames[2]!, 128)!;
    expect(big.h).toBeGreaterThan(50);
  });

  it('a batch shares one cell between a feet character and a centred effect', () => {
    const rs = runBatch(null, [job(), job({ name: 'hero', anchor: undefined })]);
    expect(rs[0]!.sheet.cell).toEqual(rs[1]!.sheet.cell);
    expect(rs[0]!.sheet.anchor).toBe('center');
    expect(rs[1]!.sheet.anchor).toBeUndefined();
  });
});

describe('collision box: feet', () => {
  const cell = { w: 64, h: 64 };
  it('is the body: sits on the feet line, reference height tall, ignores a held-out sword and a cape tip', () => {
    // Body 10 px wide (x 27-36), y 20-59; a thin sword to the right (y 30, x 37-56) and a 1-px cape tip on the left.
    const f = rectFrame(64, 64, [[27, 20, 10, 40], [37, 30, 20, 1], [10, 40, 17, 1]]);
    const box = collisionBox([f, f], 'feet', cell, 4, 40)!;
    // Feet row is cell.h - 1 - padBottom = 59: the bottom edge of the box is 60.
    expect(box.y + box.h).toBe(60);
    expect(box.h).toBe(40);
    expect(box.x).toBeGreaterThanOrEqual(27);
    expect(box.x + box.w).toBeLessThanOrEqual(37);
    expect(box.w).toBeGreaterThanOrEqual(8);
  });

  it('survives a run frame with the legs apart (median over frames)', () => {
    const idle = rectFrame(64, 64, [[26, 20, 12, 40]]);
    const run = rectFrame(64, 64, [[28, 20, 8, 25], [22, 45, 8, 15], [34, 45, 8, 15]]);
    const box = collisionBox([idle, run, idle], 'feet', cell, 0, 40)!;
    expect(box.x).toBeGreaterThanOrEqual(22);
    expect(box.x + box.w).toBeLessThanOrEqual(42);
  });

  it('returns nothing for empty frames', () => {
    expect(collisionBox([createImage(64, 64)], 'feet', cell, 0, 40)).toBeUndefined();
    expect(collisionBox([createImage(64, 64)], 'center', cell, 0, 40)).toBeUndefined();
  });

  it('the pipeline attaches it to the sheet, bottom on the feet', () => {
    const sheet = makeSheet(makeCharacterFrames(), { scale: 8 });
    const r = runSpriteJob(loadUnfake(), {
      name: 'hero', source: sheet.image, mode: 'pixel', bg: { color: MAGENTA, tolerance: 18, strategy: 'global' },
      segmentation: { kind: 'auto' }, animations: [], cell: { w: 64, h: 64, padBottom: 2 }, scale: { kind: 'native' },
    });
    const box = r.sheet.collision!;
    expect(box.y + box.h).toBe(64 - 2);
    expect(box.h).toBe(Math.round(r.diag.refHeight));
    const bb = alphaBBox(r.frames[0]!, 128)!;
    expect(box.x).toBeGreaterThanOrEqual(bb.x);
    expect(box.x + box.w).toBeLessThanOrEqual(bb.x + bb.w);
  });
});

/** A packed result with a known collision box for the exporters. */
function result(anchor: 'feet' | 'center' | undefined, count = 3, collision = anchor === 'center' ? { x: 12, y: 14, w: 40, h: 36 } : { x: 20, y: 16, w: 24, h: 44 }): SpriteResult {
  const cell = { w: 64, h: 64 };
  const image = createImage(cell.w * count, cell.h, [10, 200, 90, 255]);
  return {
    name: 'Boom',
    sheet: {
      image, cell, cols: count, rows: 1, padBottom: anchor === 'center' ? 0 : 2, mode: 'pixel',
      anims: [{ name: 'idle', row: 0, count, fps: 8, loop: true }], ...(anchor ? { anchor } : {}), collision,
    },
    frames: [], diag: { scale: 1, refHeight: 44, metrics: [], regions: [], warnings: [] },
  };
}

describe('exports: feet sprite with a collision box', () => {
  const r = result('feet');
  it('godot: <name>_body.tscn has a CharacterBody2D, the sprite and the rectangle relative to the feet origin', () => {
    const files = godotSpriteFrames(r);
    expect(files.map((f) => f.path).sort()).toEqual(['boom/README.txt', 'boom/boom.png', 'boom/boom.tres', 'boom/boom.tscn', 'boom/boom_body.tscn']);
    const body = text(files, 'boom/boom_body.tscn');
    expect(body).toContain('type="CharacterBody2D"');
    expect(body).toContain('[ext_resource type="SpriteFrames" path="boom.tres" id="1"]');
    expect(body).toContain('size = Vector2(24.0, 44.0)');
    // Feet origin = (32, 61). Box centre (32, 38) in the cell -> (0, -23) from the origin.
    expect(body).toContain('position = Vector2(0.0, -23.0)');
    expect(body).toContain('offset = Vector2(-32, -61)');
    expect(body).toContain('parent="."');
    expect(text(files, 'boom/README.txt')).toContain('boom_body.tscn');
    // The plain scene stays as it was.
    expect(text(files, 'boom/boom.tscn')).toContain('type="AnimatedSprite2D"');
  });

  it('godot: a static sprite gets a Sprite2D body', () => {
    const one = result('feet', 1);
    const body = text(godotSpriteFrames(one), 'boom/boom_body.tscn');
    expect(body).toContain('[node name="Sprite2D" type="Sprite2D" parent="."]');
    expect(body).toContain('texture = ExtResource("1")');
  });

  it('gdevelop: README lists the 4 polygon points in image px and how to set them', () => {
    const readme = text(gdevelopFrames(r), 'boom/README.txt');
    expect(readme).toContain('(20, 16), (44, 16), (44, 60), (20, 60)');
    expect(readme).toContain('collision mask');
    expect(readme).toContain('Máscara de colisión');
    expect(readme).toContain('Origin point: (32, 61) (feet)');
  });

  it('kaplay: area() with a Rect offset from the bottom-centre anchor', () => {
    const js = text(kaplaySnippet(r), 'boom.js');
    // Box bottom-centre (32, 60) vs cell bottom-centre (32, 64).
    expect(js).toContain('area({ shape: new Rect(vec2(0, -4), 24, 44) }),');
    expect(js).toContain('anchor("bot")');
  });

  it('generic: meta has anchor, origin and collision', () => {
    const meta = JSON.parse(text(genericExport(r), 'boom.json')).meta;
    expect(meta.anchor).toBe('feet');
    expect(meta.origin).toEqual({ x: 32, y: 61 });
    expect(meta.collision).toEqual({ x: 20, y: 16, w: 24, h: 44 });
  });

  it('no collision box, no body scene and no area()', () => {
    const none = { ...r, sheet: { ...r.sheet, collision: undefined } };
    expect(godotSpriteFrames(none).some((f) => f.path.endsWith('_body.tscn'))).toBe(false);
    expect(text(kaplaySnippet(none), 'boom.js')).not.toContain('area(');
    expect(text(gdevelopFrames(none), 'boom/README.txt')).not.toContain('Collision mask');
  });
});

describe('exports: centred sprite', () => {
  const r = result('center');
  it('godot: centred AnimatedSprite2D without offset, shape at the origin', () => {
    const files = godotSpriteFrames(r);
    const scene = text(files, 'boom/boom.tscn');
    expect(scene).toContain('centered = true');
    expect(scene).not.toContain('offset');
    const body = text(files, 'boom/boom_body.tscn');
    expect(body).toContain('position = Vector2(0.0, 0.0)');
    expect(body).toContain('size = Vector2(40.0, 36.0)');
    expect(text(files, 'boom/README.txt')).toContain('centre of the frame');
  });

  it('gdevelop: origin at the centre', () => {
    expect(text(gdevelopFrames(r), 'boom/README.txt')).toContain('Origin point: (32, 32) (centre)');
  });

  it('kaplay: anchor("center") and a centred area', () => {
    const js = text(kaplaySnippet(r), 'boom.js');
    expect(js).toContain('anchor("center")');
    expect(js).toContain('pos(x, y)');
    expect(js).toContain('area({ shape: new Rect(vec2(0, 0), 40, 36) }),');
    expect(js).not.toContain('anchor("bot")');
  });

  it('generic: pivot at the centre', () => {
    const meta = JSON.parse(text(genericExport(r), 'boom.json')).meta;
    expect(meta.anchor).toBe('center');
    expect(meta.origin).toEqual({ x: 32, y: 32 });
  });
});

describe('rowAnimations (one animation per row)', () => {
  let n = 0;
  const id = () => `a${++n}`;
  // 4 rows of 3 frames: rows[i] is the row of detected frame i.
  const rows = (r: number, c: number) => Array.from({ length: r * c }, (_, i) => Math.floor(i / c));

  it('4 rows = top-down walk down, left, right, up', () => {
    const a = rowAnimations(rows(4, 3), 8, id)!;
    expect(a.map((x) => [x.name, x.frames, x.flipX])).toEqual([
      ['walk_down', '0-2', false], ['walk_left', '3-5', false], ['walk_right', '6-8', false], ['walk_up', '9-11', false],
    ]);
  });

  it('3 rows = down, side (right), up, plus walk_left as the mirrored side', () => {
    const a = rowAnimations(rows(3, 4), 10, id)!;
    expect(a.map((x) => [x.name, x.frames, x.flipX])).toEqual([
      ['walk_down', '0-3', false], ['walk_left', '4-7', true], ['walk_right', '4-7', false], ['walk_up', '8-11', false],
    ]);
    expect(a.every((x) => x.fps === 10 && x.loop)).toBe(true);
    expect(new Set(a.map((x) => x.id)).size).toBe(4);
  });

  it('any other count = anim_0…, one row = nothing to do', () => {
    expect(rowAnimations(rows(2, 5), 8, id)!.map((x) => x.name)).toEqual(['anim_0', 'anim_1']);
    expect(rowAnimations(rows(5, 2), 8, id)!.map((x) => x.name)).toEqual(['anim_0', 'anim_1', 'anim_2', 'anim_3', 'anim_4']);
    expect(rowAnimations(rows(1, 6), 8, id)).toBeNull();
    expect(rowAnimations([], 8, id)).toBeNull();
  });

  it('rows with different frame counts and a short last frame list', () => {
    const a = rowAnimations([0, 0, 0, 1, 1, 2], 8, id)!;
    expect(a.map((x) => x.frames)).toEqual(['0-2', '3,4', '3,4', '5']);
  });
});
