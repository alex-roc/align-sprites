// Exports a pixel and a cartoon parallax background, loads the scenes in headless Godot 4.3+ and checks them
// (tools/godot-validate/validate_parallax.gd): Parallax2D per layer, scroll_scale, repeat_size = texture width,
// Sprite2D not centred, texture filter, and that the nodes run with a Camera2D.
// Run: pnpm test:godot:parallax. Exits 0 with a notice when the Godot binary is not installed.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createImage, setPixel } from '../src/core/image.ts';
import { buildParallax, parallaxExport } from '../src/core/parallax/index.ts';

const GODOT = process.env.GODOT_BIN ?? '/Applications/Godot.app/Contents/MacOS/Godot';
const project = fileURLToPath(new URL('../tools/godot-validate/', import.meta.url));
const out = join(project, 'out', 'parallax');

if (!existsSync(GODOT)) {
  console.log(`[godot-validate-parallax] Godot not found at ${GODOT} (set GODOT_BIN); skipping.`);
  process.exit(0);
}

// The shared project may not exist yet (other validators create it); never overwrite an existing one.
const projectFile = join(project, 'project.godot');
if (!existsSync(projectFile)) {
  mkdirSync(project, { recursive: true });
  writeFileSync(projectFile, '; Minimal project used by the Godot validation scripts.\nconfig_version=5\n\n[application]\n\nconfig/name="godot-validate"\nconfig/features=PackedStringArray("4.4")\n');
}

/** Deterministic skyline layer with a flat sky; the edges are unrelated so the loop has work to do. */
function layer(w, h, seed, sky) {
  let a = seed;
  const rnd = () => ((a = (a * 1103515245 + 12345) >>> 0) >>> 16) / 65536;
  const img = createImage(w, h, sky);
  for (let x = 0; x < w; ) {
    const bw = 6 + Math.floor(rnd() * 8), bh = 10 + Math.floor(rnd() * (h / 2));
    const c = [30 + Math.floor(rnd() * 80), 40 + Math.floor(rnd() * 80), 60 + Math.floor(rnd() * 80), 255];
    for (let dx = 0; dx < bw && x + dx < w; dx++) for (let y = h - bh; y < h; y++) setPixel(img, x + dx, y, c);
    x += bw + Math.floor(rnd() * 4);
  }
  return img;
}

rmSync(out, { recursive: true, force: true });
const pairs = [];

function emit(name, mode, inputs, height) {
  const r = buildParallax(null, inputs, { mode, height, loop: true, overlap: 0.12 });
  for (const f of parallaxExport(r, name, ['godot'])) {
    const p = join(out, f.path);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, f.data);
  }
  const node = (s) => s.split(/[_-]+/).map((p) => p[0].toUpperCase() + p.slice(1)).join('');
  const expected = {
    root: node(name),
    layers: r.layers.map((l) => ({
      node: node(l.role),
      scroll_scale: [l.factor, 1],
      repeat_size: [l.image.width, 0],
      texture: { w: l.image.width, h: l.image.height },
      filter: mode === 'pixel' ? 'nearest' : 'inherit',
    })),
  };
  writeFileSync(join(out, `${name}.expected.json`), JSON.stringify(expected, null, 2));
  pairs.push(`res://out/parallax/${name}/${name}.tscn`, `res://out/parallax/${name}.expected.json`);
  console.log(`[godot-validate-parallax] ${name}: ${r.layers.map((l) => `${l.role} ${l.image.width}x${l.image.height}`).join(', ')}`);
}

emit('mi_fondo', 'pixel', [
  { image: layer(480, 96, 1, [120, 180, 230, 255]), removeBg: false, factor: 0.2 },
  { image: layer(480, 96, 2, [120, 180, 230, 255]), removeBg: false, factor: 0.5 },
  { image: layer(480, 96, 3, [120, 180, 230, 255]), removeBg: false, factor: 0.8 },
], 48);
emit('cartoon_bg', 'cartoon', [
  { image: layer(400, 120, 4, [200, 220, 240, 255]), removeBg: false, factor: 0.3 },
  { image: layer(400, 120, 5, [200, 220, 240, 255]), removeBg: false, factor: 0.9 },
], 60);

function godot(args) {
  const r = spawnSync(GODOT, ['--headless', '--path', project, ...args], { encoding: 'utf8', timeout: 180000 });
  process.stdout.write(r.stdout ?? '');
  process.stderr.write(r.stderr ?? '');
  const bad = r.status !== 0 || /ERROR/.test(r.stderr ?? '') || /ERROR/.test(r.stdout ?? '');
  if (bad) {
    console.error(`[godot-validate-parallax] FAILED (exit ${r.status}) running: godot ${args.join(' ')}`);
    process.exit(1);
  }
}

godot(['--import']);
godot(['--script', 'res://validate_parallax.gd', '--', ...pairs]);
console.log('[godot-validate-parallax] OK');
