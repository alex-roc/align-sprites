// Normalizes the items example sheet, exports the Godot AtlasTextures, loads them in headless Godot 4 and checks them
// (tools/godot-validate/validate_items.gd): atlas size, region, texture size and the opaque pixels of every cell.
// Run: pnpm test:godot:items. Exits 0 with a notice when the Godot binary is not installed.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crop } from '../src/core/image.ts';
import { itemNames, itemsExport, normalizeItems } from '../src/core/items/index.ts';
import { loadUnfake } from '../tests/helpers.ts';
import { makeItemsSheet } from '../tests/fixtures/items.ts';

const GODOT = process.env.GODOT_BIN ?? '/Applications/Godot.app/Contents/MacOS/Godot';
const project = fileURLToPath(new URL('../tools/godot-validate/', import.meta.url));
const out = join(project, 'out', 'items');

if (!existsSync(GODOT)) {
  console.log(`[godot-validate-items] Godot not found at ${GODOT} (set GODOT_BIN); skipping.`);
  process.exit(0);
}

const projectFile = join(project, 'project.godot');
if (!existsSync(projectFile)) {
  mkdirSync(project, { recursive: true });
  writeFileSync(projectFile, '; Minimal project used by the Godot validation scripts.\nconfig_version=5\n\n[application]\n\nconfig/name="godot-validate"\nconfig/features=PackedStringArray("4.4")\n');
}

const result = normalizeItems(loadUnfake(), makeItemsSheet().img, { cellSize: 32, mode: 'pixel', bg: { color: 'auto', tolerance: 25, strategy: 'flood' } });
const names = ['coin', 'heart', 'Poción azul'];
const files = itemsExport(result, 'items', names, ['godot']);
const slugs = itemNames(result, names);

rmSync(out, { recursive: true, force: true });
for (const f of files) {
  const p = join(out, f.path);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, f.data);
}
const pairs = [];
result.items.forEach((it, i) => {
  const cell = crop(result.atlas, it.rect);
  let opaque = 0;
  for (let p = 3; p < cell.data.length; p += 4) if (cell.data[p] > 0) opaque++;
  const expected = { name: slugs[i], cell: result.cellSize, atlas: { w: result.atlas.width, h: result.atlas.height }, region: { x: it.rect.x, y: it.rect.y, w: it.rect.w, h: it.rect.h }, opaque };
  writeFileSync(join(out, `${slugs[i]}.expected.json`), JSON.stringify(expected, null, 2));
  pairs.push(`res://out/items/items/${slugs[i]}.tres`, `res://out/items/${slugs[i]}.expected.json`);
});

function godot(args) {
  const r = spawnSync(GODOT, ['--headless', '--path', project, ...args], { encoding: 'utf8', timeout: 180000 });
  process.stdout.write(r.stdout ?? '');
  process.stderr.write(r.stderr ?? '');
  if (r.status !== 0 || /ERROR/.test(r.stderr ?? '') || /ERROR/.test(r.stdout ?? '')) {
    console.error(`[godot-validate-items] FAILED (exit ${r.status}) running: godot ${args.join(' ')}`);
    process.exit(1);
  }
}

console.log(`[godot-validate-items] ${result.items.length} items, atlas ${result.atlas.width}x${result.atlas.height}`);
godot(['--import']);
godot(['--script', 'res://validate_items.gd', '--', ...pairs]);
console.log('[godot-validate-items] OK');
