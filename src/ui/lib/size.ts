import { SPRITE_HEIGHTS } from '../persist.ts';

/** The preset closest to `px` (in ratio, so 41 is nearer to 32 than to 64). */
export function nearestHeight(px: number): number {
  return SPRITE_HEIGHTS.reduce((best, p) => (Math.abs(Math.log(p / px)) < Math.abs(Math.log(best / px)) ? p : best));
}
