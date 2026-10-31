// Background detection and removal (chroma key). See dev-docs/architecture.md.
import type { ArtMode, BgOptions, RGBA8, RGBAImage } from '../types.ts';

/**
 * Most common border colour (colours bucketed to 4 bits/channel, then averaged inside the winning bucket).
 * confidence = share of border pixels in that bucket (0..1). If the border is already mostly transparent,
 * returns color [0,0,0,0] with the share of transparent border pixels as confidence.
 */
export function detectBackground(img: RGBAImage): { color: RGBA8; confidence: number } {
  void img;
  throw new Error('not implemented');
}

/**
 * Returns a NEW image where background pixels are transparent.
 * - pixel mode: binary alpha (0 or 255) by ΔE <= tolerance.
 * - cartoon mode: if o.soft, alpha = smoothstep(inner, outer, ΔE); if o.despill, un-mix bg from edge pixels:
 *   c = (c - (1-α)·bg) / α, clamped.
 * Pixels already transparent in the input stay transparent. color 'auto' → detectBackground.
 */
export function removeBackground(img: RGBAImage, o: BgOptions, mode: ArtMode): RGBAImage {
  void img; void o; void mode;
  throw new Error('not implemented');
}

export const DEFAULT_BG: BgOptions = { color: 'auto', tolerance: 18, strategy: 'global', minHole: 16 };
export const DEFAULT_BG_CARTOON: BgOptions = { color: 'auto', tolerance: 18, strategy: 'global', soft: { inner: 10, outer: 40 }, despill: true };
