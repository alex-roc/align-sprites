// Frame-box geometry for the "Edit boxes" mode of the Original view.
import type { Rect } from '../../core/types.ts';

export type Handle = 'move' | 'nw' | 'ne' | 'sw' | 'se';
const MIN = 4;

/** Moves or resizes `r` by (dx, dy) image px, keeping it inside the image and at least MIN px big. */
export function dragRect(r: Rect, handle: Handle, dx: number, dy: number, W: number, H: number): Rect {
  let { x, y } = r;
  const { w, h } = r;
  if (handle === 'move') {
    x = Math.min(W - w, Math.max(0, x + dx));
    y = Math.min(H - h, Math.max(0, y + dy));
    return { x: Math.round(x), y: Math.round(y), w, h };
  }
  let x1 = x + w, y1 = y + h;
  if (handle === 'nw' || handle === 'sw') x = Math.min(x1 - MIN, Math.max(0, x + dx));
  else x1 = Math.max(x + MIN, Math.min(W, x1 + dx));
  if (handle === 'nw' || handle === 'ne') y = Math.min(y1 - MIN, Math.max(0, y + dy));
  else y1 = Math.max(y + MIN, Math.min(H, y1 + dy));
  return { x: Math.round(x), y: Math.round(y), w: Math.round(x1 - x), h: Math.round(y1 - y) };
}
