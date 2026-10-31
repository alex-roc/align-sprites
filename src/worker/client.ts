// Main-thread side of the worker: a typed Comlink proxy plus helpers that transfer pixel buffers.
import * as Comlink from 'comlink';
import type { TileAtlasOptions, TileAtlasResult } from '../core/tiles/index.ts';
import type { Inspection } from '../core/inspect/index.ts';
import type { ExportOptions } from '../core/export/index.ts';
import type { KitInput } from '../core/kit/index.ts';
import type { ArtMode, EdgeStyle, ExportTarget, RGBA8, RGBAImage, SpriteJob, SpriteResult, TileLayout, TileSetResult } from '../core/types.ts';
import type { AtlasExportTargets, PipelineApi, TerrainOutput, TileAtlasOutput } from './api.ts';

const worker = new Worker(new URL('./pipeline.worker.ts', import.meta.url), { type: 'module' });

export const pipeline = Comlink.wrap<PipelineApi>(worker);

/** Run a batch. Source pixels are copied first (the UI keeps its originals) and the copies are transferred. */
export function runBatch(jobs: SpriteJob[]): Promise<SpriteResult[]> {
  const copies = jobs.map<SpriteJob>((j) => ({ ...j, source: { ...j.source, data: j.source.data.slice() } }));
  const buffers = copies.map((j) => j.source.data.buffer as ArrayBuffer);
  return pipeline.runBatch(Comlink.transfer(copies, buffers));
}

export function buildZip(results: SpriteResult[], targets: ExportTarget[], opts?: ExportOptions): Promise<Uint8Array> {
  return pipeline.buildZip(results, targets, opts);
}

/** Copy of an image whose buffer can be transferred without detaching the UI's original. */
const copyImage = (img: RGBAImage): RGBAImage => ({ ...img, data: img.data.slice() });
const bufferOf = (img: RGBAImage): ArrayBuffer => img.data.buffer as ArrayBuffer;

/** Inspect an uploaded image in the worker (rejects when the core cannot; callers fall back to defaults). */
export function inspectImage(img: RGBAImage, mode: ArtMode): Promise<Inspection> {
  const c = copyImage(img);
  return pipeline.inspect(Comlink.transfer(c, [bufferOf(c)]), mode);
}

export function paletteFromImage(img: RGBAImage, max: number): Promise<RGBA8[]> {
  const c = copyImage(img);
  return pipeline.paletteFromImage(Comlink.transfer(c, [bufferOf(c)]), max);
}

/** Frames are cloned (not transferred): the UI keeps showing them. */
export function findDuplicates(frames: RGBAImage[]): Promise<number[][]> {
  return pipeline.findDuplicates(frames);
}

export function buildKitZip(kit: KitInput, target: ExportTarget): Promise<Uint8Array> {
  return pipeline.buildKitZip(kit, target);
}

export function normalizeTiles(img: RGBAImage, o: TileAtlasOptions, palette?: RGBA8[]): Promise<TileAtlasOutput> {
  const c = copyImage(img);
  return pipeline.normalizeTiles(Comlink.transfer(c, [bufferOf(c)]), o, palette);
}

export function buildAtlasZip(result: TileAtlasResult, name: string, targets: AtlasExportTargets): Promise<Uint8Array> {
  return pipeline.buildAtlasZip(result, name, targets);
}

export function composeTerrain(a: RGBAImage, b: RGBAImage | null, tileSize: number, layout: TileLayout, style: EdgeStyle, mode: ArtMode, palette?: RGBA8[]): Promise<TerrainOutput> {
  const ca = copyImage(a);
  const cb = b ? copyImage(b) : null;
  return pipeline.composeTerrain(Comlink.transfer(ca, [bufferOf(ca)]), cb ? Comlink.transfer(cb, [bufferOf(cb)]) : null, tileSize, layout, style, mode, palette);
}

export function renderTerrainPreview(cells: Uint8Array, w: number, h: number): Promise<RGBAImage> {
  return pipeline.renderTerrainPreview(cells, w, h);
}

export function buildTerrainZip(set: TileSetResult, name: string, names: [string, string]): Promise<Uint8Array> {
  return pipeline.buildTerrainZip(set, name, names);
}
