// Orchestrates bg → segment → pixel grid → scale → measure → pack (see dev-docs/architecture.md).
import { removeBackground } from '../bg/index.ts';
import { alphaBBox, crop } from '../image.ts';
import { measureFrame, referenceHeight } from '../measure/index.ts';
import { packFrames, placementMetrics, suggestCell } from '../pack/index.ts';
import { applyColorMap, remapToPalette } from '../palette/index.ts';
import { frameToArt, sharedPalette } from '../pixel/index.ts';
import type { UnfakeCore } from '../pixel/unfake.ts';
import { resampleScale } from '../resample/index.ts';
import { findFrames, sliceGrid } from '../segment/index.ts';
import { isolateRegions } from '../segment/isolate.ts';
import type {
  AnimSpec,
  CellSpec,
  FrameMetrics,
  FrameRegion,
  PixelGrid,
  RGBA8,
  RGBAImage,
  SpriteJob,
  SpriteResult,
  Warning,
} from '../types.ts';

/** A target height is met when the reference (median) height is within half a pixel. */
const HEIGHT_EPS = 0.5;
/** Period corrections allowed to hit the target height exactly (each re-samples the original crops). */
const HEIGHT_PASSES = 4;

/** Result of the per-job normalization, before packing. */
export interface NormalizedJob {
  job: SpriteJob;
  frames: RGBAImage[];
  metrics: FrameMetrics[];
  anims: AnimSpec[];
  regions: FrameRegion[];
  grid?: PixelGrid;
  scale: number;
  refHeight: number;
  warnings: Warning[];
}

function segment(clean: RGBAImage, job: SpriteJob, warnings: Warning[]): FrameRegion[] {
  const s = job.segmentation;
  switch (s.kind) {
    case 'grid':
      return sliceGrid(clean, s.rows, s.cols);
    case 'auto': {
      const r = findFrames(clean, { expected: s.expected });
      if (s.expected && r.length !== s.expected) warnings.push({ key: 'warn.frameCount', params: { found: r.length, expected: s.expected } });
      return r;
    }
    case 'manual':
      return s.regions;
    case 'single': {
      const bb = alphaBBox(clean, 128);
      return bb ? [{ rect: bb, row: 0, col: 0 }] : [];
    }
  }
}

/** Animations with valid frame indices; empty → one "default" animation with every frame. */
function resolveAnims(anims: AnimSpec[], count: number, warnings: Warning[]): AnimSpec[] {
  if (!anims.length) return [{ name: 'default', frames: [...Array(count).keys()], fps: 8, loop: true }];
  const out: AnimSpec[] = [];
  for (const a of anims) {
    const frames = a.frames.filter((i) => i >= 0 && i < count);
    if (frames.length !== a.frames.length) warnings.push({ key: 'warn.animRange', params: { anim: a.name, count } });
    if (frames.length) out.push({ ...a, frames });
  }
  return out.length ? out : [{ name: 'default', frames: [...Array(count).keys()], fps: 8, loop: true }];
}

function desiredHeight(job: SpriteJob): number | null {
  return job.scale.kind === 'targetHeight' ? Math.max(1, Math.round(job.scale.px * (job.scale.relative ?? 1))) : null;
}

/** Steps 1-6 of the pipeline for one job: returns normalized (unpacked) frames. */
export function normalizeJob(core: UnfakeCore | null, job: SpriteJob): NormalizedJob {
  const warnings: Warning[] = [];
  const clean = removeBackground(job.source, job.bg, job.mode);
  const regions = segment(clean, job, warnings);
  if (!regions.length) {
    warnings.push({ key: 'warn.noFrames' });
    return { job, frames: [], metrics: [], anims: [], regions, scale: 1, refHeight: 0, warnings };
  }
  const anims = resolveAnims(job.animations, regions.length, warnings);
  const refIdx = anims[0].frames;
  const want = desiredHeight(job);

  if (job.mode === 'pixel') {
    if (!core) throw new Error('Pixel mode needs the unfake core');
    let grid: PixelGrid | undefined;
    let period = job.manualPeriod ?? 0;
    if (!period) {
      const g = core.detectGrid(job.source);
      if (g) {
        grid = g;
        period = (g.periodX + g.periodY) / 2;
      } else {
        period = 1;
        const maxH = Math.max(...regions.map((r) => r.rect.h));
        if (maxH > 128) warnings.push({ key: 'warn.noGrid' });
      }
    } else {
      grid = { periodX: period, periodY: period, offsetX: 0, offsetY: 0 };
    }
    const pad = Math.ceil(period) * 2;
    const crops = isolateRegions(clean, regions, pad);
    let frames = crops.map((c) => frameToArt(core, c, period));
    let metrics = frames.map((f) => measureFrame(f, { anchorX: job.anchorX }));
    let refHeight = referenceHeight(refIdx.map((i) => metrics[i]));
    let effPeriod = period;
    if (want && refHeight > 0 && Math.abs(refHeight - want) > HEIGHT_EPS) {
      if (want < refHeight * 0.85) warnings.push({ key: 'warn.bigDownscale', params: { from: refHeight, to: want } });
      // Re-sample from the ORIGINAL crops (never scale twice). The grid phase and the feet row make the result
      // land ±1 px off, so correct the period a couple of times until the reference height is exact.
      for (let pass = 0; pass < HEIGHT_PASSES && Math.abs(refHeight - want) > HEIGHT_EPS; pass++) {
        effPeriod = (effPeriod * refHeight) / want;
        frames = crops.map((c) => frameToArt(core, c, effPeriod, effPeriod < period ? 'nearest' : 'dominant'));
        metrics = frames.map((f) => measureFrame(f, { anchorX: job.anchorX }));
        refHeight = referenceHeight(refIdx.map((i) => metrics[i]));
      }
      if (effPeriod < 1) warnings.push({ key: 'warn.upscale', params: { from: refHeight, to: want } });
    }
    return { job, frames, metrics, anims, regions, grid, scale: 1 / effPeriod, refHeight, warnings };
  }

  // Cartoon: one shared scale factor from the reference height in source px.
  const crops = isolateRegions(clean, regions, 2);
  const srcMetrics = crops.map((c) => measureFrame(c, { anchorX: job.anchorX }));
  const srcRef = referenceHeight(refIdx.map((i) => srcMetrics[i]));
  const s = want && srcRef > 0 ? want / srcRef : 1;
  const frames = s === 1 ? crops : crops.map((c) => resampleScale(c, s));
  const metrics = frames.map((f) => measureFrame(f, { anchorX: job.anchorX }));
  return { job, frames, metrics, anims, regions, scale: s, refHeight: referenceHeight(refIdx.map((i) => metrics[i])), warnings };
}

/** Pack a normalized job into its sheet. */
export function packJob(n: NormalizedJob, cell: CellSpec, palette?: RGBA8[]): SpriteResult {
  const { sheet, cells, warnings } = packFrames(n.frames, n.metrics, cell, n.anims, n.job.mode, { offsets: n.job.frameOffsets });
  return {
    name: n.job.name,
    sheet,
    frames: cells,
    diag: {
      grid: n.grid,
      scale: n.scale,
      refHeight: n.refHeight,
      metrics: n.metrics,
      regions: n.regions,
      palette,
      warnings: [...n.warnings, ...warnings],
    },
  };
}

function cellFor(norms: NormalizedJob[], requested: CellSpec | 'auto'): CellSpec {
  if (requested !== 'auto') return requested;
  let w = 32, h = 32;
  for (const n of norms) {
    if (!n.frames.length) continue;
    // Size for the placements actually made (mirrored animations, nudged frames).
    const p = placementMetrics(n.frames, n.metrics, n.anims, n.job.frameOffsets);
    const c = suggestCell(p.frames, p.metrics, 0);
    w = Math.max(w, c.w);
    h = Math.max(h, c.h);
  }
  return { w, h, padBottom: 0 };
}

/** Process one job. `core` is required in pixel mode. */
export function runSpriteJob(core: UnfakeCore | null, job: SpriteJob): SpriteResult {
  return runBatch(core, [job])[0];
}

/**
 * Process several jobs as one batch: each job keeps its own scale policy (the UI gives them the same target
 * height), cell 'auto' is resolved to ONE cell that fits every job, and pixel jobs share one palette.
 */
export function runBatch(core: UnfakeCore | null, jobs: SpriteJob[]): SpriteResult[] {
  const norms = jobs.map((j) => normalizeJob(core, j));

  // Palettes (pixel jobs only; cartoon art is antialiased and a palette would posterize its edges, so a
  // cartoon job ignores `palette` and `maxColors`).
  //  - job.palette (fixed): wins over maxColors; each frame is remapped to the nearest colour, no dithering.
  //  - job.maxColors (no fixed palette): ONE palette quantized from every such job, shared across them.
  const paletteOf = new Map<NormalizedJob, RGBA8[]>();
  for (const n of norms) {
    if (n.job.mode === 'pixel' && n.job.palette?.length) {
      n.frames = remapToPalette(n.frames, n.job.palette);
      paletteOf.set(n, n.job.palette);
    }
  }
  const quantJobs = norms.filter((n) => n.job.mode === 'pixel' && !n.job.palette?.length && (n.job.maxColors ?? 0) > 0);
  const maxColors = Math.max(0, ...quantJobs.map((n) => n.job.maxColors ?? 0));
  if (core && maxColors > 0) {
    const idx: [number, number][] = [];
    const imgs: RGBAImage[] = [];
    norms.forEach((n, ni) => {
      if (!quantJobs.includes(n)) return;
      n.frames.forEach((f, fi) => {
        idx.push([ni, fi]);
        imgs.push(f);
      });
    });
    if (imgs.length) {
      const q = sharedPalette(core, imgs, maxColors);
      q.images.forEach((im, k) => {
        const [ni, fi] = idx[k];
        norms[ni].frames[fi] = im;
      });
      for (const n of quantJobs) paletteOf.set(n, q.palette);
    }
  }

  // Colour swap last (palette variants). diag.palette then lists the colours the output really uses.
  for (const n of norms) {
    const map = n.job.colorMap;
    if (!map || !Object.keys(map).length) continue;
    n.frames = n.frames.map((f) => applyColorMap(f, map));
    const pal = paletteOf.get(n);
    if (pal) paletteOf.set(n, pal.map((c) => Array.from(applyColorMap({ width: 1, height: 1, data: new Uint8ClampedArray(c) }, map).data) as RGBA8));
  }

  // One cell for the whole batch when 'auto' (each job's explicit cell otherwise).
  const autoCell = cellFor(norms.filter((n) => n.job.cell === 'auto'), 'auto');
  return norms.map((n) => {
    const cell = n.job.cell === 'auto' ? autoCell : n.job.cell;
    if (!n.frames.length) {
      return {
        name: n.job.name,
        sheet: { image: { width: 0, height: 0, data: new Uint8ClampedArray(0) }, cell: { w: cell.w, h: cell.h }, cols: 0, rows: 0, padBottom: cell.padBottom, anims: [], mode: n.job.mode },
        frames: [],
        diag: { scale: n.scale, refHeight: 0, metrics: [], regions: n.regions, warnings: n.warnings },
      };
    }
    return packJob(n, cell, paletteOf.get(n));
  });
}

/** Cheap crop helper re-exported for the UI (preview of a region). */
export { crop };
