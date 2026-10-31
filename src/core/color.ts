// Colour helpers: sRGB → CIELab and ΔE (CIE76), cached per 15-bit colour for speed.
import type { RGBA8 } from './types.ts';

export type Lab = [number, number, number];

const lin = (c: number) => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);

export function rgbToLab(r: number, g: number, b: number): Lab {
  const R = lin(r), G = lin(g), B = lin(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function deltaE(a: Lab, b: Lab): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** ΔE between two sRGB colours. */
export function rgbDistance(a: RGBA8 | [number, number, number], b: RGBA8 | [number, number, number]): number {
  return deltaE(rgbToLab(a[0], a[1], a[2]), rgbToLab(b[0], b[1], b[2]));
}

/** Returns a fast function giving ΔE of any (r,g,b) to a fixed reference colour (memoized on 5-bit-per-channel buckets + exact fallback). */
export function distanceTo(ref: RGBA8 | [number, number, number]): (r: number, g: number, b: number) => number {
  const refLab = rgbToLab(ref[0], ref[1], ref[2]);
  const cache = new Map<number, number>();
  return (r, g, b) => {
    const k = (r << 16) | (g << 8) | b;
    let d = cache.get(k);
    if (d === undefined) {
      d = deltaE(rgbToLab(r, g, b), refLab);
      if (cache.size < 1 << 18) cache.set(k, d);
    }
    return d;
  };
}
