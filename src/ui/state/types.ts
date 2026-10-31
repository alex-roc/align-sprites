// UI state shapes. Settings are split in GLOBAL (whole batch: mode, cell, height, colours) and PER ASSET
// (background, segmentation, animations, relative size); see jobs.ts for how they map to SpriteJob.
import type { AnchorXMethod, ArtMode, BgOptions, ExportTarget, RGBA8, RGBAImage, SpriteResult, TileLayout, TileSetResult } from '../../core/types.ts';
import type { TileAtlasResult } from '../../core/tiles/index.ts';
import type { AtlasExportTargets, TileGridInfo } from '../../worker/api.ts';
import type { PromptOptions, TilePromptOptions } from '../../core/prompts/index.ts';

export type TabId = 'sprites' | 'prompts' | 'tiles';
export type AssetKind = 'sheet' | 'single';
export type BgStrategy = 'auto' | 'global' | 'flood';
export type SegMode = 'auto' | 'grid' | 'single';

export interface AnimDraft {
  id: string;
  name: string;
  /** Frame range text ("0-5", "0,2,4-6"); blank = every frame. */
  frames: string;
  fps: number;
  loop: boolean;
}

export interface BgSettings {
  strategy: BgStrategy;
  /** false = detect the colour automatically; true = use `color`. */
  custom: boolean;
  color: [number, number, number];
  tolerance: number;
}

export interface SegSettings {
  mode: SegMode;
  rows: number;
  cols: number;
}

/** Colour and strategy detected on upload (autoBgOptions), used by the "auto" background strategy. */
export interface AutoBg {
  color: RGBA8;
  strategy: BgOptions['strategy'];
}

export interface Asset {
  id: string;
  fileName: string;
  /** Editable; becomes the export name. */
  name: string;
  kind: AssetKind;
  image: RGBAImage;
  bg: BgSettings;
  seg: SegSettings;
  anims: AnimDraft[];
  /** Size multiplier relative to the batch height (boss = 1.5). */
  relative: number;
  autoBg: AutoBg | null;
}

export interface GlobalSettings {
  mode: ArtMode;
  cellAuto: boolean;
  cellW: number;
  cellH: number;
  padBottom: number;
  /** Shared character height in output px; null = keep the native size. */
  targetHeight: number | null;
  /** Pixel mode: palette size, 0 = off. */
  maxColors: number;
  anchorX: AnchorXMethod;
}

export interface RunState {
  status: 'idle' | 'running' | 'ready' | 'error';
  /** Latest results by asset id. Kept while a new run is in flight. */
  results: Record<string, SpriteResult>;
  /** Detected frame count by asset id (resolves blank animation ranges). */
  frameCounts: Record<string, number>;
  error: string | null;
}

export type PromptKind = 'sprite' | 'tile';
export type PromptForm = Omit<PromptOptions, 'lang'> & { promptLang: 'ui' | 'en' | 'es' };
export type TilePromptForm = Omit<TilePromptOptions, 'lang'>;

// ---------------------------------------------------------------- tiles tab

/** An image the user brought to the Tiles tab (decoded on the main thread). */
export interface LoadedImage {
  id: string;
  name: string;
  image: RGBAImage;
  autoBg: AutoBg | null;
}

export type TileKind = 'sheet' | 'terrain';
export type TileBgStrategy = 'auto' | BgOptions['strategy'];
export type RunStatus = 'idle' | 'running' | 'ready' | 'error';

export interface TileSheetState {
  source: LoadedImage | null;
  mode: ArtMode;
  tileSize: number;
  gridAuto: boolean;
  cols: number;
  rows: number;
  removeBg: boolean;
  bg: { strategy: TileBgStrategy; custom: boolean; color: [number, number, number]; tolerance: number };
  maxColors: number;
  targets: AtlasExportTargets;
  run: { status: RunStatus; sig: string | null; result: TileAtlasResult | null; grid: TileGridInfo | null; error: string | null };
}

/** Edge style as edited in the form (numbers + outline switch); converted to EdgeStyle for the core. */
export interface EdgeStyleForm {
  margin: number;
  blur: number;
  noiseAmp: number;
  noiseCells: number;
  seed: number;
  outline: 'none' | 'auto';
}

export interface TerrainState {
  a: LoadedImage | null;
  b: LoadedImage | null;
  /** true = no texture B: A is painted over transparency (an overlay layer). */
  bTransparent: boolean;
  mode: ArtMode;
  tileSize: number;
  layout: TileLayout;
  style: EdgeStyleForm;
  /** Seed of the random test map (the "shuffle" button changes it). */
  mapSeed: number;
  /** Test map rendered with the current textures and style. */
  preview: RGBAImage | null;
  run: {
    status: RunStatus;
    sig: string | null;
    set: TileSetResult | null;
    tileA: RGBAImage | null;
    tileB: RGBAImage | null;
    seamA: number | null;
    seamB: number | null;
    error: string | null;
  };
}

export interface TilesState {
  kind: TileKind;
  sheet: TileSheetState;
  terrain: TerrainState;
}

export interface AppState {
  tab: TabId;
  assets: Asset[];
  selectedId: string | null;
  global: GlobalSettings;
  targets: ExportTarget[];
  run: RunState;
  promptKind: PromptKind;
  prompt: PromptForm;
  tilePrompt: TilePromptForm;
  tiles: TilesState;
}

export type Action =
  | { type: 'tab'; tab: TabId }
  | { type: 'asset/add'; assets: Asset[] }
  | { type: 'asset/remove'; id: string }
  | { type: 'asset/patch'; id: string; patch: Partial<Omit<Asset, 'id' | 'image'>> }
  | { type: 'asset/select'; id: string }
  | { type: 'global/patch'; patch: Partial<GlobalSettings> }
  | { type: 'targets'; targets: ExportTarget[] }
  | { type: 'run/start' }
  | { type: 'run/done'; results: Record<string, SpriteResult>; frameCounts: Record<string, number> }
  | { type: 'run/error'; message: string }
  | { type: 'run/clear' }
  | { type: 'promptKind'; kind: PromptKind }
  | { type: 'prompt/patch'; patch: Partial<PromptForm> }
  | { type: 'tilePrompt/patch'; patch: Partial<TilePromptForm> }
  | { type: 'tiles/kind'; kind: TileKind }
  | { type: 'tiles/sheet'; patch: Partial<TileSheetState> }
  | { type: 'tiles/terrain'; patch: Partial<TerrainState> };
