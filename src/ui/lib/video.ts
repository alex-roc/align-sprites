// Main-thread video decoding: open a clip in an HTMLVideoElement, seek to exact times and read the frame pixels.
// The pure part (times, sheet layout, loop search) is in src/core/video/.
import { fitFrameSize, meanDifference, pickLoopEnd, type LoopCandidate } from '../../core/video/index.ts';
import type { RGBAImage } from '../../core/types.ts';

/** The browser cannot decode this clip (an unsupported codec, typically .mov / HEVC). */
export class VideoDecodeError extends Error {}

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv)$/i;

export const isVideoFile = (f: File): boolean => f.type.startsWith('video/') || (!f.type && VIDEO_EXT.test(f.name));

export interface OpenedVideo {
  url: string;
  duration: number;
  width: number;
  height: number;
}

function newElement(): HTMLVideoElement {
  const el = document.createElement('video');
  el.muted = true;
  el.playsInline = true;
  el.preload = 'auto';
  return el;
}

function release(el: HTMLVideoElement): void {
  el.removeAttribute('src');
  el.load();
}

/** Load the metadata and the first frame of a clip. Call `closeVideo` when done. */
export function openVideo(blob: Blob): Promise<OpenedVideo> {
  const url = URL.createObjectURL(blob);
  const el = newElement();
  return new Promise((resolve, reject) => {
    const fail = () => {
      release(el);
      URL.revokeObjectURL(url);
      reject(new VideoDecodeError('video decode failed'));
    };
    el.onerror = fail;
    el.onloadeddata = () => {
      if (!el.videoWidth || !el.videoHeight || !Number.isFinite(el.duration) || el.duration <= 0) return fail();
      const opened = { url, duration: el.duration, width: el.videoWidth, height: el.videoHeight };
      release(el);
      resolve(opened);
    };
    el.src = url;
  });
}

export function closeVideo(v: OpenedVideo): void {
  URL.revokeObjectURL(v.url);
}

/**
 * A fresh element on the clip for one extraction job (thumbnails, loop search, final frames), so jobs never disturb
 * the element the user is previewing. Pass it to `releaseVideo` when finished.
 */
export function cloneVideo(v: OpenedVideo): Promise<HTMLVideoElement> {
  const el = newElement();
  return new Promise((resolve, reject) => {
    el.onerror = () => reject(new VideoDecodeError('video decode failed'));
    el.onloadeddata = () => resolve(el);
    el.src = v.url;
  });
}

export const releaseVideo = release;

/** Wait for the frame at `t` to be ready (`seeked`, then one presented frame when the browser tells us). */
export function seekTo(el: HTMLVideoElement, t: number): Promise<void> {
  const target = Math.min(Math.max(0, t), Math.max(0, el.duration - 0.001));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => done(new VideoDecodeError('seek timed out')), 8000);
    const done = (err?: Error) => {
      clearTimeout(timer);
      el.removeEventListener('seeked', onSeeked);
      el.removeEventListener('error', onError);
      if (err) reject(err);
      else resolve();
    };
    const onError = () => done(new VideoDecodeError('video decode failed'));
    const onSeeked = () => {
      // requestVideoFrameCallback fires when the new frame is presented; not every browser has it, and a paused
      // element may skip it, so it only gets a short head start.
      if ('requestVideoFrameCallback' in el) {
        const fallback = setTimeout(() => done(), 150);
        el.requestVideoFrameCallback(() => {
          clearTimeout(fallback);
          done();
        });
      } else {
        done();
      }
    };
    el.addEventListener('seeked', onSeeked);
    el.addEventListener('error', onError);
    if (Math.abs(el.currentTime - target) < 1e-4 && el.readyState >= 2) onSeeked();
    else el.currentTime = target;
  });
}

/** Draw the current frame at `width×height` and read its pixels (opaque RGBA). */
function readFrame(el: HTMLVideoElement, ctx: CanvasRenderingContext2D, width: number, height: number): RGBAImage {
  ctx.drawImage(el, 0, 0, width, height);
  const d = ctx.getImageData(0, 0, width, height);
  return { width: d.width, height: d.height, data: d.data };
}

function makeContext(width: number, height: number): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D canvas not available');
  ctx.imageSmoothingQuality = 'high';
  return ctx;
}

/** Frames at `times`, each with the longest side at most `maxSide` px (proportional). `cancelled` stops between frames. */
export async function grabFrames(
  el: HTMLVideoElement,
  times: number[],
  maxSide: number,
  opts: { cancelled?: () => boolean; onProgress?: (done: number) => void } = {},
): Promise<RGBAImage[]> {
  const { width, height } = fitFrameSize(el.videoWidth, el.videoHeight, maxSide);
  const ctx = makeContext(width, height);
  const frames: RGBAImage[] = [];
  for (const t of times) {
    if (opts.cancelled?.()) break;
    await seekTo(el, t);
    frames.push(readFrame(el, ctx, width, height));
    opts.onProgress?.(frames.length);
  }
  return frames;
}

/** Longest side of the small copies used to compare frames when looking for the loop. */
const COMPARE_SIDE = 64;
/** Most frames compared while looking for the loop (each one is a seek). */
const MAX_PROBES = 90;

/**
 * Suggest where the loop closes: the end time whose frame looks most like the frame at `start`. Probes from `start`
 * to the end of the clip with a step of at most 1/30 s; null when the clip never comes back to the start pose.
 */
export async function findLoopEnd(el: HTMLVideoElement, start: number, opts: { cancelled?: () => boolean; onProgress?: (fraction: number) => void } = {}): Promise<number | null> {
  const span = el.duration - start;
  if (span <= 0.1) return null;
  const step = Math.max(1 / 30, span / MAX_PROBES);
  const probes: number[] = [];
  for (let t = start + step; t < el.duration; t += step) probes.push(t);
  const [first] = await grabFrames(el, [start], COMPARE_SIDE);
  const { width, height } = first;
  const ctx = makeContext(width, height);
  const candidates: LoopCandidate[] = [];
  for (const [i, t] of probes.entries()) {
    if (opts.cancelled?.()) return null;
    await seekTo(el, t);
    candidates.push({ time: t, diff: meanDifference(first, readFrame(el, ctx, width, height)) });
    opts.onProgress?.((i + 1) / probes.length);
  }
  return pickLoopEnd(candidates);
}
