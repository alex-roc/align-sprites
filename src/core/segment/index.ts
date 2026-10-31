// Frame segmentation on an image whose background is already transparent.
import type { FrameRegion, RGBAImage } from '../types.ts';

/**
 * Split into rows×cols equal cells. If snapGutters (default true), each cut line moves to the nearest
 * fully-transparent column/row (alpha profile) within ±25% of the cell size, so sprites that overflow the
 * nominal cell are not cut. Returned rects are the cells (not tight bboxes), in reading order.
 * Cells that are fully transparent are omitted.
 */
export function sliceGrid(img: RGBAImage, rows: number, cols: number, snapGutters = true): FrameRegion[] {
  void img; void rows; void cols; void snapGutters;
  throw new Error('not implemented');
}

export interface FindFramesOptions {
  /** Ignore components smaller than this fraction of the largest component's area (default 0.01). */
  minAreaRatio?: number;
  /** Merge components whose bboxes are within this many px (default: 2% of image min side). */
  mergeDist?: number;
  /** Expected frame count, if known (used only for a warning upstream; never forces a split). */
  expected?: number;
}

/**
 * Auto-detect frames: 8-connected components on alpha>0, drop specks, merge components that are close
 * (bbox distance <= mergeDist) or overlap horizontally > 50% of the narrower one (detached weapons/effects,
 * hair), then order in reading order: group into rows by vertical overlap, sort rows top→bottom and items
 * left→right. rect = tight bbox of the merged component. row/col = position in that ordering.
 */
export function findFrames(img: RGBAImage, o: FindFramesOptions = {}): FrameRegion[] {
  void img; void o;
  throw new Error('not implemented');
}
