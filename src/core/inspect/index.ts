// Quick look at an uploaded image: background, sheet or single sprite, frame count, native height.
import { autoBgOptions, removeBackground } from '../bg/index.ts';
import { findFrames } from '../segment/index.ts';
import type { ArtMode, BgOptions, RGBAImage, SpriteKind } from '../types.ts';

export interface Inspection {
  bg: BgOptions;
  kind: SpriteKind;
  frameCount: number;
  /** Height in source px of the tallest detected frame (for "sprite heights differ" hints). */
  sourceHeight: number;
}

/** Longest side of the working copy: keeps inspection well under 150 ms for a 2000×1000 sheet. */
const MAX_SIDE = 512;

/**
 * A detected region smaller than this share of the largest region's bbox area is a part (a sword held away from
 * the body, a floating hair tuft that findFrames could not attach), not a frame: sheet frames are all alike in size.
 */
const MIN_FRAME_AREA_RATIO = 0.1;

/** Nearest-neighbour reduction so that the longest side is <= MAX_SIDE (the image itself when it already is). */
function reduce(img: RGBAImage): { img: RGBAImage; factor: number } {
  const factor = Math.max(img.width, img.height) / MAX_SIDE;
  if (factor <= 1) return { img, factor: 1 };
  const w = Math.max(1, Math.round(img.width / factor));
  const h = Math.max(1, Math.round(img.height / factor));
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    // Sample the centre of each source block.
    const sy = Math.min(img.height - 1, Math.floor((y + 0.5) * (img.height / h)));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(img.width - 1, Math.floor((x + 0.5) * (img.width / w)));
      const s = (sy * img.width + sx) * 4;
      data.set(img.data.subarray(s, s + 4), (y * w + x) * 4);
    }
  }
  return { img: { width: w, height: h, data }, factor: img.height / h };
}

/**
 * Detect the background (autoBgOptions), remove it on a downsampled copy (longest side <= 512 px for speed),
 * run findFrames and decide: 1 frame → 'single', more → 'sheet'.
 * `bg` is detected on the working copy (colour and strategy do not depend on the size); `sourceHeight` is
 * measured there and scaled back to the ORIGINAL image's pixels. Regions under 10 % of the largest region's area
 * do not count as frames, so a character with a detached weapon stays 'single' (`frameCount` can therefore be lower
 * than what segmentation 'auto' returns for the same image).
 */
export function inspectImage(img: RGBAImage, mode: ArtMode): Inspection {
  const { img: small, factor } = reduce(img);
  const bg = autoBgOptions(small, mode);
  const clean = removeBackground(small, bg, mode);
  const regions = findFrames(clean).map((f) => f.rect);
  const maxArea = Math.max(0, ...regions.map((r) => r.w * r.h));
  const frames = regions.filter((r) => r.w * r.h >= MIN_FRAME_AREA_RATIO * maxArea);
  // A single sprite includes its detached parts (union box); in a sheet the tallest frame sets the reference.
  let tallest = Math.max(0, ...frames.map((r) => r.h));
  if (frames.length === 1 && regions.length > 1) {
    tallest = Math.max(...regions.map((r) => r.y + r.h)) - Math.min(...regions.map((r) => r.y));
  }
  return {
    bg,
    kind: frames.length > 1 ? 'sheet' : 'single',
    frameCount: frames.length,
    sourceHeight: Math.round(tallest * factor),
  };
}
