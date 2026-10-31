// Crop each frame region WITHOUT pixels that belong to neighbouring frames.
// AI sheets often have frames whose bboxes overlap by a few px (a foot reaching into the next frame), and grid
// cells can cut through a sprite. A plain rectangle crop would then copy bits of the neighbour into the frame.
import { crop } from '../image.ts';
import type { FrameRegion, RGBAImage } from '../types.ts';
import { labelComponents } from './index.ts';

const OPAQUE = 128;
/** Semi-transparent pixels (antialiasing, halos) are kept when an owned opaque pixel is within this radius. */
const SOFT_RADIUS = 2;

/**
 * Returns one crop per region (rect padded by `pad` px). Each opaque connected component is owned by the region
 * whose rect covers most of the component's bbox; a region's crop keeps only its own components, plus
 * semi-transparent pixels next to them.
 */
export function isolateRegions(img: RGBAImage, regions: FrameRegion[], pad = 0): RGBAImage[] {
  if (regions.length <= 1) return regions.map((r) => crop(img, padRect(r.rect, pad)));
  const { comps, map } = labelComponents(img);
  const owner = comps.map((c) => {
    let best = -1, bestA = 0;
    regions.forEach((r, i) => {
      const ix = Math.min(c.x1 + 1, r.rect.x + r.rect.w) - Math.max(c.x0, r.rect.x);
      const iy = Math.min(c.y1 + 1, r.rect.y + r.rect.h) - Math.max(c.y0, r.rect.y);
      const a = ix > 0 && iy > 0 ? ix * iy : 0;
      if (a > bestA) {
        bestA = a;
        best = i;
      }
    });
    return best;
  });
  const W = img.width, H = img.height;
  const ownerAt = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return -1;
    const k = map[y * W + x];
    return k < 0 ? -1 : owner[k];
  };
  return regions.map((r, i) => {
    const rect = padRect(r.rect, pad);
    const out = crop(img, rect);
    for (let y = 0; y < rect.h; y++) {
      const sy = rect.y + y;
      for (let x = 0; x < rect.w; x++) {
        const o = (y * rect.w + x) * 4;
        const a = out.data[o + 3];
        if (!a) continue;
        const sx = rect.x + x;
        let keep: boolean;
        if (a >= OPAQUE) keep = ownerAt(sx, sy) === i;
        else {
          keep = false;
          for (let dy = -SOFT_RADIUS; dy <= SOFT_RADIUS && !keep; dy++)
            for (let dx = -SOFT_RADIUS; dx <= SOFT_RADIUS; dx++)
              if (ownerAt(sx + dx, sy + dy) === i) {
                keep = true;
                break;
              }
        }
        if (!keep) out.data[o] = out.data[o + 1] = out.data[o + 2] = out.data[o + 3] = 0;
      }
    }
    return out;
  });
}

function padRect(r: { x: number; y: number; w: number; h: number }, pad: number) {
  return { x: r.x - pad, y: r.y - pad, w: r.w + 2 * pad, h: r.h + 2 * pad };
}
