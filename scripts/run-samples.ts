// Run the whole pipeline over the sample sheets (samples/real, samples/codex) and write before/after results
// to samples/out/ (ignored). Use it as a visual regression check: node scripts/run-samples.ts [filter]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { autoBgOptions } from '../src/core/bg/index.ts';
import { decodePng, encodePng } from '../src/core/export/index.ts';
import { resizeNearest } from '../src/core/image.ts';
import { runBatch } from '../src/core/pipeline/index.ts';
import { unfakeFromBytes } from '../src/core/pixel/unfake.ts';
import type { ArtMode, CellSpec, ScalePolicy, Segmentation, SpriteJob } from '../src/core/types.ts';

const root = new URL('../', import.meta.url);
const core = unfakeFromBytes(new Uint8Array(readFileSync(new URL('src/vendor/unfake/unfake_wasm_bg.wasm', root))));

interface Case {
  file: string;
  mode: ArtMode;
  seg: Segmentation;
  scale: ScalePolicy;
  cell: CellSpec | 'auto';
  maxColors?: number;
}

const H = (px: number): ScalePolicy => ({ kind: 'targetHeight', px });
const CASES: Case[] = [
  { file: 'real/Correr.png', mode: 'pixel', seg: { kind: 'auto', expected: 8 }, scale: H(48), cell: { w: 64, h: 64, padBottom: 0 }, maxColors: 32 },
  { file: 'real/Personaje.png', mode: 'pixel', seg: { kind: 'auto', expected: 4 }, scale: H(48), cell: { w: 64, h: 64, padBottom: 0 }, maxColors: 32 },
  { file: 'real/Personaje suelto.png', mode: 'pixel', seg: { kind: 'single' }, scale: H(48), cell: { w: 64, h: 64, padBottom: 0 }, maxColors: 32 },
  { file: 'real/Chuspillo dorado en pixel art.png', mode: 'pixel', seg: { kind: 'single' }, scale: { kind: 'native' }, cell: 'auto' },
  { file: 'codex/knight-walk-pixel.png', mode: 'pixel', seg: { kind: 'grid', rows: 2, cols: 3 }, scale: H(32), cell: { w: 32, h: 32, padBottom: 0 }, maxColors: 16 },
  { file: 'codex/wizard-single-pixel-large.png', mode: 'pixel', seg: { kind: 'single' }, scale: H(64), cell: { w: 64, h: 64, padBottom: 0 }, maxColors: 16 },
  { file: 'codex/slime-idle-cartoon.png', mode: 'cartoon', seg: { kind: 'grid', rows: 2, cols: 2 }, scale: H(96), cell: 'auto' },
  { file: 'codex/fox-run-cartoon.png', mode: 'cartoon', seg: { kind: 'grid', rows: 2, cols: 3 }, scale: H(96), cell: 'auto' },
];

const filter = process.argv[2];
const out = new URL('samples/out/', root);
mkdirSync(out, { recursive: true });
for (const c of CASES) {
  if (filter && !c.file.includes(filter)) continue;
  const source = decodePng(new Uint8Array(readFileSync(new URL('samples/' + c.file, root))));
  const job: SpriteJob = {
    name: c.file.split('/').pop()!.replace(/\.png$/, ''),
    source,
    mode: c.mode,
    bg: autoBgOptions(source, c.mode),
    segmentation: c.seg,
    animations: [],
    cell: c.cell,
    scale: c.scale,
    maxColors: c.maxColors,
  };
  const t = performance.now();
  const [r] = runBatch(core, [job]);
  const ms = Math.round(performance.now() - t);
  const slug = job.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  writeFileSync(new URL(slug + '.png', out), encodePng(r.sheet.image));
  const z = r.sheet.image.width < 400 ? 4 : 2;
  writeFileSync(new URL(slug + '.x' + z + '.png', out), encodePng(resizeNearest(r.sheet.image, r.sheet.image.width * z, r.sheet.image.height * z)));
  console.log(
    `${c.file}: ${r.frames.length} frames, cell ${r.sheet.cell.w}×${r.sheet.cell.h}, period ${r.diag.grid ? r.diag.grid.periodX.toFixed(2) : '-'}, ` +
      `scale ${r.diag.scale.toFixed(3)}, refH ${r.diag.refHeight}, ${ms} ms` +
      (r.diag.warnings.length ? `, warnings: ${r.diag.warnings.map((w) => w.key + JSON.stringify(w.params ?? {})).join(' ')}` : ''),
  );
}
