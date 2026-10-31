// Maps UI settings → SpriteJob[]. GLOBAL settings (mode, cell, height, colours, padding, anchor) are applied to every
// job, which is what keeps characters of one batch at the same scale; PER-ASSET settings (background, segmentation,
// animations, relative size) only affect their own job.
import type { AnimSpec, BgOptions, Segmentation, SpriteJob } from '../../core/types.ts';
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

function buildSegmentation(a: Asset): Segmentation {
  if (a.kind === 'single' || a.seg.mode === 'single') return { kind: 'single' };
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
    out.push({ name: d.name.trim() || 'anim', frames, fps: Math.max(1, d.fps), loop: d.loop });
  }
  return out;
}

export function buildJobs(assets: Asset[], g: GlobalSettings, frameCounts: Record<string, number>): JobBundle {
  const names = exportNames(assets);
  const jobs = assets.map<SpriteJob>((a) => ({
    name: names.get(a.id) ?? a.name,
    source: a.image,
    mode: g.mode,
    bg: buildBg(a, g),
    segmentation: buildSegmentation(a),
    animations: buildAnimations(a, frameCounts[a.id]),
    cell: g.cellAuto ? 'auto' : { w: g.cellW, h: g.cellH, padBottom: g.padBottom },
    scale: g.targetHeight ? { kind: 'targetHeight', px: g.targetHeight, relative: a.relative } : { kind: 'native' },
    maxColors: g.mode === 'pixel' && g.maxColors > 0 ? g.maxColors : undefined,
    anchorX: g.anchorX,
  }));
  return { jobs, assetIds: assets.map((a) => a.id) };
}

/** Stable string of everything that influences the output (no pixel data, no names: renaming never re-runs). */
export function jobsSignature(b: JobBundle): string {
  return JSON.stringify(
    b.jobs.map(({ source, name: _name, ...rest }, i) => ({ id: b.assetIds[i], w: source.width, h: source.height, ...rest })),
  );
}
