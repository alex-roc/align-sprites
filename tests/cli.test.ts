// The CLI end to end: runs cli/align-sprites.ts as a child process on the example images, into a temp dir.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { decodePng, encodePng } from '../src/core/export/index.ts';
import { makeCharacterFrames, makeSheet } from './fixtures/synth.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = join(root, 'cli/align-sprites.ts');
const ex = (f: string): string => join(root, 'public/examples', f);

function run(...args: string[]): { code: number; out: string; err: string } {
  const r = spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' });
  return { code: r.status ?? -1, out: r.stdout, err: r.stderr };
}

/** Every file under `dir`, relative, with '/' separators. */
function walk(dir: string, rel = ''): string[] {
  return readdirSync(join(dir, rel), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(dir, `${rel}${d.name}/`) : [`${rel}${d.name}`]));
}

let tmp: string;
beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'align-sprites-cli-'));
});
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe('cli: general', () => {
  it('prints the help and exits 0; with no command exits 2', () => {
    const h = run('--help');
    expect(h.code).toBe(0);
    expect(h.out).toContain('sprite <img...>');
    expect(run().code).toBe(2);
  });
  it('every command has --help', () => {
    for (const c of ['sprite', 'inspect', 'tiles', 'terrain', 'items', 'parallax', 'prompt']) {
      const r = run(c, '--help');
      expect(r.code, c).toBe(0);
      expect(r.out, c).toContain(`align-sprites ${c}`);
    }
  });
  it('wrong command line → 2, missing file → 1', () => {
    expect(run('nope').code).toBe(2);
    expect(run('sprite').code).toBe(2);
    expect(run('sprite', ex('hero-run.png'), '--bogus').code).toBe(2);
    expect(run('sprite', ex('hero-run.png'), '--mode', 'neon').code).toBe(2);
    const missing = run('inspect', join(tmp, 'missing.png'));
    expect(missing.code).toBe(1);
    expect(missing.err).toContain('file not found');
  });
});

describe('cli: inspect', () => {
  it('--json reports type, frames and background', () => {
    const r = run('inspect', ex('hero-run.png'), ex('hero.png'), '--json');
    expect(r.code).toBe(0);
    const [run6, single] = JSON.parse(r.out) as { kind: string; frames: number; sourceHeight: number; background: { strategy: string }; pixelPeriod: number | null }[];
    expect(run6).toMatchObject({ kind: 'sheet', frames: 6 });
    expect(run6.background.strategy).toBe('global');
    expect(run6.pixelPeriod).toBeGreaterThan(1);
    expect(single).toMatchObject({ kind: 'single', frames: 1 });
  });
});

describe('cli: sprite', () => {
  it('one shared height, all engines, into a directory', () => {
    const out = join(tmp, 'hero');
    const r = run('sprite', ex('hero-idle.png'), ex('hero-run.png'), '--height', '64', '--target', 'all', '--out', out);
    expect(r.code, r.err).toBe(0);
    expect(r.out).toContain('hero-idle (sheet): 4 frames');
    expect(r.out).toContain('hero-run (sheet): 6 frames');
    expect(r.out).toContain('The sprite is shrunk a lot'); // warn.* translated, not the raw key
    const files = walk(out);
    for (const f of ['godot/hero-run/hero-run.tres', 'gdevelop/hero-idle/hero-idle_00.png', 'kaplay/hero-run.js', 'generic/hero-idle.json']) expect(files).toContain(f);
    // Both characters share one cell and the same height.
    const a = decodePng(new Uint8Array(readFileSync(join(out, 'generic/hero-idle.png'))));
    const b = decodePng(new Uint8Array(readFileSync(join(out, 'generic/hero-run.png'))));
    expect(a.height).toBe(b.height);
  });

  it('--out file.zip writes one zip; --json prints a parseable summary', () => {
    const zip = join(tmp, 'run.zip');
    const r = run('sprite', ex('hero-run.png'), '--height', '48', '--target', 'kaplay', '--anims', 'run:0-5@12,half:0-2@6:noloop', '--out', zip, '--json');
    expect(r.code, r.err).toBe(0);
    const [s] = JSON.parse(r.out) as { name: string; frames: number; cell: { w: number; h: number }; animations: { name: string; fps: number; loop: boolean }[] }[];
    expect(s.name).toBe('hero-run');
    expect(s.frames).toBe(6);
    expect(s.animations).toEqual([
      { name: 'run', frames: 6, fps: 12, loop: true },
      { name: 'half', frames: 3, fps: 6, loop: false },
    ]);
    expect(Object.keys(unzipSync(new Uint8Array(readFileSync(zip)))).sort()).toEqual(['hero-run.js', 'hero-run.png']);
  });

  it('--rows-as-anims makes one animation per row; --grid forces a sheet', () => {
    const sheet = makeSheet(makeCharacterFrames(16, 24, 8), { cols: 4 }).image;
    const png = join(tmp, 'walk.png');
    writeFileSync(png, encodePng(sheet));
    const r = run('sprite', png, '--rows-as-anims', '--mode', 'pixel', '--target', 'generic', '--json', '--out', join(tmp, 'walk'));
    expect(r.code, r.err).toBe(0);
    const [s] = JSON.parse(r.out) as { animations: { name: string; frames: number }[] }[];
    expect(s.animations.map((a) => a.name)).toEqual(['anim_0', 'anim_1']);
    expect(s.animations.map((a) => a.frames)).toEqual([4, 4]);
    expect(existsSync(join(tmp, 'walk/walk.json'))).toBe(true);
  });

  it('a bad --anims is a usage error, a non-PNG a processing error', () => {
    expect(run('sprite', ex('hero-run.png'), '--anims', 'run:x-y').code).toBe(2);
    const jpg = join(tmp, 'x.png');
    writeFileSync(jpg, 'not a png');
    const r = run('sprite', jpg);
    expect(r.code).toBe(1);
    expect(r.err).toContain('only PNG');
  });
});

describe('cli: tiles, terrain, items, parallax', () => {
  it('tiles: atlas + Godot TileSet', () => {
    const out = join(tmp, 'tiles');
    const r = run('tiles', ex('tileset-andes.png'), '--tile', '32', '--format', 'godot', '--out', out);
    expect(r.code, r.err).toBe(0);
    expect(walk(out).sort()).toEqual(['tileset-andes/tileset-andes.png', 'tileset-andes/tileset-andes.tres']);
  });
  it('terrain: dual16 set with its .tres', () => {
    const out = join(tmp, 'terrain');
    const r = run('terrain', ex('grass.png'), ex('dirt.png'), '--layout', 'dual16', '--tile', '32', '--out', out);
    expect(r.code, r.err).toBe(0);
    expect(walk(out).sort()).toEqual(['grass-dirt/README.txt', 'grass-dirt/grass-dirt.png', 'grass-dirt/grass-dirt.tres']);
    const png = decodePng(new Uint8Array(readFileSync(join(out, 'grass-dirt/grass-dirt.png'))));
    expect([png.width, png.height]).toEqual([128, 128]);
  });
  it('items: one file per item with --names', () => {
    const out = join(tmp, 'items');
    const r = run('items', ex('items.png'), '--size', '32', '--target', 'godot', '--names', 'coin,potion', '--out', out, '--json');
    expect(r.code, r.err).toBe(0);
    expect(JSON.parse(r.out).items).toBeGreaterThan(1);
    expect(walk(out)).toContain('items/coin.tres');
  });
  it('parallax: layers at the game height', () => {
    const out = join(tmp, 'par');
    const r = run('parallax', ex('andes-far.png'), ex('andes-near.png'), '--height', '180', '--target', 'godot', '--out', out, '--json');
    expect(r.code, r.err).toBe(0);
    const j = JSON.parse(r.out) as { layers: { role: string; height: number }[] };
    expect(j.layers.map((l) => [l.role, l.height])).toEqual([['far', 180], ['near', 180]]);
    expect(walk(out)).toContain('background/background.tscn');
  });
});

describe('cli: prompt', () => {
  it('prints the prompt and writes the guide PNG', () => {
    const guide = join(tmp, 'guide.png');
    const r = run('prompt', 'sprite', '--subject', 'a knight with a blue cape', '--action', 'run', '--frames', '6', '--cols', '3', '--guide', guide);
    expect(r.code, r.err).toBe(0);
    expect(r.out).toContain('a knight with a blue cape');
    const img = decodePng(new Uint8Array(readFileSync(guide)));
    expect([img.width, img.height]).toEqual([3 * 256, 2 * 256]);
  });
  it('--lang es, --json, every kind works', () => {
    const j = run('prompt', 'tile', '--material', 'césped', '--lang', 'es', '--json');
    expect(j.code, j.err).toBe(0);
    expect(JSON.parse(j.out)).toMatchObject({ kind: 'tile', lang: 'es', guide: null });
    const need: Record<string, string[]> = {
      sprite: ['--subject', 'x'], directions: ['--subject', 'x'], effects: ['--description', 'fire'], tile: ['--material', 'x'],
      atlas: ['--theme', 'x'], items: ['--items', 'a, b'], parallax: ['--theme', 'x'], video: ['--subject', 'x'],
    };
    for (const [kind, args] of Object.entries(need)) {
      const r = run('prompt', kind, ...args, '--guide', join(tmp, `g-${kind}.png`));
      expect(r.code, `${kind}: ${r.err}`).toBe(0);
      expect(r.out.length, kind).toBeGreaterThan(100);
    }
    expect(run('prompt', 'sprite').code).toBe(2); // --subject is required
  });
});
