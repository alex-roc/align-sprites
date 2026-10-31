// Pack normalized frames into a fixed-cell sheet, feet-anchored.
import type { AnimSpec, CellSpec, FrameMetrics, PackedSheet, RGBAImage, ArtMode, Warning } from '../types.ts';

/** Cell presets (px). Width and height are chosen independently. */
export const CELL_PRESETS = [16, 32, 48, 64, 96, 128, 160, 192, 256];

/**
 * Smallest cell (each axis a multiple of `step`, default 32) that fits every frame when anchored:
 * width must fit max(anchorX - bbox.x, bbox.x+bbox.w - anchorX)·2; height must fit max(footY - bbox.y + 1) + padBottom.
 */
export function suggestCell(frames: RGBAImage[], metrics: FrameMetrics[], padBottom = 0, step = 32): { w: number; h: number } {
  void frames; void metrics; void padBottom; void step;
  throw new Error('not implemented');
}

/**
 * One row per animation, cols = max frames in any animation. Each frame is pasted so that its anchorX lands
 * on floor(cell.w/2) and its footY on cell.h - 1 - padBottom (integer px). Content outside the cell is
 * clipped and reported as a warning {key:'warn.clipped', params:{frame, px}}.
 * anims: frame indices refer to `frames`. Returns the sheet plus each cell-sized frame in sheet order.
 */
export function packFrames(
  frames: RGBAImage[],
  metrics: FrameMetrics[],
  cell: CellSpec,
  anims: AnimSpec[],
  mode: ArtMode,
): { sheet: PackedSheet; cells: RGBAImage[]; warnings: Warning[] } {
  void frames; void metrics; void cell; void anims; void mode;
  throw new Error('not implemented');
}
