// `sprite` (batch → engine exports) and `inspect` (what is in this image?).
import { buildExport } from '../src/core/export/index.ts';
import { inspectImage } from '../src/core/inspect/index.ts';
import { rgbaToHex } from '../src/core/palette/index.ts';
import { runBatch, runSpriteJob } from '../src/core/pipeline/index.ts';
import type { AnimSpec, BgOptions, CellSpec, RGBA8, SpriteJob } from '../src/core/types.ts';
import { parseFrames } from '../src/ui/lib/frames.ts';
import { rowAnimations } from '../src/ui/lib/frameOps.ts';
import {
  CliError, UsageError, flag, int, loadCore, loadImage, mode, num, oneOf, parse, parseGrid, parseTargets, printJson, printWarnings,
  reportOutput, resolvePalette, str, strs, tw, uniqueNames,
} from './common.ts';

// ---------------------------------------------------------------- sprite

const SPRITE_USAGE = `Usage: align-sprites sprite <image.png...> [options]

Normalizes sprite sheets / single sprites to ONE shared height and exports them for game engines.
Every image of the batch ends up at the same scale; the cell is one for the whole batch.

Art
  --mode pixel|cartoon      pixel art (true grid, default) or smooth art (video frames, vector, painted)
  --height N                character height in output px (default: native for pixel, 128 for cartoon)
  --relative name=1.5       size multiplier of one image (repeatable): a boss, a small enemy
  --ref median|tallest      what stands for the height; tallest for jumps and crouches
  --palette P               preset (pico-8, sweetie-16, endesga-32, game-boy) or .hex/.gpl/.txt file (pixel only)
  --colors N                reduce to N colours shared by the batch (pixel only, no --palette)
Frames
  --kind auto|sheet|single  auto = detect (default)
  --grid RxC                cut a sheet in ROWS x COLS (default: detect the frames)
  --anims "idle:0-3@8,run:4-9@12:noloop"   name:frames[@fps][:noloop][:flip]; frame numbers start at 0
  --rows-as-anims           one animation per row (top-down: walk_down/left/right/up)
  --fps N                   fps of the default and row animations (default 8)
Cell
  --cell auto|WxH           frame size (default auto: smallest multiple of 32 that fits)
  --pad N                   empty px under the feet with a fixed --cell (default 0)
  --anchor feet|center      feet = characters (default), center = effects, pickups
Background
  --bg auto|global|flood    global = chroma key (magenta/green), flood = white/other; auto picks by colour
  --tolerance N             background colour tolerance, ΔE (default 18)
Export
  --target T                godot,gdevelop,kaplay,generic or all (default all)
  --gd-sheets               GDevelop: also the Piskel spritesheet strips
  --name N                  export name (single image only; default: file name)
  --out PATH                directory (files unzipped) or file.zip (default ./align-sprites-out)
  --json                    print the summary as JSON`;

const SPRITE_OPTS = {
  mode: { type: 'string' }, height: { type: 'string' }, relative: { type: 'string', multiple: true }, ref: { type: 'string' },
  palette: { type: 'string' }, colors: { type: 'string' }, kind: { type: 'string' }, grid: { type: 'string' }, anims: { type: 'string' },
  'rows-as-anims': { type: 'boolean' }, fps: { type: 'string' }, cell: { type: 'string' }, pad: { type: 'string' }, anchor: { type: 'string' },
  bg: { type: 'string' }, tolerance: { type: 'string' }, target: { type: 'string' }, 'gd-sheets': { type: 'boolean' }, name: { type: 'string' },
  out: { type: 'string' }, json: { type: 'boolean' },
} as const;

/** "idle:0-3@8,run:4-9@12:noloop,run_left:4-9@12:flip" → animations (frame lists may use commas: "0,2,4-6"). */
export function parseAnims(text: string): AnimSpec[] {
  return text.split(/,(?=\s*[A-Za-z_])/).map((part) => {
    const [name, spec, ...flags] = part.trim().split(':');
    const bad = (why: string) => new UsageError(`--anims: "${part.trim()}": ${why}. Expected name:frames[@fps][:noloop][:flip]`);
    if (!name || !spec) throw bad('missing name or frames');
    const [frameText, fpsText] = spec.split('@');
    const p = parseFrames(frameText);
    if (!p.ok || p.all) throw bad('invalid frame list');
    const fps = fpsText === undefined ? 8 : Number(fpsText);
    if (!(fps >= 1)) throw bad('invalid fps');
    for (const f of flags) if (!['noloop', 'loop', 'flip'].includes(f)) throw bad(`unknown flag "${f}"`);
    return { name, frames: p.indices, fps, loop: !flags.includes('noloop'), ...(flags.includes('flip') ? { flipX: true } : {}) };
  });
}

function parseCell(text: string | undefined, pad: number): CellSpec | 'auto' {
  if (!text || text === 'auto') return 'auto';
  const m = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(text.trim());
  if (!m || +m[1] < 1 || +m[2] < 1) throw new UsageError(`--cell: expected auto or WxH, e.g. 64x64 (got "${text}")`);
  return { w: +m[1], h: +m[2], padBottom: pad };
}

/** "boss=1.5" entries → name → multiplier; names must belong to the batch. */
function parseRelative(entries: string[], names: string[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of entries) {
    const [n, k] = e.split('=');
    const mult = Number(k);
    if (!n || !(mult > 0)) throw new UsageError(`--relative: expected name=1.5 (got "${e}")`);
    if (!names.includes(n)) throw new UsageError(`--relative: no image named "${n}" (names: ${names.join(', ')})`);
    out.set(n, mult);
  }
  return out;
}

function bgFor(strategy: string, detected: BgOptions['strategy'], tolerance: number, artMode: 'pixel' | 'cartoon'): BgOptions {
  const bg: BgOptions = { color: 'auto', tolerance, strategy: strategy === 'auto' ? detected : (strategy as BgOptions['strategy']), minHole: 16 };
  if (artMode === 'cartoon') {
    bg.soft = { inner: 10, outer: 40 };
    bg.despill = true;
  }
  return bg;
}

export async function spriteCommand(argv: string[]): Promise<void> {
  const parsed = parse(argv, SPRITE_OPTS, SPRITE_USAGE);
  if (!parsed) return;
  const { v, pos: files } = parsed;
  if (!files.length) throw new UsageError(`sprite: no images given\n\n${SPRITE_USAGE}`);

  const artMode = mode(v);
  const kindOpt = oneOf(v, 'kind', ['auto', 'sheet', 'single'], 'auto');
  const bgOpt = oneOf(v, 'bg', ['auto', 'global', 'flood'], 'auto');
  const anchor = oneOf(v, 'anchor', ['feet', 'center'], 'feet');
  const ref = oneOf(v, 'ref', ['median', 'tallest'], 'median');
  const fps = Math.max(1, num(v, 'fps') ?? 8);
  const cell = parseCell(str(v, 'cell'), int(v, 'pad') ?? 0);
  const tolerance = num(v, 'tolerance') ?? 18;
  const height = int(v, 'height') ?? (artMode === 'cartoon' ? 128 : undefined);
  const grid = str(v, 'grid') ? parseGrid(str(v, 'grid')!) : null;
  const animText = str(v, 'anims');
  const rowsAsAnims = flag(v, 'rows-as-anims');
  if (animText && rowsAsAnims) throw new UsageError('--anims and --rows-as-anims cannot be used together');
  const palette = artMode === 'pixel' ? resolvePalette(str(v, 'palette')) : undefined;
  const colors = int(v, 'colors') ?? 0;
  const targets = parseTargets(str(v, 'target'));
  if (str(v, 'name') && files.length > 1) throw new UsageError('--name only makes sense with a single image');

  const names = str(v, 'name') ? [str(v, 'name')!] : uniqueNames(files);
  const relative = parseRelative(strs(v, 'relative'), names);
  const core = loadCore();
  const anims = animText ? parseAnims(animText) : [];

  const kinds: string[] = [];
  const jobs = files.map<SpriteJob>((file, i) => {
    const source = loadImage(file);
    const seen = inspectImage(source, artMode);
    const kind = kindOpt === 'auto' ? (grid ? 'sheet' : seen.kind) : kindOpt;
    kinds.push(kind);
    return {
      name: names[i],
      source,
      mode: artMode,
      bg: bgFor(bgOpt, seen.bg.strategy, tolerance, artMode),
      segmentation: kind === 'single' ? { kind: 'single' } : grid ? { kind: 'grid', ...grid } : { kind: 'auto' },
      animations: kind === 'single' ? [] : anims,
      cell,
      scale: height
        ? { kind: 'targetHeight', px: height, relative: relative.get(names[i]) ?? 1, ...(ref === 'tallest' ? { reference: 'tallest' as const } : {}) }
        : { kind: 'native' },
      maxColors: artMode === 'pixel' && !palette && colors > 0 ? colors : undefined,
      anchorX: 'medianColumn',
      ...(anchor === 'center' ? { anchor: 'center' as const } : {}),
      ...(palette ? { palette } : {}),
    };
  });

  // One animation per row needs the detected frames: a first run gives the row of each one (as the UI does).
  if (rowsAsAnims) {
    let n = 0;
    jobs.forEach((job, i) => {
      if (kinds[i] === 'single') return;
      const rows = runSpriteJob(core, job).diag.regions.map((r) => r.row);
      const drafts = rowAnimations(rows, fps, () => String(n++));
      if (drafts) {
        job.animations = drafts.map((d) => ({ name: d.name, frames: parseFrames(d.frames).indices, fps: d.fps, loop: d.loop, ...(d.flipX ? { flipX: true } : {}) }));
      }
    });
  }

  const results = runBatch(core, jobs);
  const usable = results.filter((r) => r.frames.length);
  const summary = results.map((r, i) => ({
    name: r.name,
    file: files[i],
    kind: kinds[i],
    frames: r.diag.regions.length,
    cell: r.frames.length ? r.sheet.cell : null,
    height: r.diag.refHeight,
    scale: Number(r.diag.scale.toFixed(4)),
    animations: r.sheet.anims.map((a) => ({ name: a.name, frames: a.count, fps: a.fps, loop: a.loop })),
    warnings: r.diag.warnings.map(tw),
  }));

  if (flag(v, 'json')) printJson(summary);
  else {
    for (const [i, r] of results.entries()) {
      const s = summary[i];
      const anim = s.animations.map((a) => `${a.name}[${a.frames}@${a.fps}${a.loop ? '' : ',once'}]`).join(' ');
      console.log(`${r.name} (${s.kind}): ${s.frames} frame${s.frames === 1 ? '' : 's'}, cell ${s.cell ? `${s.cell.w}x${s.cell.h}` : '-'}, height ${s.height} px, scale ${s.scale}`);
      if (anim) console.log(`  animations: ${anim}`);
      printWarnings(r.diag.warnings);
    }
  }
  if (!usable.length) throw new CliError('No frames were found in any image: nothing exported. Check --bg, --tolerance or --grid.');

  const exported = buildExport(usable, targets, { gdevelopSpritesheets: flag(v, 'gd-sheets') });
  const out = str(v, 'out') ?? 'align-sprites-out';
  reportOutput(exported, out, flag(v, 'json'));
}

// ---------------------------------------------------------------- inspect

const INSPECT_USAGE = `Usage: align-sprites inspect <image.png...> [--mode pixel|cartoon] [--json]

Type (sheet or single sprite), background, frame count and source height of each image: a quick look before
choosing the options of \`sprite\`. For pixel art it also reports the detected pixel period and art height.`;

export async function inspectCommand(argv: string[]): Promise<void> {
  const parsed = parse(argv, { mode: { type: 'string' }, json: { type: 'boolean' } }, INSPECT_USAGE);
  if (!parsed) return;
  if (!parsed.pos.length) throw new UsageError(`inspect: no images given\n\n${INSPECT_USAGE}`);
  const artMode = mode(parsed.v);
  const out = parsed.pos.map((file) => {
    const img = loadImage(file);
    const r = inspectImage(img, artMode);
    const grid = artMode === 'pixel' ? loadCore().detectGrid(img) : null;
    const period = grid ? Number(((grid.periodX + grid.periodY) / 2).toFixed(2)) : null;
    return {
      file,
      width: img.width,
      height: img.height,
      kind: r.kind,
      frames: r.frameCount,
      sourceHeight: r.sourceHeight,
      background: { color: rgbaToHex(r.bg.color as RGBA8), strategy: r.bg.strategy },
      pixelPeriod: period,
      artHeight: period ? Math.round(r.sourceHeight / period) : null,
    };
  });
  if (flag(parsed.v, 'json')) return printJson(out);
  for (const o of out) {
    const grid = o.pixelPeriod ? `, pixel period ${o.pixelPeriod} (art height ~${o.artHeight} px)` : artMode === 'pixel' ? ', no pixel grid found' : '';
    console.log(`${o.file}: ${o.width}x${o.height} ${o.kind}, ${o.frames} frame${o.frames === 1 ? '' : 's'}, source height ${o.sourceHeight} px, background ${o.background.color} (${o.background.strategy})${grid}`);
  }
}
