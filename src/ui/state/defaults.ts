import type { Asset, AnimDraft, AppState, AutoBg, Detected, EdgeStyleForm, GlobalSettings, ItemsState, ParallaxState, TerrainState, TileSheetState } from './types.ts';
import type { RGBAImage } from '../../core/types.ts';
import { PALETTES } from '../../core/palette/index.ts';
import { ASSET_PROMPT_DEFAULTS } from '../../core/prompts/assets.ts';
import { defaultEdgeStyle } from '../../core/tiles/index.ts';
import { DEFAULT_GAME_RES, GAME_RESOLUTIONS } from '../../core/kit/level.ts';
import { DEFAULT_GAME_TILE, GAME_TILES, loadJSON, parseCustomColors, parsePaletteChoice } from '../persist.ts';
import type { ExportTarget } from '../../core/types.ts';

let seq = 0;
export const newId = (prefix: string): string => `${prefix}${++seq}`;

export const DEFAULT_GLOBAL: GlobalSettings = {
  mode: 'pixel',
  cellAuto: true,
  cellW: 64,
  cellH: 64,
  padBottom: 0,
  targetHeight: null,
  maxColors: 16,
  palette: { kind: 'original' },
  customColors: [],
  gameTile: DEFAULT_GAME_TILE,
  gameRes: DEFAULT_GAME_RES,
  anchorX: 'medianColumn',
};

export const GLOBAL_KEY = 'align-sprites.settings';
export const EXPORT_KEY = 'align-sprites.export';

const isNum = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

/** Saved global settings (mode, height, cell, colours…) merged over the defaults; anything invalid is ignored. */
export function loadGlobal(): GlobalSettings {
  const raw = loadJSON(GLOBAL_KEY);
  if (!raw || typeof raw !== 'object') return DEFAULT_GLOBAL;
  const r = raw as Record<string, unknown>;
  const g = { ...DEFAULT_GLOBAL };
  if (r.mode === 'pixel' || r.mode === 'cartoon') g.mode = r.mode;
  if (typeof r.cellAuto === 'boolean') g.cellAuto = r.cellAuto;
  if (isNum(r.cellW, 8, 1024)) g.cellW = r.cellW;
  if (isNum(r.cellH, 8, 1024)) g.cellH = r.cellH;
  if (isNum(r.padBottom, 0, 256)) g.padBottom = r.padBottom;
  if (r.targetHeight === null || isNum(r.targetHeight, 4, 1024)) g.targetHeight = r.targetHeight as number | null;
  if (isNum(r.maxColors, 2, 256)) g.maxColors = r.maxColors;
  const palette = parsePaletteChoice(r.palette, PALETTES.map((p) => p.id));
  g.customColors = parseCustomColors(r.customColors);
  if (palette) g.palette = palette;
  // Before palettes existed `maxColors > 0` meant "reduce"; keep that choice for returning visitors.
  else if (isNum(r.maxColors, 1, 256) && r.palette === undefined) g.palette = { kind: 'reduce' };
  if (typeof r.gameTile === 'number' && GAME_TILES.includes(r.gameTile)) g.gameTile = r.gameTile;
  if (typeof r.gameRes === 'number' && GAME_RESOLUTIONS.some((x) => x.w === r.gameRes)) g.gameRes = r.gameRes;
  if (r.anchorX === 'medianColumn' || r.anchorX === 'centroid' || r.anchorX === 'bboxCenter') g.anchorX = r.anchorX;
  return g;
}

const ENGINES: ExportTarget[] = ['godot', 'gdevelop', 'kaplay', 'generic'];

export function loadExportChoice(): { exportEngine: ExportTarget; exportAll: boolean } {
  const raw = loadJSON(EXPORT_KEY) as { engine?: unknown; all?: unknown } | null;
  const engine = ENGINES.find((e) => e === raw?.engine) ?? 'godot';
  return { exportEngine: engine, exportAll: raw?.all === true };
}

/** Height proposed when switching to cartoon mode (native size would be the full source resolution). */
export const CARTOON_DEFAULT_HEIGHT = 128;

export const DEFAULT_ANIM_NAME = 'default';
export const DEFAULT_FPS = 8;

export function defaultAnim(): AnimDraft {
  return { id: newId('a'), name: DEFAULT_ANIM_NAME, frames: '', fps: DEFAULT_FPS, loop: true, flipX: false };
}

/** The untouched default animation: the core builds it itself ("default", all frames). */
export function isPristineAnims(anims: AnimDraft[]): boolean {
  const a = anims[0];
  return anims.length === 1 && a.name === DEFAULT_ANIM_NAME && a.frames.trim() === '' && a.fps === DEFAULT_FPS && a.loop && !a.flipX;
}

export function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '') || 'sprite';
}

/** A new asset: the type comes from the upload inspection (sheet when it failed). */
export function makeAsset(fileName: string, image: RGBAImage, detected: Detected | null, autoBg: AutoBg | null): Asset {
  return {
    id: newId('s'),
    fileName,
    name: baseName(fileName),
    kind: detected?.kind ?? 'sheet',
    image,
    bg: { strategy: 'auto', custom: false, color: autoBg ? [autoBg.color[0], autoBg.color[1], autoBg.color[2]] : [255, 0, 255], tolerance: 18 },
    seg: { mode: 'auto', rows: 1, cols: 4 },
    regions: null,
    anims: [defaultAnim()],
    frameOffsets: {},
    colorMap: {},
    detected,
    relative: 1,
    heightRef: 'median',
    anchor: 'feet',
    autoBg,
  };
}

/** Another image of the batch with the same source and settings (its own ids, so it can diverge: colours, frames…). */
export function cloneAsset(a: Asset, name: string): Asset {
  return { ...a, id: newId('s'), name, anims: a.anims.map((d) => ({ ...d, id: newId('a') })), colorMap: { ...a.colorMap }, frameOffsets: { ...a.frameOffsets } };
}

export const DEFAULT_TILE_SIZE = 32;

/** defaultEdgeStyle(T, seed) as form values (outline off by default, as in the core). */
export function edgeStyleForm(tileSize: number, seed = 1): EdgeStyleForm {
  const d = defaultEdgeStyle(tileSize, seed);
  return { margin: d.margin, blur: d.blur, noiseAmp: d.noiseAmp, noiseCells: d.noiseCells, seed: d.seed, outline: 'none' };
}

export const initialTileSheet: TileSheetState = {
  source: null,
  mode: 'pixel',
  tileSize: DEFAULT_TILE_SIZE,
  gridAuto: true,
  cols: 4,
  rows: 4,
  removeBg: true,
  bg: { strategy: 'auto', custom: false, color: [255, 255, 255], tolerance: 25 },
  maxColors: 0,
  view: 'atlas',
  format: 'godot',
  allFormats: false,
  run: { status: 'idle', sig: null, result: null, grid: null, error: null },
};

export const initialItems: ItemsState = {
  source: null,
  mode: 'pixel',
  cellSize: DEFAULT_TILE_SIZE,
  fill: 'common',
  margin: 1,
  detectAuto: true,
  cols: 4,
  rows: 3,
  atlasCols: 0,
  removeBg: true,
  bg: { strategy: 'auto', custom: false, color: [255, 255, 255], tolerance: 25 },
  maxColors: 0,
  excluded: [],
  names: {},
  view: 'atlas',
  format: 'godot',
  allFormats: false,
  run: { status: 'idle', sig: null, result: null, error: null },
};

export const initialParallax: ParallaxState = {
  layers: [],
  mode: 'pixel',
  height: null,
  loop: true,
  overlap: 12,
  bgTolerance: 25,
  view: 'scroll',
  wrapLayer: 0,
  speed: 60,
  name: 'background',
  format: 'godot',
  allFormats: false,
  run: { status: 'idle', sig: null, result: null, error: null },
};

export const initialTerrain: TerrainState = {
  a: null,
  b: null,
  bTransparent: false,
  mode: 'pixel',
  tileSize: DEFAULT_TILE_SIZE,
  layout: 'blob47',
  style: edgeStyleForm(DEFAULT_TILE_SIZE),
  view: 'map',
  mapSeed: 7,
  preview: null,
  run: { status: 'idle', sig: null, set: null, tileA: null, tileB: null, seamA: null, seamB: null, error: null },
};

export const initialState: AppState = {
  assets: [],
  selectedId: null,
  global: loadGlobal(),
  ...loadExportChoice(),
  exportGdSheets: false,
  stageView: 'animation',
  run: { status: 'idle', results: {}, frameCounts: {}, error: null },
  promptKind: 'sprite',
  prompt: {
    promptLang: 'ui',
    mode: 'pixel',
    subject: '',
    action: 'walk',
    frames: 8,
    cols: 4,
    artHeight: 32,
    view: 'side',
    key: 'magenta',
    withReference: false,
  },
  tilePrompt: { mode: 'pixel', material: '', tileSize: 32, view: 'top-down' },
  assetPrompts: ASSET_PROMPT_DEFAULTS,
  tiles: { kind: 'sheet', sheet: initialTileSheet, terrain: initialTerrain, items: initialItems, parallax: initialParallax },
};
