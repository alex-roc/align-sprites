// Deterministic synthetic fixtures that mimic AI-generated sprite sheets:
// pixel art upscaled ×N (possibly fractional), jittered placement, foot drift,
// colour noise and a soft halo on a magenta background.
import { createImage, setPixel } from '../../src/core/image.ts';
import type { RGBA8, RGBAImage, Rect } from '../../src/core/types.ts';

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const MAGENTA: RGBA8 = [255, 0, 255, 255];
export const OUTLINE: RGBA8 = [30, 20, 40, 255];
export const SKIN: RGBA8 = [240, 190, 140, 255];
export const SHIRT: RGBA8 = [40, 120, 220, 255];
export const PANTS: RGBA8 = [90, 60, 30, 255];

/**
 * A little character at native art resolution (transparent background), w×h art px.
 * `frames` walk-cycle variants: legs alternate, arms swing. Feet always touch the last row.
 */
export function makeCharacterFrames(w = 16, h = 24, frames = 4): RGBAImage[] {
  const out: RGBAImage[] = [];
  for (let f = 0; f < frames; f++) {
    const img = createImage(w, h);
    const cx = Math.floor(w / 2);
    const headH = Math.round(h * 0.3);
    const bodyH = Math.round(h * 0.35);
    const fill = (x0: number, y0: number, x1: number, y1: number, c: RGBA8) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && x < w && y >= 0 && y < h) setPixel(img, x, y, c);
    };
    // head
    const hw = Math.round(w * 0.25);
    fill(cx - hw, 0, cx + hw - 1, headH - 1, SKIN);
    // body
    const bw = Math.round(w * 0.3);
    fill(cx - bw, headH, cx + bw - 1, headH + bodyH - 1, SHIRT);
    // arms swing by frame
    const swing = [0, 1, 0, -1][f % 4];
    fill(cx - bw - 2, headH + 1 + swing, cx - bw - 1, headH + bodyH - 2 + swing, SKIN);
    fill(cx + bw, headH + 1 - swing, cx + bw + 1, headH + bodyH - 2 - swing, SKIN);
    // legs alternate
    const step = [0, 2, 0, -2][f % 4];
    const ly = headH + bodyH;
    fill(cx - 3 + Math.min(0, step), ly, cx - 2 + Math.min(0, step), h - 1, PANTS);
    fill(cx + 1 + Math.max(0, step), ly, cx + 2 + Math.max(0, step), h - 1, PANTS);
    // 1px outline around everything
    const copy = new Uint8ClampedArray(img.data);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (copy[(y * w + x) * 4 + 3]) continue;
        const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
          const X = x + dx, Y = y + dy;
          return X >= 0 && X < w && Y >= 0 && Y < h && copy[(Y * w + X) * 4 + 3] > 0;
        });
        if (n && y < h - 1) setPixel(img, x, y, OUTLINE);
      }
    out.push(img);
  }
  return out;
}

/** Nearest upscale by a (possibly fractional) factor. */
export function upscale(img: RGBAImage, factor: number): RGBAImage {
  const W = Math.round(img.width * factor), H = Math.round(img.height * factor);
  const out = createImage(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const sx = Math.min(img.width - 1, Math.floor(x / factor));
      const sy = Math.min(img.height - 1, Math.floor(y / factor));
      const si = (sy * img.width + sx) * 4, di = (y * W + x) * 4;
      for (let k = 0; k < 4; k++) out.data[di + k] = img.data[si + k];
    }
  return out;
}

export interface SheetOptions {
  scale?: number;
  cols?: number;
  /** Nominal cell size in sheet px (frames are placed inside, jittered). */
  cell?: { w: number; h: number };
  jitter?: number;
  footDrift?: number;
  noise?: number;
  halo?: boolean;
  bg?: RGBA8;
  seed?: number;
}

export interface Sheet {
  image: RGBAImage;
  /** Where each upscaled frame was pasted (sheet px). */
  placements: Rect[];
  scale: number;
}

/** Composite frames into an AI-looking sheet. */
export function makeSheet(frames: RGBAImage[], o: SheetOptions = {}): Sheet {
  const scale = o.scale ?? 8;
  const cols = o.cols ?? frames.length;
  const rows = Math.ceil(frames.length / cols);
  const fw = Math.round(frames[0].width * scale), fh = Math.round(frames[0].height * scale);
  const cell = o.cell ?? { w: Math.round(fw * 1.6), h: Math.round(fh * 1.3) };
  const jitter = o.jitter ?? 12, drift = o.footDrift ?? 1, noise = o.noise ?? 3;
  const bg = o.bg ?? MAGENTA;
  const r = rng(o.seed ?? 1);
  const image = createImage(cols * cell.w, rows * cell.h, bg);
  const placements: Rect[] = [];
  frames.forEach((f, i) => {
    const up = upscale(f, scale);
    const cx = (i % cols) * cell.w, cy = Math.floor(i / cols) * cell.h;
    const x = cx + Math.round((cell.w - up.width) / 2 + (r() * 2 - 1) * jitter);
    const y = cy + cell.h - up.height - Math.round(cell.h * 0.08) + Math.round((r() * 2 - 1) * drift);
    placements.push({ x, y, w: up.width, h: up.height });
    for (let yy = 0; yy < up.height; yy++)
      for (let xx = 0; xx < up.width; xx++) {
        const si = (yy * up.width + xx) * 4;
        if (!up.data[si + 3]) continue;
        const di = ((y + yy) * image.width + x + xx) * 4;
        for (let k = 0; k < 3; k++) image.data[di + k] = up.data[si + k];
        image.data[di + 3] = 255;
      }
  });
  if (o.halo ?? true) blurEdges(image, bg);
  if (noise > 0) {
    for (let i = 0; i < image.data.length; i += 4)
      for (let k = 0; k < 3; k++) image.data[i + k] += Math.round((r() * 2 - 1) * noise);
  }
  return { image, placements, scale };
}

/** Soften 1px around non-bg content (simulates resampling halos). */
function blurEdges(img: RGBAImage, bg: RGBA8) {
  const { width: W, height: H } = img;
  const src = new Uint8ClampedArray(img.data);
  const isBg = (i: number) => src[i] === bg[0] && src[i + 1] === bg[1] && src[i + 2] === bg[2];
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = (y * W + x) * 4;
      const n = [i - 4, i + 4, i - W * 4, i + W * 4];
      const mixed = n.some((j) => isBg(j) !== isBg(i));
      if (!mixed) continue;
      for (let k = 0; k < 3; k++) img.data[i + k] = (src[i + k] * 2 + n.reduce((s, j) => s + src[j + k], 0)) / 6;
    }
}

/** Cartoon-ish fixture: antialiased discs (a "body" and a "head") on magenta, `count` frames side by side. */
export function makeCartoonSheet(count = 4, size = 200, bg: RGBA8 = MAGENTA, seed = 3): Sheet {
  const r = rng(seed);
  const image = createImage(count * size, size, bg);
  const placements: Rect[] = [];
  for (let i = 0; i < count; i++) {
    const ox = i * size + Math.round((r() * 2 - 1) * 15);
    const discs = [
      { cx: ox + size / 2, cy: size * 0.62, rad: size * 0.22, c: [60, 170, 90] },
      { cx: ox + size / 2, cy: size * 0.3, rad: size * 0.13, c: [250, 210, 160] },
    ];
    for (let y = 0; y < size; y++)
      for (let x = Math.max(0, ox); x < Math.min(image.width, ox + size); x++) {
        for (const d of discs) {
          const dist = Math.hypot(x + 0.5 - d.cx, y + 0.5 - d.cy) - d.rad;
          const a = Math.max(0, Math.min(1, 0.5 - dist));
          if (a <= 0) continue;
          const di = (y * image.width + x) * 4;
          for (let k = 0; k < 3; k++) image.data[di + k] = image.data[di + k] * (1 - a) + d.c[k] * a;
        }
      }
    const top = Math.round(size * 0.3 - size * 0.13), bottom = Math.round(size * 0.62 + size * 0.22);
    placements.push({ x: Math.round(ox + size / 2 - size * 0.22), y: top, w: Math.round(size * 0.44), h: bottom - top });
  }
  return { image, placements, scale: 1 };
}
