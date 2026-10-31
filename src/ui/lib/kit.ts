// Helpers of the Kit tab.
import { crop } from '../../core/image.ts';
import type { RGBAImage } from '../../core/types.ts';

/** The first few non-empty tiles of an atlas, as separate images. */
export function atlasTiles(atlas: RGBAImage, tileSize: number, list: { col: number; row: number; empty: boolean }[], max = 8): RGBAImage[] {
  return list
    .filter((t) => !t.empty)
    .slice(0, max)
    .map((t) => crop(atlas, { x: t.col * tileSize, y: t.row * tileSize, w: tileSize, h: tileSize }));
}
