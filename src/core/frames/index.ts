// Frame-level helpers for the frame editor.
import { createImage } from '../image.ts';
import type { RGBAImage } from '../types.ts';

/** A pixel counts as present at this alpha (same threshold as the rest of the core). */
const OPAQUE = 128;
/** Channel (or alpha) difference above which two pixels count as different. */
const PIXEL_DIFF = 24;

/**
 * Default `findDuplicateFrames` tolerance. Measured on the Codex samples (packed cells, `frameDifference`):
 *  - fox-run-cartoon (height 96, cell 192×128): the repeated poses 0/3, 1/4, 2/5 differ by 0.372, 0.293, 0.362
 *    (re-drawn by the model, a few px off); every other pair is >= 0.639 (consecutive: 0.64-0.77).
 *  - knight-walk-pixel (height 32, cell 32×32): consecutive frames differ by 0.81-0.89; the "swap" pairs 0/3, 1/4,
 *    2/5 by 0.670, 0.657, 0.548 (different legs: NOT duplicates).
 *  - slime-idle-cartoon: subtle breathing differs by 0.16-0.50, so some idle frames are flagged (the UI only
 *    offers removing them).
 * 0.45 sits in the gap between the fox repeats (<= 0.372) and the nearest real poses (>= 0.548).
 */
export const DUPLICATE_TOLERANCE = 0.45;

/**
 * Share (0..1) of differing pixels between two same-size images, over the pixels that are opaque in at least one
 * of them. A pixel differs when its alpha differs by more than 24, or when both are opaque and any RGB channel
 * differs by more than 24. Two empty images have difference 0; images of different size, 1.
 */
export function frameDifference(a: RGBAImage, b: RGBAImage): number {
  if (a.width !== b.width || a.height !== b.height) return 1;
  const A = a.data, B = b.data;
  let diff = 0, total = 0;
  for (let i = 0; i < A.length; i += 4) {
    const ao = A[i + 3] >= OPAQUE, bo = B[i + 3] >= OPAQUE;
    if (!ao && !bo) continue;
    total++;
    if (ao !== bo || Math.abs(A[i + 3] - B[i + 3]) > PIXEL_DIFF) {
      diff++;
    } else if (Math.abs(A[i] - B[i]) > PIXEL_DIFF || Math.abs(A[i + 1] - B[i + 1]) > PIXEL_DIFF || Math.abs(A[i + 2] - B[i + 2]) > PIXEL_DIFF) {
      diff++;
    }
  }
  return total ? diff / total : 0;
}

/**
 * Groups of near-identical frames (indices, ascending; only groups of 2+). Frames are compared as packed
 * cells of equal size: share of differing opaque pixels (alpha or RGB distance > 24) must be <= `tolerance`.
 * Each frame is compared with the FIRST frame of every existing group (no chaining: a slow drift never merges
 * the two ends of an animation).
 */
export function findDuplicateFrames(frames: RGBAImage[], tolerance = DUPLICATE_TOLERANCE): number[][] {
  const groups: number[][] = [];
  frames.forEach((f, i) => {
    const g = groups.find((members) => frameDifference(frames[members[0]], f) <= tolerance);
    if (g) g.push(i);
    else groups.push([i]);
  });
  return groups.filter((g) => g.length > 1);
}

/** Horizontal mirror of a cell around column floor(w/2) (keeps the anchor column in place). */
export function flipCellX(cell: RGBAImage): RGBAImage {
  const { width: w, height: h } = cell;
  const out = createImage(w, h);
  const c = Math.floor(w / 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Column x lands on 2c - x; for even widths column 0 would land outside the cell and is dropped.
      const nx = 2 * c - x;
      if (nx < 0 || nx >= w) continue;
      const s = (y * w + x) * 4;
      out.data.set(cell.data.subarray(s, s + 4), (y * w + nx) * 4);
    }
  }
  return out;
}
