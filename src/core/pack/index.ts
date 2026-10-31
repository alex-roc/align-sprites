// Pack normalized frames into a fixed-cell sheet, feet-anchored.
import { blit, createImage, flipImageX } from '../image.ts';
import type { AnimSpec, CellSpec, FrameMetrics, FrameOffset, PackedSheet, RGBAImage, ArtMode, Warning } from '../types.ts';

/** Cell presets (px). Width and height are chosen independently. */
export const CELL_PRESETS = [16, 32, 48, 64, 96, 128, 160, 192, 256];

/** Opaque threshold used to count clipped content. */
const OPAQUE = 128;
/**
 * Clipping this many opaque px or fewer is not reported: footY ignores rows with a single pixel (specks, a
 * toe tip) by design, so those may fall just below the cell.
 */
const CLIP_NOISE_PX = 3;

/**
 * Smallest cell (each axis a multiple of `step`, default 32) that fits every frame when anchored:
 * width must fit max(anchorX - bbox.x, bbox.x+bbox.w - anchorX)·2; height must fit max(footY - bbox.y + 1) + padBottom.
 */
export function suggestCell(frames: RGBAImage[], metrics: FrameMetrics[], padBottom = 0, step = 32): { w: number; h: number } {
  // Extents measured from the anchor column (included on the right side) exactly as packFrames places them.
  let left = 0, right = 0, up = 0;
  const n = Math.min(frames.length, metrics.length);
  for (let i = 0; i < n; i++) {
    const m = metrics[i];
    if (m.bbox.w <= 0 || m.bbox.h <= 0) continue;
    const a = Math.round(m.anchorX);
    left = Math.max(left, a - m.bbox.x);
    right = Math.max(right, m.bbox.x + m.bbox.w - 1 - a);
    up = Math.max(up, m.footY - m.bbox.y + 1);
  }
  // Anchor column is floor(w/2): needs floor(w/2) >= left and ceil(w/2) - 1 >= right.
  const needW = Math.max(2 * left, 2 * right + 2);
  const needH = Math.max(up + padBottom, 1);
  return { w: Math.ceil(needW / step) * step, h: Math.ceil(needH / step) * step };
}

/**
 * The placements `packFrames` will make, as parallel frame/metric lists for `suggestCell`: mirrored animations
 * swap their left/right extents and nudged frames move (anchor and feet shift by the opposite amount).
 */
export function placementMetrics(
  frames: RGBAImage[],
  metrics: FrameMetrics[],
  anims: AnimSpec[],
  offsets?: Record<number, FrameOffset>,
): { frames: RGBAImage[]; metrics: FrameMetrics[] } {
  const outF: RGBAImage[] = [];
  const outM: FrameMetrics[] = [];
  for (const a of anims) {
    for (const fi of a.frames) {
      const f = frames[fi], m = metrics[fi];
      if (!f || !m) continue;
      const off = offsets?.[fi];
      const dx = Math.round(off?.dx ?? 0), dy = Math.round(off?.dy ?? 0);
      const anchorX = a.flipX ? f.width - 1 - Math.round(m.anchorX) : Math.round(m.anchorX);
      const bbox = a.flipX ? { ...m.bbox, x: f.width - m.bbox.x - m.bbox.w } : m.bbox;
      outF.push(f);
      outM.push({ bbox, footY: m.footY - dy, anchorX: anchorX - dx });
    }
  }
  return { frames: outF, metrics: outM };
}

/**
 * One row per animation, cols = max frames in any animation. Each frame is pasted so that its anchorX lands
 * on floor(cell.w/2) and its footY on cell.h - 1 - padBottom (integer px). Content outside the cell is
 * clipped and reported as a warning {key:'warn.clipped', params:{frame, px}}.
 * anims: frame indices refer to `frames`. Returns the sheet plus each cell-sized frame in sheet order.
 * `spec.flipX` mirrors each frame of that animation around its anchor (the anchor stays on column floor(cell.w/2)).
 * `opts.offsets` nudges a frame (keyed by frame index, so every animation using it gets the same nudge) by
 * (dx, dy) output px after the feet/anchor alignment; dy > 0 moves it down.
 */
export function packFrames(
  frames: RGBAImage[],
  metrics: FrameMetrics[],
  cell: CellSpec,
  anims: AnimSpec[],
  mode: ArtMode,
  opts?: { offsets?: Record<number, FrameOffset> },
): { sheet: PackedSheet; cells: RGBAImage[]; warnings: Warning[] } {
  const specs: AnimSpec[] = anims.length
    ? anims
    : [{ name: 'default', frames: frames.map((_, i) => i), fps: 8, loop: true }];
  const cols = Math.max(1, ...specs.map((a) => a.frames.length));
  const rows = specs.length;
  const image = createImage(cols * cell.w, rows * cell.h);
  const anchorCol = Math.floor(cell.w / 2);
  const footRow = cell.h - 1 - cell.padBottom;

  const warnings: Warning[] = [];
  const warned = new Set<number>();
  const cells: RGBAImage[] = [];
  specs.forEach((spec, row) => {
    spec.frames.forEach((fi, col) => {
      const m = metrics[fi];
      // Mirroring the whole frame maps the anchor column a to width-1-a, so nothing is cut off before pasting.
      const f = spec.flipX && frames[fi] ? flipImageX(frames[fi]) : frames[fi];
      const c = createImage(cell.w, cell.h);
      if (f && m) {
        const off = opts?.offsets?.[fi];
        const anchor = spec.flipX ? f.width - 1 - Math.round(m.anchorX) : Math.round(m.anchorX);
        const dx = anchorCol - anchor + Math.round(off?.dx ?? 0);
        const dy = footRow - m.footY + Math.round(off?.dy ?? 0);
        blit(c, f, dx, dy, 'replace');
        if (!warned.has(fi)) {
          const px = clippedPixels(f, dx, dy, cell.w, cell.h);
          if (px > CLIP_NOISE_PX) {
            warned.add(fi);
            warnings.push({ key: 'warn.clipped', params: { frame: fi, px } });
          }
        }
      }
      blit(image, c, col * cell.w, row * cell.h, 'replace');
      cells.push(c);
    });
  });

  const sheet: PackedSheet = {
    image,
    cell: { w: cell.w, h: cell.h },
    cols,
    rows,
    padBottom: cell.padBottom,
    anims: specs.map((a, row) => ({ name: a.name, row, count: a.frames.length, fps: a.fps, loop: a.loop })),
    mode,
  };
  return { sheet, cells, warnings };
}

/** Opaque px of `f`, pasted at (dx, dy), that fall outside a w×h cell. */
function clippedPixels(f: RGBAImage, dx: number, dy: number, w: number, h: number): number {
  let n = 0;
  for (let y = 0; y < f.height; y++) {
    const ty = y + dy;
    const rowOut = ty < 0 || ty >= h;
    for (let x = 0; x < f.width; x++) {
      if (f.data[(y * f.width + x) * 4 + 3] < OPAQUE) continue;
      const tx = x + dx;
      if (rowOut || tx < 0 || tx >= w) n++;
    }
  }
  return n;
}
