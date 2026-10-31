// Pure helpers for "video to sprite sheet": which times to grab, how to lay the frames out as one sheet, the
// background colour of the clip and where a loop closes. Decoding the video itself needs the DOM and lives in
// src/ui/lib/video.ts.
import { createImage } from '../image.ts';
import type { RGBAImage } from '../types.ts';

/** Longest side of a grabbed frame; videos are usually far bigger than a sprite needs. */
export const MAX_FRAME_SIDE = 768;
/** Frames per row of the sheet (the sheet only gets taller beyond this). */
export const MAX_SHEET_COLS = 8;
export const DEFAULT_FRAME_COUNT = 8;
export const MAX_FRAME_COUNT = 64;

/**
 * Times of `count` evenly spaced frames in [start, end). The end is excluded on purpose: in a looping clip the
 * frame at `end` is the frame at `start` again, and it would play twice in a row.
 */
export function frameTimes(start: number, end: number, count: number): number[] {
  const n = Math.max(1, Math.floor(count));
  const step = Math.max(0, end - start) / n;
  return Array.from({ length: n }, (_, i) => start + i * step);
}

/** Size of a video frame after capping the longest side (proportional, whole pixels, at least 1). */
export function fitFrameSize(width: number, height: number, maxSide = MAX_FRAME_SIDE): { width: number; height: number } {
  const k = Math.min(1, maxSide / Math.max(width, height, 1));
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) };
}

export interface SheetLayout {
  cols: number;
  rows: number;
  /** Gap between frames and around the sheet, in px. */
  gap: number;
  width: number;
  height: number;
}

/**
 * Grid for `count` frames of `frameW×frameH`: up to `maxCols` per row, one row more at most if that leaves no empty
 * cell (12 frames: 2 rows of 6, not 8 + 4), and a gap of about 3 % of the frame between them.
 */
export function sheetLayout(count: number, frameW: number, frameH: number, maxCols = MAX_SHEET_COLS): SheetLayout {
  let cols = Math.max(1, Math.min(count, maxCols));
  let rows = Math.ceil(count / cols);
  for (const r of [rows, rows + 1]) {
    if (count % r === 0) {
      rows = r;
      cols = count / r;
      break;
    }
  }
  if (rows * cols < count) cols = Math.ceil(count / rows);
  const gap = Math.max(4, Math.round(Math.max(frameW, frameH) * 0.03));
  return { cols, rows, gap, width: gap + cols * (frameW + gap), height: gap + rows * (frameH + gap) };
}

/** Per-channel median of the 8×8 corner patches of every frame: the flat colour behind the character, without compression noise. */
export function cornerColor(frames: RGBAImage[]): [number, number, number] {
  const ch: number[][] = [[], [], []];
  for (const f of frames) {
    const s = Math.max(1, Math.min(8, f.width, f.height));
    for (const x0 of [0, f.width - s]) {
      for (const y0 of [0, f.height - s]) {
        for (let y = y0; y < y0 + s; y++) {
          for (let x = x0; x < x0 + s; x++) {
            const i = (y * f.width + x) * 4;
            for (let c = 0; c < 3; c++) ch[c].push(f.data[i + c]);
          }
        }
      }
    }
  }
  const med = (v: number[]) => (v.length ? v.sort((a, b) => a - b)[v.length >> 1] : 0);
  return [med(ch[0]), med(ch[1]), med(ch[2])];
}

/**
 * Lay the frames out in reading order on one opaque sheet filled with `bg` (default: the clip's corner colour), with a
 * gap around and between frames so the automatic segmentation also finds them. All frames must have the same size.
 */
export function composeSheet(frames: RGBAImage[], bg: [number, number, number] = cornerColor(frames), maxCols = MAX_SHEET_COLS): { image: RGBAImage; layout: SheetLayout } {
  if (!frames.length) throw new Error('composeSheet: no frames');
  const { width: fw, height: fh } = frames[0];
  const layout = sheetLayout(frames.length, fw, fh, maxCols);
  const image = createImage(layout.width, layout.height);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = bg[0];
    d[i + 1] = bg[1];
    d[i + 2] = bg[2];
    d[i + 3] = 255;
  }
  frames.forEach((f, k) => {
    if (f.width !== fw || f.height !== fh) throw new Error('composeSheet: frames differ in size');
    const ox = layout.gap + (k % layout.cols) * (fw + layout.gap);
    const oy = layout.gap + Math.floor(k / layout.cols) * (fh + layout.gap);
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const s = (y * fw + x) * 4;
        const t = ((oy + y) * layout.width + ox + x) * 4;
        d[t] = f.data[s];
        d[t + 1] = f.data[s + 1];
        d[t + 2] = f.data[s + 2];
      }
    }
  });
  return { image, layout };
}

/** Mean absolute RGB difference (0..255) between two same-size images; different sizes count as the maximum. */
export function meanDifference(a: RGBAImage, b: RGBAImage): number {
  if (a.width !== b.width || a.height !== b.height) return 255;
  let sum = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    sum += Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
  }
  return sum / (a.width * a.height * 3) || 0;
}

export interface LoopCandidate {
  time: number;
  /** Difference between the frame at `time` and the frame at the start (any scale; lower = more alike). */
  diff: number;
}

/**
 * Time (from `candidates`, ascending) where the clip first looks like the start frame again, or null when it never
 * does. Right after the start every frame still looks like it, so the search begins once the difference has climbed
 * above 35 % of its maximum (the character left the start pose); the first candidate back under 35 % is refined to
 * its local minimum. The first return wins over later ones: a clip with two cycles gives one cycle. A clip that
 * never changes returns the last candidate (the longest range).
 */
export function pickLoopEnd(candidates: LoopCandidate[]): number | null {
  if (!candidates.length) return null;
  const max = Math.max(...candidates.map((c) => c.diff));
  if (max <= 0) return candidates[candidates.length - 1].time;
  const threshold = max * 0.35;
  const left = candidates.findIndex((c) => c.diff > threshold);
  let i = candidates.findIndex((c, k) => k > left && c.diff <= threshold);
  if (i < 0) return null;
  while (i + 1 < candidates.length && candidates[i + 1].diff < candidates[i].diff) i++;
  return candidates[i].time;
}
