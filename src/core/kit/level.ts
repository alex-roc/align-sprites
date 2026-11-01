// Pure helpers of the Kit's test level and preview: game resolutions, where a tile's ground really starts, which
// animation plays when, the body box and the level layout. The Kaplay scene itself lives in src/ui (it needs the DOM).
import type { RGBAImage } from '../types.ts';

// ---------------------------------------------------------------- game resolution

export interface GameResolution {
  /** 16:9 game resolution in game px. */
  w: number;
  h: number;
  /** Tile size that fits it (about 18 tiles across the screen at 640×360). */
  tile: number;
  /** Character height range that looks right at this resolution, in game px. */
  character: [number, number];
}

export const GAME_RESOLUTIONS: readonly GameResolution[] = [
  { w: 320, h: 180, tile: 16, character: [24, 32] },
  { w: 640, h: 360, tile: 32, character: [48, 64] },
  { w: 960, h: 540, tile: 48, character: [72, 96] },
  { w: 1280, h: 720, tile: 64, character: [112, 144] },
];
export const DEFAULT_GAME_RES = 640;

export const resolutionByWidth = (w: number): GameResolution => GAME_RESOLUTIONS.find((r) => r.w === w) ?? GAME_RESOLUTIONS.find((r) => r.w === DEFAULT_GAME_RES)!;

/** Screens the table compares against, as [name, width]. */
export const SCREENS = [['1080p', 1920], ['4K', 3840]] as const;

/** Exact integer factor that maps the game width to the screen width (640 → 1920 is ×3), or null when it is fractional. */
export function integerScaleTo(res: GameResolution, screenW: number): number | null {
  const k = screenW / res.w;
  return Number.isInteger(k) ? k : null;
}

/** Largest integer scale (at least 1) that fits the game in a box. */
export function fitScale(res: GameResolution, boxW: number, boxH: number): number {
  return Math.max(1, Math.floor(Math.min(boxW / res.w, boxH / res.h)));
}

// ---------------------------------------------------------------- tiles

/** Alpha from which a pixel counts as solid ground. */
const SOLID_ALPHA = 128;

/**
 * Rows of empty space at the top of a tile: the index of the first row where at least `minFill` of the pixels are
 * opaque. Grass blades or the rim of a rock leave the top rows mostly transparent, and sprites must stand on the
 * solid part, not on the tile's top edge. An empty tile gives 0 (nothing to measure).
 */
export function tileTopInset(tile: RGBAImage, minFill = 0.5): number {
  const { width: w, height: h, data } = tile;
  for (let y = 0; y < h; y++) {
    let solid = 0;
    for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] >= SOLID_ALPHA) solid++;
    if (solid >= w * minFill && solid > 0) return y;
  }
  return 0;
}

/** One inset for several tiles that share a row (the preview cycles them): their median. */
export function surfaceInset(tiles: RGBAImage[]): number {
  if (!tiles.length) return 0;
  const v = tiles.map((t) => tileTopInset(t)).sort((a, b) => a - b);
  return v[Math.floor(v.length / 2)]!;
}

// ---------------------------------------------------------------- animations

export interface LevelAnims {
  idle: string;
  walk: string;
  run: string;
  jump: string;
}

const IDLE = /idle|reposo|stand|quiet|parad/i;
const WALK = /walk|camin|andar/i;
const RUN = /run|corr|sprint/i;
const JUMP = /jump|salt|fall|ca[ií]da/i;

/**
 * Which animation plays for each state, by name (EN/ES); the names can be animation names or `sprite anim` labels.
 * A missing one falls back: walk ↔ run, then idle, then the first name. Null when there are none.
 */
export function pickLevelAnims(names: string[]): LevelAnims | null {
  if (!names.length) return null;
  const find = (re: RegExp, skip: string[] = []) => names.find((n) => re.test(n) && !skip.includes(n));
  const idle = find(IDLE) ?? names[0]!;
  const walk = find(WALK);
  const run = find(RUN);
  const jump = find(JUMP);
  return { idle, walk: walk ?? run ?? idle, run: run ?? walk ?? idle, jump: jump ?? idle };
}

// ---------------------------------------------------------------- layout

export interface LevelLayout {
  /** Level width in px (a multiple of the tile) and the screen height. */
  width: number;
  height: number;
  /** Top of the floor's tile row, and how many tile rows fill it down to the bottom of the screen. */
  floorTop: number;
  floorRows: number;
  /** Floating platforms: `col` and `len` in tiles, `top` = y of the top of their tile row. */
  platforms: { col: number; len: number; top: number }[];
}

/**
 * A floor with a few platforms, in screen px. The floor takes about a third of the screen height; platforms rise
 * from half of `reach` to `reach` tiles above it (`reach` = how many tiles a jump clears).
 */
export function levelLayout(screenW: number, screenH: number, tile: number, reach = 2): LevelLayout {
  const floorRows = Math.max(1, Math.min(3, Math.floor((screenH * 0.34) / tile)));
  const floorTop = screenH - floorRows * tile;
  const cols = Math.max(24, Math.ceil((screenW * 3) / tile));
  const low = Math.max(1, Math.round(reach / 2));
  const rise = (n: number) => floorTop - n * tile;
  const platforms = [
    { col: 7, len: 4, top: rise(low) },
    { col: 14, len: 3, top: rise(reach) },
    { col: 20, len: 5, top: rise(low) },
    { col: 27, len: 4, top: rise(reach) },
  ].filter((p) => p.col + p.len <= cols && p.top >= 0);
  return { width: cols * tile, height: screenH, floorTop, floorRows, platforms };
}

// ---------------------------------------------------------------- parallax background

/**
 * World x of every copy of a looping layer that covers the screen. `left` is the world x of the screen's left edge,
 * `w` the layer width and `factor` how much the layer follows the camera (0 = fixed to the screen, 1 = moves with the
 * world). Same maths as the Kaplay export's snippet: in the world the layer is shifted (1 − factor) of the camera, so
 * on screen it slides by camera × factor. Whole pixels, so pixel art never lands between pixels.
 */
export function parallaxCopies(left: number, screenW: number, w: number, factor: number): number[] {
  if (w <= 0) return [];
  const offset = Math.round((1 - factor) * left);
  const out: number[] = [];
  for (let x = offset + Math.floor((left - offset) / w) * w; x < left + screenW; x += w) out.push(x);
  return out;
}
