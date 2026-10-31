// Colour swaps between palettes: the maps `Asset.colorMap` applies to a finished sprite.
import { normalizeHex } from './formats.ts';

/**
 * Map the colours of `from` to the colours of `to` by position ('#rrggbb' → '#rrggbb'). Repeated source colours keep
 * their first target, entries that would not change are left out, and extra colours on either side are ignored.
 */
export function paletteSwapMap(from: string[], to: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const n = Math.min(from.length, to.length);
  for (let i = 0; i < n; i++) {
    const f = normalizeHex(from[i]), t = normalizeHex(to[i]);
    if (!f || !t || f === t || f in map) continue;
    map[f] = t;
  }
  return map;
}

/** `later` applied on top of `base` (same key: `later` wins). Keys are compared case-insensitively. */
export function mergeColorMaps(base: Record<string, string>, later: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of [base, later]) for (const [k, v] of Object.entries(m)) out[k.toLowerCase()] = v.toLowerCase();
  return out;
}
