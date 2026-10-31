// Frame-level helpers for the frame editor.
import type { RGBAImage } from '../types.ts';

/**
 * Groups of near-identical frames (indices, ascending; only groups of 2+). Frames are compared as packed
 * cells of equal size: share of differing opaque pixels (alpha or RGB distance > 24) must be <= `tolerance`.
 */
export function findDuplicateFrames(frames: RGBAImage[], tolerance = 0.02): number[][] {
  void frames; void tolerance;
  throw new Error('not implemented');
}

/** Horizontal mirror of a cell around column floor(w/2) (keeps the anchor column in place). */
export function flipCellX(cell: RGBAImage): RGBAImage {
  void cell;
  throw new Error('not implemented');
}
