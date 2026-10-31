// Automatic collision box of a packed sheet, in cell coordinates.
import { measureFrame } from './index.ts';
import type { Rect, RGBAImage, SpriteAnchor } from '../types.ts';

/** Opaque threshold, as in measureFrame. */
const OPAQUE = 128;
/** Feet boxes cover the central share of the body's alpha mass: from this quantile to its mirror (1 - q). */
const BODY_QUANTILE = 0.1;
/** Centre boxes are the median bbox shrunk by this factor: a hit on a spark's tip should not count. */
const CENTER_SHRINK = 0.9;

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Columns of the central share of the alpha mass of `img`: [q, 1-q] weighted quantiles of the column counts. */
function bodySpan(img: RGBAImage, q: number): { left: number; right: number } | null {
  const { width: W, height: H, data } = img;
  const cols = new Int32Array(W);
  let total = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (data[(y * W + x) * 4 + 3] >= OPAQUE) {
        cols[x]++;
        total++;
      }
  if (!total) return null;
  let left = -1, right = -1, acc = 0;
  for (let x = 0; x < W; x++) {
    acc += cols[x]!;
    if (left < 0 && acc >= total * q) left = x;
    if (right < 0 && acc >= total * (1 - q)) right = x;
  }
  return { left, right };
}

/**
 * Collision box (cell px) from the packed cells of the first animation (empty frames are skipped).
 *  - feet: the bottom edge is the bottom of the feet row (`footRow + 1`), the height is `refHeight` (the reference
 *    character height), the width is the body: left and right edge are the 10 % and 90 % quantiles of each frame's
 *    column histogram (a sword, a cape or an arm held out carry little mass and fall outside), median over frames.
 *  - center: the median bbox of the frames, shrunk to 90 %, centred on the cell centre (the origin of centred sprites).
 * Returns undefined when nothing is opaque.
 */
export function collisionBox(
  cells: RGBAImage[],
  anchor: SpriteAnchor,
  cell: { w: number; h: number },
  padBottom: number,
  refHeight: number,
): Rect | undefined {
  if (anchor === 'center') {
    const bbs = cells.map((c) => measureFrame(c).bbox).filter((b) => b.w > 0 && b.h > 0);
    if (!bbs.length) return undefined;
    const w = Math.max(1, median(bbs.map((b) => b.w)) * CENTER_SHRINK);
    const h = Math.max(1, median(bbs.map((b) => b.h)) * CENTER_SHRINK);
    return { x: cell.w / 2 - w / 2, y: cell.h / 2 - h / 2, w, h };
  }
  const spans = cells.map((c) => bodySpan(c, BODY_QUANTILE)).filter((s): s is { left: number; right: number } => s !== null);
  if (!spans.length) return undefined;
  const left = Math.round(median(spans.map((s) => s.left)));
  const right = Math.round(median(spans.map((s) => s.right)));
  const bottom = cell.h - padBottom;
  const h = Math.max(1, Math.min(bottom, Math.round(refHeight)));
  return { x: left, y: bottom - h, w: Math.max(1, right - left + 1), h };
}
