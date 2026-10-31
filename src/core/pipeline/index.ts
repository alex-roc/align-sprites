// Orchestrates bg → segment → pixel grid → scale → measure → pack. Implemented in T8.
import type { UnfakeCore } from '../pixel/unfake.ts';
import type { SpriteJob, SpriteResult } from '../types.ts';

/** Process one job. `core` is required in pixel mode. */
export function runSpriteJob(core: UnfakeCore | null, job: SpriteJob): SpriteResult {
  void core; void job;
  throw new Error('not implemented');
}

/** Process several jobs with a shared target height and (pixel mode) a shared palette. */
export function runBatch(core: UnfakeCore | null, jobs: SpriteJob[]): SpriteResult[] {
  void core; void jobs;
  throw new Error('not implemented');
}
