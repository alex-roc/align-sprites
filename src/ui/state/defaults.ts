import type { Asset, AnimDraft, AppState, AssetKind, AutoBg, EdgeStyleForm, GlobalSettings, TerrainState, TileSheetState } from './types.ts';
import type { RGBAImage } from '../../core/types.ts';
import { defaultEdgeStyle } from '../../core/tiles/index.ts';

let seq = 0;
export const newId = (prefix: string): string => `${prefix}${++seq}`;

export const DEFAULT_GLOBAL: GlobalSettings = {
  mode: 'pixel',
  cellAuto: true,
  cellW: 64,
  cellH: 64,
  padBottom: 0,
  targetHeight: null,
  maxColors: 0,
  anchorX: 'medianColumn',
};

/** Height proposed when switching to cartoon mode (native size would be the full source resolution). */
export const CARTOON_DEFAULT_HEIGHT = 128;

export const DEFAULT_ANIM_NAME = 'default';
export const DEFAULT_FPS = 8;

export function defaultAnim(): AnimDraft {
  return { id: newId('a'), name: DEFAULT_ANIM_NAME, frames: '', fps: DEFAULT_FPS, loop: true };
}

/** The untouched default animation: the core builds it itself ("default", all frames). */
export function isPristineAnims(anims: AnimDraft[]): boolean {
  const a = anims[0];
  return anims.length === 1 && a.name === DEFAULT_ANIM_NAME && a.frames.trim() === '' && a.fps === DEFAULT_FPS && a.loop;
}

export function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '') || 'sprite';
}

export function makeAsset(fileName: string, image: RGBAImage, kind: AssetKind, autoBg: AutoBg | null): Asset {
  return {
    id: newId('s'),
    fileName,
    name: baseName(fileName),
    kind,
    image,
    bg: { strategy: 'auto', custom: false, color: autoBg ? [autoBg.color[0], autoBg.color[1], autoBg.color[2]] : [255, 0, 255], tolerance: 18 },
    seg: { mode: 'auto', rows: 1, cols: 4 },
    anims: [defaultAnim()],
    relative: 1,
    autoBg,
  };
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
  targets: { godot: true, tiled: true, png: true },
  run: { status: 'idle', sig: null, result: null, grid: null, error: null },
};

export const initialTerrain: TerrainState = {
  a: null,
  b: null,
  bTransparent: false,
  mode: 'pixel',
  tileSize: DEFAULT_TILE_SIZE,
  layout: 'blob47',
  style: edgeStyleForm(DEFAULT_TILE_SIZE),
  mapSeed: 7,
  preview: null,
  run: { status: 'idle', sig: null, set: null, tileA: null, tileB: null, seamA: null, seamB: null, error: null },
};

export const initialState: AppState = {
  tab: 'sprites',
  assets: [],
  selectedId: null,
  global: DEFAULT_GLOBAL,
  targets: ['godot', 'gdevelop', 'kaplay', 'generic'],
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
  tiles: { kind: 'sheet', sheet: initialTileSheet, terrain: initialTerrain },
};
