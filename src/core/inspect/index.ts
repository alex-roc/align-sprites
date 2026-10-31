// Quick look at an uploaded image: background, sheet or single sprite, frame count, native height.
import type { ArtMode, BgOptions, RGBAImage, SpriteKind } from '../types.ts';

export interface Inspection {
  bg: BgOptions;
  kind: SpriteKind;
  frameCount: number;
  /** Height in source px of the tallest detected frame (for "sprites have different heights" hints). */
  sourceHeight: number;
}

/**
 * Detect the background (autoBgOptions), remove it on a downsampled copy (longest side <= 512 px for speed),
 * run findFrames and decide: 1 frame → 'single', more → 'sheet'.
 */
export function inspectImage(img: RGBAImage, mode: ArtMode): Inspection {
  void img; void mode;
  throw new Error('not implemented');
}
