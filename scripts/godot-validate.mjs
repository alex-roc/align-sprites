// Loads the Godot export of a synthetic sprite in headless Godot 4 and checks it (tools/godot-validate/validate.gd).
// Run: pnpm test:godot. Exits 0 with a notice when the Godot binary is not installed.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildExport } from '../src/core/export/index.ts';

const GODOT = process.env.GODOT_BIN ?? '/Applications/Godot.app/Contents/MacOS/Godot';
const project = fileURLToPath(new URL('../tools/godot-validate/', import.meta.url));
const out = join(project, 'out');

if (!existsSync(GODOT)) {
  console.log(`[godot-validate] Godot not found at ${GODOT} (set GODOT_BIN); skipping.`);
  process.exit(0);
}

/** Synthetic packed sheet: `anims` = [name, count, fps, loop]; each cell is a coloured rectangle. */
function synth(name, mode, cell, padBottom, anims) {
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
    image, cell, cols, rows, padBottom, mode,
    anims: anims.map(([n, count, fps, loop], row) => ({ name: n, row, count, fps, loop })),
  };
  return { name, sheet, frames: [], diag: { scale: 1, refHeight: cell.h, metrics: [], regions: [], warnings: [] } };
}

const results = [
  synth('Héroe', 'pixel', { w: 64, h: 96 }, 2, [['idle', 4, 6, true], ['walk', 6, 10, true], ['attack', 3, 12.5, false]]),
  synth('slime', 'cartoon', { w: 32, h: 32 }, 0, [['idle', 2, 4, true]]),
];

rmSync(out, { recursive: true, force: true });
for (const f of buildExport(results, ['godot'])) {
  const p = join(out, f.path);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, f.data);
}

const slugs = ['heroe', 'slime'];
const nodes = ['Heroe', 'Slime'];
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
      offset: [-Math.floor(sheet.cell.w / 2), -(sheet.cell.h - 1 - sheet.padBottom)],
      texture_filter: sheet.mode === 'pixel' ? 1 : 0,
      animation: sheet.anims[0].name,
    },
  };
  writeFileSync(join(out, `${slugs[i]}.expected.json`), JSON.stringify(expected, null, 2));
  pairs.push(`res://out/godot/${slugs[i]}/${slugs[i]}.tres`, `res://out/${slugs[i]}.expected.json`);
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
