// UI state shapes. Settings are split in GLOBAL (whole batch: mode, sprite size, frame size, palette) and PER ASSET
// (type, background, segmentation, animations, offsets, recolour, relative size); see jobs.ts for how they map to SpriteJob.
import type { AnchorXMethod, ArtMode, BgOptions, ExportTarget, FrameOffset, FrameRegion, RGBA8, RGBAImage, SpriteKind, SpriteResult, TileLayout, TileSetResult } from '../../core/types.ts';
import type { TileAtlasResult } from '../../core/tiles/index.ts';
import type { TileGridInfo } from '../../worker/api.ts';
import type { PromptOptions, TilePromptOptions } from '../../core/prompts/index.ts';

/** 'all' (every image side by side) only exists with 2+ images; 'sheet' (final sheet) only for sprite sheets. */
export type StageView = 'all' | 'animation' | 'sheet' | 'original';
export type AssetKind = SpriteKind;
export type BgStrategy = 'auto' | 'global' | 'flood';
export type SegMode = 'auto' | 'grid';

export interface AnimDraft {
  id: string;
  name: string;
  /** Frame range text ("0-5", "0,2,4-6"); blank = every frame. */
  frames: string;
  fps: number;
  loop: boolean;
  /** Mirror every frame (left-facing copy of a right-facing animation). */
  flipX: boolean;
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

/** What the upload inspection found (shown as "Detected: …"); null when the inspection failed. */
export interface Detected {
  kind: AssetKind;
  frameCount: number;
  /** Tallest frame in source px (a hint for "sprites have different heights"). */
  sourceHeight: number;
}

export interface Asset {
  id: string;
  fileName: string;
  /** Editable; becomes the export name. */
  name: string;
  /** Sprite sheet or single sprite: set from the inspection on upload, correctable by hand. */
  kind: AssetKind;
  image: RGBAImage;
  bg: BgSettings;
  seg: SegSettings;
  /** Hand-drawn frame boxes (segmentation 'manual'); null = automatic or grid. */
  regions: FrameRegion[] | null;
  anims: AnimDraft[];
  /** Manual nudges per detected frame index, in output px. */
  frameOffsets: Record<number, FrameOffset>;
  /** Colour swaps '#rrggbb' → '#rrggbb' (palette variants). */
  colorMap: Record<string, string>;
  detected: Detected | null;
  /** Size multiplier relative to the batch height (boss = 1.5). */
  relative: number;
  /** Which frames give the character's height: the median (default) or the tallest (jumps, crouches). */
  heightRef: 'median' | 'tallest';
  autoBg: AutoBg | null;
}

/** 'reduce' = quantize to `maxColors` shared colours; 'preset' / 'image' = a fixed palette every pixel snaps to. */
export type PaletteChoice =
  | { kind: 'original' }
  | { kind: 'reduce' }
  | { kind: 'preset'; id: string }
  | { kind: 'image'; colors: RGBA8[]; from: string };

export interface GlobalSettings {
  mode: ArtMode;
  /** Frame size: automatic (smallest multiple of 32 that fits everything) or custom width × height. */
  cellAuto: boolean;
  cellW: number;
  cellH: number;
  padBottom: number;
  /** Shared sprite height in output px; null = keep the original size. */
  targetHeight: number | null;
  /** Palette size used by 'reduce'. */
  maxColors: number;
  palette: PaletteChoice;
  /** Tile size of the game (16/32/48/64): sprite heights are shown in tiles and the kit is checked against it. */
  gameTile: number;
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
export type TileFormat = 'godot' | 'tiled' | 'png';
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
  view: 'atlas' | 'source';
  format: TileFormat;
  allFormats: boolean;
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
  view: 'atlas' | 'map';
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
  assets: Asset[];
  selectedId: string | null;
  global: GlobalSettings;
  /** Engine chosen in the export panel (persisted); `exportAll` ships every engine instead. */
  exportEngine: ExportTarget;
  exportAll: boolean;
  /** GDevelop: also ship the Piskel spritesheet strips (off by default, not persisted). */
  exportGdSheets: boolean;
  stageView: StageView;
  run: RunState;
  promptKind: PromptKind;
  prompt: PromptForm;
  tilePrompt: TilePromptForm;
  tiles: TilesState;
}

export type Action =
  | { type: 'asset/add'; assets: Asset[]; select?: boolean }
  | { type: 'asset/remove'; id: string }
  | { type: 'asset/patch'; id: string; patch: Partial<Omit<Asset, 'id' | 'image'>> }
  | { type: 'asset/select'; id: string }
  | { type: 'global/patch'; patch: Partial<GlobalSettings> }
  | { type: 'export'; patch: Partial<{ exportEngine: ExportTarget; exportAll: boolean; exportGdSheets: boolean }> }
  | { type: 'stageView'; view: StageView }
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
