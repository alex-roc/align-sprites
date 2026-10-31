// Exports a blob47 and a dual16 terrain TileSet, loads them in headless Godot 4 and checks them
// (tools/godot-validate/validate_tileset.gd): tile size, terrain mode, tile count, peering bits and, for blob47,
// the TileMapLayer terrain solver picking the expected tile per painted cell.
// Run: pnpm test:godot:tiles. Exits 0 with a notice when the Godot binary is not installed.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createImage } from '../src/core/image.ts';
import { BLOB47_MASKS, blobMaskAt, blobPos, composeTransitions, defaultEdgeStyle, godotTerrainTileSet, terrainExport } from '../src/core/tiles/index.ts';

const GODOT = process.env.GODOT_BIN ?? '/Applications/Godot.app/Contents/MacOS/Godot';
const project = fileURLToPath(new URL('../tools/godot-validate/', import.meta.url));
const out = join(project, 'out', 'tiles');

if (!existsSync(GODOT)) {
  console.log(`[godot-validate-tiles] Godot not found at ${GODOT} (set GODOT_BIN); skipping.`);
  process.exit(0);
}

// The shared project may not exist yet (other validator creates it); never overwrite an existing one.
const projectFile = join(project, 'project.godot');
if (!existsSync(projectFile)) {
  mkdirSync(project, { recursive: true });
  writeFileSync(projectFile, '; Minimal project used by the Godot validation scripts.\nconfig_version=5\n\n[application]\n\nconfig/name="godot-validate"\nconfig/features=PackedStringArray("4.4")\n');
}

const T = 16;
const tex = (base, seed) => {
  let a = seed;
  const img = createImage(T, T);
  for (let i = 0; i < T * T; i++) {
    a = (a * 1103515245 + 12345) >>> 0;
    const n = ((a >>> 16) % 50) - 25;
    img.data.set([base[0] + n, base[1] + n, base[2] + n, 255], i * 4);
  }
  return img;
};
const A = tex([70, 150, 60], 1);
const B = tex([130, 90, 50], 2);

/** Deterministic 0/1 map, p = 0.55. */
function randomCells(w, h, seed) {
  let a = seed;
  const c = new Uint8Array(w * h);
  for (let i = 0; i < c.length; i++) {
    a = (a * 1103515245 + 12345) >>> 0;
    c[i] = (a >>> 16) % 100 < 55 ? 1 : 0;
  }
  return c;
}

rmSync(out, { recursive: true, force: true });
const pairs = [];

function emit(name, r, mode, terrains, extra = {}, tresOverride) {
  const files = terrainExport(r, name, ['pasto', 'tierra']);
  for (const f of files) {
    const p = join(out, f.path);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, f.data);
  }
  if (tresOverride) writeFileSync(join(out, name, `${name}.tres`), tresOverride);
  const expected = {
    name,
    tile_size: T,
    texture: { w: r.atlas.width, h: r.atlas.height },
    mode,
    terrains,
    tiles: r.tiles.map((t) => ({
      c: t.col, r: t.row,
      terrain_set: r.layout === 'blob47' && t.mask < 0 && !extra.aTileTerrainSet ? -1 : 0,
      terrain: t.terrain,
      bits: t.bits,
    })),
    ...extra.json,
  };
  writeFileSync(join(out, `${name}.expected.json`), JSON.stringify(expected, null, 2));
  pairs.push(`res://out/tiles/${name}/${name}.tres`, `res://out/tiles/${name}.expected.json`);
}

// blob47: a random map (every neighbour configuration, diagonal-only contacts included) painted with the terrain solver.
const style = defaultEdgeStyle(T, 7);
const blob = composeTransitions(null, A, B, T, 'blob47', style, 'pixel');
const w = 14, h = 10;
const cells = randomCells(w, h, 42);
const paint = [], expectedCells = [];
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    if (!cells[y * w + x]) continue;
    paint.push([x, y]);
    const p = blobPos(blobMaskAt(cells, w, h, x, y));
    expectedCells.push([x, y, p.col, p.row]);
  }
}
const json = { paint, expected: expectedCells };
emit('blob47', blob, 0, 1, { json });
// Variant: the plain A tile also carries terrain_set 0 (no terrain).
emit('blob47_a_ts', blob, 0, 1, { aTileTerrainSet: true, json }, godotTerrainTileSet(blob, 'blob47_a_ts.png', ['pasto', 'tierra'], { aTileTerrainSet: true }));
const dual = composeTransitions(null, A, B, T, 'dual16', style, 'pixel');
emit('dual16', dual, 1, 2);

function godot(args, allowFail = false) {
  const r = spawnSync(GODOT, ['--headless', '--path', project, ...args], { encoding: 'utf8', timeout: 180000 });
  process.stdout.write(r.stdout ?? '');
  process.stderr.write(r.stderr ?? '');
  const bad = r.status !== 0 || /ERROR/.test(r.stderr ?? '') || /ERROR/.test(r.stdout ?? '');
  if (bad && !allowFail) {
    console.error(`[godot-validate-tiles] FAILED (exit ${r.status}) running: godot ${args.join(' ')}`);
    process.exit(1);
  }
  return !bad;
}

console.log(`[godot-validate-tiles] ${BLOB47_MASKS.length} blob masks, ${paint.length} painted cells`);
godot(['--import']);
godot(['--script', 'res://validate_tileset.gd', '--', ...pairs]);
console.log('[godot-validate-tiles] OK');
