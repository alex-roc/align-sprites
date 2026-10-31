// Maps UI settings → SpriteJob[]. GLOBAL settings (mode, sprite size, frame size, palette, padding, anchor) are applied
// to every job, which is what keeps characters of one batch at the same scale; PER-ASSET settings (type, background,
// segmentation, animations, offsets, recolour, relative size) only affect their own job.
import { PALETTES, dedupeColors, hexToRgba } from '../../core/palette/index.ts';
import type { AnimSpec, ArtMode, BgOptions, RGBA8, Segmentation, SpriteJob } from '../../core/types.ts';
import { parseFrames } from '../lib/frames.ts';
import { isPristineAnims } from './defaults.ts';
import type { Asset, GlobalSettings } from './types.ts';

export interface JobBundle {
  jobs: SpriteJob[];
  assetIds: string[];
}

/** Unique, file-system friendly export name per asset id. */
export function exportNames(assets: Asset[]): Map<string, string> {
  const used = new Set<string>();
  const out = new Map<string, string>();
  for (const a of assets) {
    const base = a.name.trim().replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '') || 'sprite';
    let name = base;
    for (let n = 2; used.has(name); n++) name = `${base}_${n}`;
    used.add(name);
    out.set(a.id, name);
  }
  return out;
}

function buildBg(a: Asset, g: GlobalSettings): BgOptions {
  const strategy = a.bg.strategy === 'auto' ? (a.autoBg?.strategy ?? 'flood') : a.bg.strategy;
  const bg: BgOptions = {
    color: a.bg.custom ? [a.bg.color[0], a.bg.color[1], a.bg.color[2], 255] : 'auto',
    tolerance: a.bg.tolerance,
    strategy,
    minHole: 16,
  };
  if (g.mode === 'cartoon') {
    bg.soft = { inner: 10, outer: 40 };
    bg.despill = true;
  }
  return bg;
}

/** The fixed palette (preset, taken from an image or custom) every pixel snaps to; undefined for 'original' and 'reduce'. */
export function fixedPalette(g: GlobalSettings, mode: ArtMode = g.mode): RGBA8[] | undefined {
  if (mode !== 'pixel') return undefined;
  if (g.palette.kind === 'preset') {
    const id = g.palette.id;
    return PALETTES.find((p) => p.id === id)?.colors;
  }
  if (g.palette.kind === 'custom') return g.customColors.length ? dedupeColors(g.customColors).map(hexToRgba) : undefined;
  return g.palette.kind === 'image' ? g.palette.colors : undefined;
}

function buildSegmentation(a: Asset): Segmentation {
  if (a.kind === 'single') return { kind: 'single' };
  if (a.regions) return { kind: 'manual', regions: a.regions };
  if (a.seg.mode === 'grid') return { kind: 'grid', rows: Math.max(1, a.seg.rows), cols: Math.max(1, a.seg.cols) };
  return { kind: 'auto' };
}

/**
 * Blank frame ranges mean "every frame": they are resolved with the frame count of the previous run. Before the
 * first run (count unknown) blank animations are left out, and the untouched default is delegated to the core.
 */
function buildAnimations(a: Asset, frameCount: number | undefined): AnimSpec[] {
  if (a.kind === 'single' || isPristineAnims(a.anims)) return [];
  const out: AnimSpec[] = [];
  for (const d of a.anims) {
    const p = parseFrames(d.frames);
    if (!p.ok) continue;
    const frames = p.all ? (frameCount ? [...Array(frameCount).keys()] : []) : p.indices;
    if (!frames.length) continue;
    out.push({ name: d.name.trim() || 'anim', frames, fps: Math.max(1, d.fps), loop: d.loop, ...(d.flipX ? { flipX: true } : {}) });
  }
  return out;
}

export function buildJobs(assets: Asset[], g: GlobalSettings, frameCounts: Record<string, number>): JobBundle {
  const names = exportNames(assets);
  const palette = fixedPalette(g);
  const reduce = g.mode === 'pixel' && g.palette.kind === 'reduce' ? g.maxColors : 0;
  const jobs = assets.map<SpriteJob>((a) => ({
    name: names.get(a.id) ?? a.name,
    source: a.image,
    mode: g.mode,
    bg: buildBg(a, g),
    segmentation: buildSegmentation(a),
    animations: buildAnimations(a, frameCounts[a.id]),
    cell: g.cellAuto ? 'auto' : { w: g.cellW, h: g.cellH, padBottom: g.padBottom },
    scale: g.targetHeight ? { kind: 'targetHeight', px: g.targetHeight, relative: a.relative, ...(a.heightRef === 'tallest' ? { reference: 'tallest' as const } : {}) } : { kind: 'native' },
    maxColors: reduce > 0 ? reduce : undefined,
    anchorX: g.anchorX,
    ...(a.anchor === 'center' ? { anchor: 'center' as const } : {}),
    ...(palette ? { palette } : {}),
    ...(a.kind === 'sheet' && Object.keys(a.frameOffsets).length ? { frameOffsets: a.frameOffsets } : {}),
    ...(Object.keys(a.colorMap).length ? { colorMap: a.colorMap } : {}),
  }));
  return { jobs, assetIds: assets.map((a) => a.id) };
}

/** Stable string of everything that influences the output (no pixel data, no names: renaming never re-runs). */
export function jobsSignature(b: JobBundle): string {
  return JSON.stringify(
    b.jobs.map(({ source, name: _name, ...rest }, i) => ({ id: b.assetIds[i], w: source.width, h: source.height, ...rest })),
  );
}
