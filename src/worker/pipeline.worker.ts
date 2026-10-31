// Comlink worker implementing PipelineApi: heavy processing stays off the UI thread.
import * as Comlink from 'comlink';
import { detectBackground } from '../core/bg/index.ts';
import { buildExport, zipFiles } from '../core/export/index.ts';
import { runBatch } from '../core/pipeline/index.ts';
import { unfakeFromUrl, type UnfakeCore } from '../core/pixel/unfake.ts';
import type { SpriteResult } from '../core/types.ts';
import wasmUrl from '../vendor/unfake/unfake_wasm_bg.wasm?url';
import type { PipelineApi } from './api.ts';

let corePromise: Promise<UnfakeCore> | null = null;

/** Load the unfake WASM once; a failed load can be retried. */
function getCore(): Promise<UnfakeCore> {
  corePromise ??= unfakeFromUrl(wasmUrl).catch((e: unknown) => {
    corePromise = null;
    throw e;
  });
  return corePromise;
}

/** Every distinct pixel buffer of the results, so they are transferred instead of copied. */
function resultBuffers(results: SpriteResult[]): ArrayBuffer[] {
  const set = new Set<ArrayBuffer>();
  for (const r of results) {
    set.add(r.sheet.image.data.buffer as ArrayBuffer);
    for (const f of r.frames) set.add(f.data.buffer as ArrayBuffer);
  }
  return [...set];
}

const api: PipelineApi = {
  async runBatch(jobs) {
    const core = jobs.some((j) => j.mode === 'pixel') ? await getCore() : null;
    const results = runBatch(core, jobs);
    return Comlink.transfer(results, resultBuffers(results));
  },
  async buildZip(results, targets) {
    const zip = zipFiles(buildExport(results, targets));
    return Comlink.transfer(zip, [zip.buffer as ArrayBuffer]);
  },
  async detectBackground(img) {
    return detectBackground(img);
  },
};

Comlink.expose(api);
