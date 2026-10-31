// Main-thread side of the worker: a typed Comlink proxy plus helpers that transfer pixel buffers.
import * as Comlink from 'comlink';
import type { ExportTarget, SpriteJob, SpriteResult } from '../core/types.ts';
import type { PipelineApi } from './api.ts';

const worker = new Worker(new URL('./pipeline.worker.ts', import.meta.url), { type: 'module' });

export const pipeline = Comlink.wrap<PipelineApi>(worker);

/** Run a batch. Source pixels are copied first (the UI keeps its originals) and the copies are transferred. */
export function runBatch(jobs: SpriteJob[]): Promise<SpriteResult[]> {
  const copies = jobs.map<SpriteJob>((j) => ({ ...j, source: { ...j.source, data: j.source.data.slice() } }));
  const buffers = copies.map((j) => j.source.data.buffer as ArrayBuffer);
  return pipeline.runBatch(Comlink.transfer(copies, buffers));
}

export function buildZip(results: SpriteResult[], targets: ExportTarget[]): Promise<Uint8Array> {
  return pipeline.buildZip(results, targets);
}
