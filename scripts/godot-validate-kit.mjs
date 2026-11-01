// Exports a whole game kit for Godot (sprite, tile atlas, terrain TileSet, items atlas, parallax background) under one
// folder, loads every .tres/.tscn in headless Godot 4.3+ (tools/godot-validate/validate_kit.gd: relative paths must
// resolve inside the kit) and re-runs the items and parallax content checks on the kit copies.
// Run: pnpm test:godot:kit. Exits 0 with a notice when the Godot binary is not installed.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crop, createImage, setPixel } from '../src/core/image.ts';
import { buildKitExport } from '../src/core/kit/index.ts';
import { itemNames, normalizeItems } from '../src/core/items/index.ts';
import { buildParallax } from '../src/core/parallax/index.ts';
import { runSpriteJob } from '../src/core/pipeline/index.ts';
import { composeTransitions, defaultEdgeStyle, normalizeTileAtlas } from '../src/core/tiles/index.ts';
import { makeItemsSheet } from '../tests/fixtures/items.ts';
import { MAGENTA, makeCharacterFrames, makeSheet } from '../tests/fixtures/synth.ts';
import { loadUnfake } from '../tests/helpers.ts';

const GODOT = process.env.GODOT_BIN ?? '/Applications/Godot.app/Contents/MacOS/Godot';
const project = fileURLToPath(new URL('../tools/godot-validate/', import.meta.url));
const out = join(project, 'out', 'kit');

if (!existsSync(GODOT)) {
  console.log(`[godot-validate-kit] Godot not found at ${GODOT} (set GODOT_BIN); skipping.`);
  process.exit(0);
}

const projectFile = join(project, 'project.godot');
if (!existsSync(projectFile)) {
  mkdirSync(project, { recursive: true });
  writeFileSync(projectFile, '; Minimal project used by the Godot validation scripts.\nconfig_version=5\n\n[application]\n\nconfig/name="godot-validate"\nconfig/features=PackedStringArray("4.4")\n');
}

const core = loadUnfake();

function noisy(w, h, base, seed) {
  let a = seed;
  const img = createImage(w, h);
  for (let i = 0; i < w * h; i++) {
    a = (a * 1103515245 + 12345) >>> 0;
    const n = ((a >>> 16) % 50) - 25;
    img.data.set([base[0] + n, base[1] + n, base[2] + n, 255], i * 4);
  }
  return img;
}

function skyline(w, h, seed, sky) {
  let a = seed;
  const rnd = () => ((a = (a * 1103515245 + 12345) >>> 0) >>> 16) / 65536;
  const img = createImage(w, h, sky);
  for (let x = 0; x < w; ) {
    const bw = 6 + Math.floor(rnd() * 8), bh = 10 + Math.floor(rnd() * (h / 2));
    for (let dx = 0; dx < bw && x + dx < w; dx++) for (let y = h - bh; y < h; y++) setPixel(img, x + dx, y, [60, 70, 100, 255]);
    x += bw + Math.floor(rnd() * 4);
  }
  return img;
}

const hero = runSpriteJob(core, {
  name: 'Héroe', source: makeSheet(makeCharacterFrames(), { scale: 8, seed: 3 }).image, mode: 'pixel',
  bg: { color: MAGENTA, tolerance: 18, strategy: 'global' }, segmentation: { kind: 'auto' },
  animations: [{ name: 'walk', frames: [0, 1, 2, 3], fps: 10, loop: true }], cell: { w: 32, h: 32, padBottom: 0 }, scale: { kind: 'native' },
});
const items = normalizeItems(core, makeItemsSheet().img, { cellSize: 32, mode: 'pixel', bg: { color: 'auto', tolerance: 25, strategy: 'flood' } });
const itemNamesIn = ['coin', 'heart', 'Poción azul'];
const bgInputs = [0.2, 0.5, 0.8].map((factor, i) => ({ image: skyline(480, 96, i + 1, [120, 180, 230, 255]), removeBg: false, factor }));
const parallax = buildParallax(null, bgInputs, { mode: 'pixel', height: 48, loop: true, overlap: 0.12 });

const files = buildKitExport({
  sprites: [hero],
  atlas: { name: 'Mundo', result: normalizeTileAtlas(core, noisy(64, 32, [90, 160, 70], 7), { tileSize: 16, cols: 4, rows: 2, mode: 'pixel' }) },
  terrain: {
    name: 'Hierba', names: ['pasto', 'tierra'],
    result: composeTransitions(core, noisy(16, 16, [90, 160, 70], 1), noisy(16, 16, [140, 100, 60], 2), 16, 'dual16', defaultEdgeStyle(16, 1), 'pixel'),
  },
  items: { name: 'Objetos', names: itemNamesIn, result: items },
  parallax: { name: 'Mi Fondo', result: parallax },
}, 'godot');

rmSync(out, { recursive: true, force: true });
for (const f of files) {
  const p = join(out, f.path);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, f.data);
}

const res = (p) => `res://out/kit/${p}`;
const loads = files.map((f) => f.path).filter((p) => /\.(tres|tscn)$/.test(p)).map(res);

// Content checks on the kit copies (same expectations as the per-feature validators).
const pairs = [];
const slugs = itemNames(items, itemNamesIn);
items.items.forEach((it, i) => {
  const cell = crop(items.atlas, it.rect);
  let opaque = 0;
  for (let p = 3; p < cell.data.length; p += 4) if (cell.data[p] > 0) opaque++;
  const expected = { name: slugs[i], cell: items.cellSize, atlas: { w: items.atlas.width, h: items.atlas.height }, region: it.rect, opaque };
  writeFileSync(join(out, `${slugs[i]}.expected.json`), JSON.stringify(expected, null, 2));
  pairs.push(res(`godot/items/objetos/${slugs[i]}.tres`), res(`${slugs[i]}.expected.json`));
});
const node = (s) => s.split(/[_-]+/).map((p) => p[0].toUpperCase() + p.slice(1)).join('');
const bgExpected = {
  root: node('mi_fondo'),
  layers: parallax.layers.map((l) => ({
    node: node(l.role), scroll_scale: [l.factor, 1], repeat_size: [l.image.width, 0],
    texture: { w: l.image.width, h: l.image.height }, filter: 'nearest',
  })),
};
writeFileSync(join(out, 'mi_fondo.expected.json'), JSON.stringify(bgExpected, null, 2));
const bgPairs = [res('godot/backgrounds/mi_fondo/mi_fondo.tscn'), res('mi_fondo.expected.json')];

function godot(args) {
  const r = spawnSync(GODOT, ['--headless', '--path', project, ...args], { encoding: 'utf8', timeout: 180000 });
  process.stdout.write(r.stdout ?? '');
  process.stderr.write(r.stderr ?? '');
  if (r.status !== 0 || /ERROR/.test(r.stderr ?? '') || /ERROR/.test(r.stdout ?? '')) {
    console.error(`[godot-validate-kit] FAILED (exit ${r.status}) running: godot ${args.join(' ')}`);
    process.exit(1);
  }
}

console.log(`[godot-validate-kit] ${files.length} files, ${loads.length} scenes/resources to load`);
godot(['--import']);
godot(['--script', 'res://validate_kit.gd', '--', ...loads]);
godot(['--script', 'res://validate_items.gd', '--', ...pairs]);
godot(['--script', 'res://validate_parallax.gd', '--', ...bgPairs]);
console.log('[godot-validate-kit] OK');
