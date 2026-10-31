// UI state shapes. Settings are split in GLOBAL (whole batch: mode, sprite size, frame size, palette) and PER ASSET
// (type, background, segmentation, animations, offsets, recolour, relative size); see jobs.ts for how they map to SpriteJob.
import type { AnchorXMethod, ArtMode, BgOptions, ExportTarget, FrameOffset, FrameRegion, RGBA8, RGBAImage, SpriteAnchor, SpriteKind, SpriteResult, TileLayout, TileSetResult } from '../../core/types.ts';
import type { TileAtlasResult } from '../../core/tiles/index.ts';
import type { ItemsResult } from '../../core/items/index.ts';
import type { ParallaxResult } from '../../core/parallax/index.ts';
import type { TileGridInfo } from '../../worker/api.ts';
import type { AssetPromptForm, AssetPromptKind } from '../../core/prompts/assets.ts';
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
  /** Origin: the feet (characters, default) or the centre (effects, projectiles). */
  anchor: SpriteAnchor;
  autoBg: AutoBg | null;
}

/**
 * 'reduce' = quantize to `maxColors` shared colours; 'preset' / 'image' / 'custom' = a fixed palette every pixel snaps
 * to. The colours of 'custom' live in `GlobalSettings.customColors`, so they survive switching to another palette.
 */
export type PaletteChoice =
  | { kind: 'original' }
  | { kind: 'reduce' }
  | { kind: 'preset'; id: string }
  | { kind: 'image'; colors: RGBA8[]; from: string }
  | { kind: 'custom' };

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
  /** The user's own palette ('#rrggbb', at most 256): used when `palette` is 'custom'. */
  customColors: string[];
  /** Tile size of the game (16/32/48/64): sprite heights are shown in tiles and the kit is checked against it. */
  gameTile: number;
  /** Width in px of the game resolution (16:9) the Kit's test level runs at; see GAME_RESOLUTIONS. */
  gameRes: number;
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

export type PromptKind = 'sprite' | 'tile' | AssetPromptKind;
export type PromptForm = Omit<PromptOptions, 'lang'> & { promptLang: 'ui' | 'en' | 'es' };
export type TilePromptForm = Omit<TilePromptOptions, 'lang'>;
/** Forms of the other prompt kinds (atlas, directions, effects, items, parallax, video). */
export type AssetPrompts = { [K in AssetPromptKind]: AssetPromptForm<K> };

// ---------------------------------------------------------------- tiles tab

/** An image the user brought to the Tiles tab (decoded on the main thread). */
export interface LoadedImage {
  id: string;
  name: string;
  image: RGBAImage;
  autoBg: AutoBg | null;
}

export type TileKind = 'sheet' | 'terrain' | 'items' | 'parallax';
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

/** Items and icons tool: separate objects of an AI image → square cells of one size. */
export interface ItemsState {
  source: LoadedImage | null;
  mode: ArtMode;
  cellSize: number;
  /** 'common' = one scale for every item (the largest fills the cell); 'each' = every item fills its cell. */
  fill: 'common' | 'each';
  margin: number;
  /** true = items are the separate shapes of the image; false = one item per cell of `cols` × `rows`. */
  detectAuto: boolean;
  cols: number;
  rows: number;
  /** Columns of the output atlas; 0 = the squarest layout. */
  atlasCols: number;
  removeBg: boolean;
  bg: TileSheetState['bg'];
  maxColors: number;
  /** Detected item numbers crossed out (left out of the atlas). */
  excluded: number[];
  /** Names typed by the user, by detected item number (renaming never re-runs the processor). */
  names: Record<number, string>;
  view: 'atlas' | 'source';
  format: ExportTarget;
  allFormats: boolean;
  run: { status: RunStatus; sig: string | null; result: ItemsResult | null; error: string | null };
}

/** One layer of the parallax tool, in the order the user set (far → near). */
export interface ParallaxLayerDraft {
  image: LoadedImage;
  /** Cut the flat background colour out (nearer layers on a chroma key). */
  removeBg: boolean;
  /** Scroll factor; null = the default for its position (far 0.2, mid 0.5, near 0.8). */
  factor: number | null;
}

/** Parallax backgrounds: far → near layers → looping layers at the game height. */
export interface ParallaxState {
  layers: ParallaxLayerDraft[];
  mode: ArtMode;
  /** Layer height in px; null = the height of the game resolution (`GlobalSettings.gameRes`, shared with the Kit). */
  height: number | null;
  /** Make the right edge continue into the left one. */
  loop: boolean;
  /** Overlap band of the loop, % of the layer width. */
  overlap: number;
  bgTolerance: number;
  view: 'scroll' | 'wrap';
  /** Layer shown in the wrap check. */
  wrapLayer: number;
  /** Scroll speed of the preview, game px per second. */
  speed: number;
  /** Export name. */
  name: string;
  format: ExportTarget;
  allFormats: boolean;
  run: { status: RunStatus; sig: string | null; result: ParallaxResult | null; error: string | null };
}

export interface TilesState {
  kind: TileKind;
  parallax: ParallaxState;
  items: ItemsState;
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
  assetPrompts: AssetPrompts;
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
  | { [K in AssetPromptKind]: { type: 'assetPrompt/patch'; kind: K; patch: Partial<AssetPromptForm<K>> } }[AssetPromptKind]
  | { type: 'tiles/kind'; kind: TileKind }
  | { type: 'tiles/sheet'; patch: Partial<TileSheetState> }
  | { type: 'tiles/terrain'; patch: Partial<TerrainState> }
  | { type: 'tiles/items'; patch: Partial<ItemsState> }
  | { type: 'tiles/parallax'; patch: Partial<ParallaxState> };
