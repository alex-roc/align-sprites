import type { RGBA8 } from '../core/types.ts';
import type { PaletteChoice } from './state/types.ts';

// Tiny localStorage helpers: storage can be unavailable (private mode, tests), so every access is guarded.

export function loadJSON(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------- kit settings (sprite size, game tile, palette)
/** Sprite heights offered as presets (multiples and divisors of 32, up to 128). */
export const SPRITE_HEIGHTS = [8, 16, 32, 64, 96, 128];
/** Tile sizes a game can use (same range as the sprite sizes, plus 48); the kit relates sprite heights to this one. */
export const GAME_TILES = [8, 16, 32, 48, 64, 96, 128];
export const DEFAULT_GAME_TILE = 32;

const isByte = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 255;

/** A saved palette colour list; anything malformed yields null (so a corrupt entry never breaks the app). */
export function parseColors(raw: unknown): RGBA8[] | null {
  if (!Array.isArray(raw) || !raw.length || raw.length > 256) return null;
  const out: RGBA8[] = [];
  for (const c of raw) {
    if (!Array.isArray(c) || c.length < 3 || !c.slice(0, 3).every(isByte)) return null;
    out.push([c[0], c[1], c[2], 255]);
  }
  return out;
}

/** Saved palette choice (`preset` ids are checked by the caller against PALETTES). */
export function parsePaletteChoice(raw: unknown, presetIds: readonly string[]): PaletteChoice | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.kind === 'original' || r.kind === 'reduce') return { kind: r.kind };
  if (r.kind === 'preset' && typeof r.id === 'string' && presetIds.includes(r.id)) return { kind: 'preset', id: r.id };
  if (r.kind === 'image') {
    const colors = parseColors(r.colors);
    if (colors) return { kind: 'image', colors, from: typeof r.from === 'string' ? r.from.slice(0, 80) : '' };
  }
  return null;
}
