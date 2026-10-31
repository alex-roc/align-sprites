// Per-frame measurements used for alignment and scale.
import type { AnchorXMethod, FrameMetrics, RGBAImage } from '../types.ts';

export interface MeasureOptions {
  /** Opaque threshold (default 128). */
  alphaMin?: number;
  /** A row counts as "ground" if it has at least this many opaque px (default 2). */
  minRowPx?: number;
  anchorX?: AnchorXMethod;
}

/**
 * bbox of opaque px; footY = last row with >= minRowPx opaque px (ignores 1-px specks/shadows);
 * anchorX:
 *  - 'medianColumn' (default): weighted median of the per-column opaque-pixel count (robust to arms/weapons),
 *  - 'centroid': mean x of opaque px,
 *  - 'bboxCenter': bbox.x + bbox.w/2.
 * Fully transparent image → bbox {0,0,0,0}, footY = height-1, anchorX = width/2.
 */
export function measureFrame(img: RGBAImage, o: MeasureOptions = {}): FrameMetrics {
  void img; void o;
  throw new Error('not implemented');
}

/** Reference character height: median (default) or 90th percentile of bbox heights. Ignores empty frames. */
export function referenceHeight(ms: FrameMetrics[], stat: 'median' | 'p90' = 'median'): number {
  void ms; void stat;
  throw new Error('not implemented');
}
