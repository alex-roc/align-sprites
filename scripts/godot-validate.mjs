// Loads the Godot export of a synthetic sprite in headless Godot 4 and checks it (tools/godot-validate/validate.gd).
// Run: pnpm test:godot. Exits 0 with a notice when the Godot binary is not installed.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { buildExport, decodePng } from '../src/core/export/index.ts';
import { runSpriteJob } from '../src/core/pipeline/index.ts';
import { autoBgOptions } from '../src/core/bg/index.ts';
import { unfakeFromBytes } from '../src/core/pixel/unfake.ts';

const GODOT = process.env.GODOT_BIN ?? '/Applications/Godot.app/Contents/MacOS/Godot';
const project = fileURLToPath(new URL('../tools/godot-validate/', import.meta.url));
const out = join(project, 'out');

if (!existsSync(GODOT)) {
  console.log(`[godot-validate] Godot not found at ${GODOT} (set GODOT_BIN); skipping.`);
  process.exit(0);
}

/** Synthetic packed sheet: `anims` = [name, count, fps, loop]; each cell is a coloured rectangle. */
function synth(name, mode, cell, padBottom, anims, extra = {}) {
  const cols = Math.max(...anims.map((a) => a[1]));
  const rows = anims.length;
  const width = cols * cell.w;
  const height = rows * cell.h;
  const data = new Uint8ClampedArray(width * height * 4);
  anims.forEach(([, count], row) => {
    for (let c = 0; c < count; c++) {
      const color = [(row * 90 + 40) % 256, (c * 60 + 30) % 256, 200, 255];
      for (let y = 8; y < cell.h - 1 - padBottom; y++) {
        for (let x = 16 + c; x < cell.w - 16 - c; x++) {
          data.set(color, ((row * cell.h + y) * width + c * cell.w + x) * 4);
        }
      }
    }
  });
  const image = { width, height, data };
  const sheet = {
    image, cell, cols, rows, padBottom, mode, ...extra,
    anims: anims.map(([n, count, fps, loop], row) => ({ name: n, row, count, fps, loop })),
  };
  return { name, sheet, frames: [], diag: { scale: 1, refHeight: cell.h, metrics: [], regions: [], warnings: [] } };
}

/** A real AI sheet through the whole pipeline (samples/real/Correr.png, 8 run frames). */
function real() {
  const core = unfakeFromBytes(new Uint8Array(readFileSync(new URL('../src/vendor/unfake/unfake_wasm_bg.wasm', import.meta.url))));
  const source = decodePng(new Uint8Array(readFileSync(new URL('../samples/real/Correr.png', import.meta.url))));
  return runSpriteJob(core, {
    name: 'run', source, mode: 'pixel', bg: autoBgOptions(source, 'pixel'),
    segmentation: { kind: 'auto', expected: 8 }, animations: [{ name: 'run', frames: [0, 1, 2, 3, 4, 5, 6, 7], fps: 12, loop: true }],
    cell: { w: 64, h: 64, padBottom: 2 }, scale: { kind: 'targetHeight', px: 48 }, maxColors: 32,
  });
}

const results = [
  synth('Héroe', 'pixel', { w: 64, h: 96 }, 2, [['idle', 4, 6, true], ['walk', 6, 10, true], ['attack', 3, 12.5, false]], { collision: { x: 22, y: 36, w: 20, h: 60 } }),
  synth('slime', 'cartoon', { w: 32, h: 32 }, 0, [['idle', 2, 4, true]], { collision: { x: 6, y: 12, w: 20, h: 20 } }),
  real(),
  // One animation with one frame = static sprite: Sprite2D scene, no SpriteFrames.
  synth('Piedra', 'pixel', { w: 32, h: 32 }, 1, [['default', 1, 8, true]], { collision: { x: 4, y: 10, w: 24, h: 21 } }),
  // Centre-anchored effects (animated and static): origin in the middle of the frame, box on half pixels.
  synth('Chispa', 'pixel', { w: 32, h: 32 }, 0, [['boom', 3, 12, false]], { anchor: 'center', collision: { x: 7.5, y: 8, w: 17, h: 16 } }),
  synth('Moneda', 'pixel', { w: 16, h: 16 }, 0, [['default', 1, 8, true]], { anchor: 'center', collision: { x: 3, y: 3, w: 10, h: 10 } }),
];

rmSync(out, { recursive: true, force: true });
for (const f of buildExport(results, ['godot'], { prefix: true })) {
  const p = join(out, f.path);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, f.data);
}

const slugs = ['heroe', 'slime', 'run', 'piedra', 'chispa', 'moneda'];
const nodes = ['Heroe', 'Slime', 'Run', 'Piedra', 'Chispa', 'Moneda'];
const pairs = [];
results.forEach((r, i) => {
  const { sheet } = r;
  const expected = {
    cell: sheet.cell,
    texture: { w: sheet.image.width, h: sheet.image.height },
    anims: sheet.anims.map((a) => ({ name: a.name, frames: a.count, speed: a.fps, loop: a.loop })),
    scene: {
      path: `res://out/godot/${slugs[i]}/${slugs[i]}.tscn`,
      node: nodes[i],
      centered: sheet.anchor === 'center',
      offset: sheet.anchor === 'center' ? [0, 0] : [-Math.floor(sheet.cell.w / 2), -(sheet.cell.h - 1 - sheet.padBottom)],
      texture_filter: sheet.mode === 'pixel' ? 1 : 0,
      animation: sheet.anims[0].name,
    },
  };
  const isStatic = sheet.anims.length === 1 && sheet.anims[0].count === 1;
  if (isStatic) expected.static = true;
  // <name>_body.tscn: CharacterBody2D at the origin; the shape centre is the box centre minus the origin.
  const box = sheet.collision;
  const origin = sheet.anchor === 'center'
    ? [sheet.cell.w / 2, sheet.cell.h / 2]
    : [Math.floor(sheet.cell.w / 2), sheet.cell.h - 1 - sheet.padBottom];
  expected.body = {
    path: `res://out/godot/${slugs[i]}/${slugs[i]}_body.tscn`,
    node: nodes[i],
    shape_size: [box.w, box.h],
    shape_position: [box.x + box.w / 2 - origin[0], box.y + box.h / 2 - origin[1]],
  };
  writeFileSync(join(out, `${slugs[i]}.expected.json`), JSON.stringify(expected, null, 2));
  // Static sprites have no .tres: the first path of the pair is the .tscn (only checked for existence there).
  pairs.push(`res://out/godot/${slugs[i]}/${slugs[i]}.${isStatic ? 'tscn' : 'tres'}`, `res://out/${slugs[i]}.expected.json`);
});

function godot(args) {
  const r = spawnSync(GODOT, ['--headless', '--path', project, ...args], { encoding: 'utf8', timeout: 120000 });
  process.stdout.write(r.stdout ?? '');
  process.stderr.write(r.stderr ?? '');
  const bad = r.status !== 0 || /ERROR/.test(r.stderr ?? '') || /ERROR/.test(r.stdout ?? '');
  if (bad) {
    console.error(`[godot-validate] FAILED (exit ${r.status}) running: godot ${args.join(' ')}`);
    process.exit(1);
  }
}

godot(['--import']);
godot(['--script', 'res://validate.gd', '--', ...pairs]);
console.log('[godot-validate] OK');
