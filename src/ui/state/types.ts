// UI state shapes. Settings are split in GLOBAL (whole batch: mode, cell, height, colours) and PER ASSET
// (background, segmentation, animations, relative size); see jobs.ts for how they map to SpriteJob.
import type { AnchorXMethod, ArtMode, BgOptions, ExportTarget, RGBA8, RGBAImage, SpriteResult } from '../../core/types.ts';
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
  | { type: 'tilePrompt/patch'; patch: Partial<TilePromptForm> };
