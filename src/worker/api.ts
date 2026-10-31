// Contract between the UI and the processing worker (exposed with Comlink).
import type { ExportTarget, RGBAImage, SpriteJob, SpriteResult } from '../core/types.ts';

export interface PipelineApi {
  /** Run jobs as one batch (shared scale + palette). Images are transferred, not copied. */
  runBatch(jobs: SpriteJob[]): Promise<SpriteResult[]>;
  /** Build the export ZIP for the given results and engines. */
  buildZip(results: SpriteResult[], targets: ExportTarget[]): Promise<Uint8Array>;
  /** Detect background colour quickly (for the UI swatch). */
  detectBackground(img: RGBAImage): Promise<{ color: [number, number, number, number]; confidence: number }>;
}
