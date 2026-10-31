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
  const alphaMin = o.alphaMin ?? 128;
  const minRowPx = o.minRowPx ?? 2;
  const method = o.anchorX ?? 'medianColumn';
  const { width: W, height: H, data } = img;

  const colCount = new Int32Array(W);
  const rowCount = new Int32Array(H);
  let x0 = W, x1 = -1, y0 = H, y1 = -1, total = 0, sumX = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] < alphaMin) continue;
      colCount[x]++;
      rowCount[y]++;
      total++;
      sumX += x;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y < y0) y0 = y;
      y1 = y;
    }
  if (!total) return { bbox: { x: 0, y: 0, w: 0, h: 0 }, footY: H - 1, anchorX: W / 2 };

  const bbox = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  let footY = y1; // fallback when no row reaches minRowPx
  for (let y = y1; y >= y0; y--)
    if (rowCount[y] >= minRowPx) {
      footY = y;
      break;
    }

  let anchorX: number;
  if (method === 'bboxCenter') anchorX = bbox.x + bbox.w / 2;
  else if (method === 'centroid') anchorX = sumX / total;
  else {
    let acc = 0;
    anchorX = x1;
    for (let x = x0; x <= x1; x++) {
      acc += colCount[x];
      if (acc * 2 >= total) {
        anchorX = x;
        break;
      }
    }
  }
  return { bbox, footY, anchorX };
}

/** Reference character height: median (default) or 90th percentile of bbox heights. Ignores empty frames. */
export function referenceHeight(ms: FrameMetrics[], stat: 'median' | 'p90' = 'median'): number {
  const hs = ms.map((m) => m.bbox.h).filter((h) => h > 0).sort((a, b) => a - b);
  if (!hs.length) return 0;
  if (stat === 'p90') return hs[Math.max(0, Math.ceil(hs.length * 0.9) - 1)];
  const mid = hs.length >> 1;
  return hs.length % 2 ? hs[mid] : (hs[mid - 1] + hs[mid]) / 2;
}
