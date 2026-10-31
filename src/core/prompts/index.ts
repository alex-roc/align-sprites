// Prompt templates and guide-grid image for generating sprites with chat image models (Gemini, ChatGPT…).
import type { ArtMode, RGBAImage } from '../types.ts';

export type Lang = 'en' | 'es';
export type KeyColor = 'magenta' | 'green';

export interface PromptOptions {
  lang: Lang;
  mode: ArtMode;
  /** What the character is ("a knight with a blue cape"). */
  subject: string;
  /** Animation name ("walk", "idle", "attack"...). */
  action: string;
  frames: number;
  cols: number;
  /** Pixel mode: character height in art pixels (e.g. 32). */
  artHeight: number;
  view: 'side' | 'top-down' | 'front' | 'three-quarter';
  key: KeyColor;
  /** True when the student also attaches a reference image of the character. */
  withReference: boolean;
}

/** Full prompt text to paste into the chat, together with the guide image (and the reference, if any). */
export function buildSpritePrompt(o: PromptOptions): string {
  void o;
  throw new Error('not implemented');
}

export interface TilePromptOptions {
  lang: Lang;
  mode: ArtMode;
  /** Terrain material ("grass", "dirt path", "water"). */
  material: string;
  /** Tile size in art pixels (pixel mode). */
  tileSize: number;
  view: 'top-down' | 'side';
}

/** Prompt for ONE seamless square texture of a terrain material (no transitions, no objects). */
export function buildTilePrompt(o: TilePromptOptions): string {
  void o;
  throw new Error('not implemented');
}

export interface GuideOptions {
  cols: number;
  rows: number;
  /** Cell size in px of the guide image (e.g. 256). */
  cell: number;
  key: KeyColor;
  /** Draw a baseline ("feet line") at this fraction of the cell height (e.g. 0.9). */
  baseline?: number;
}

/**
 * Guide image: solid key colour (#FF00FF or #00FF00) with cell borders and a feet baseline drawn in a slightly
 * different shade of the same key (#E000E0 / #00E000) so background removal also erases the guides.
 * Small frame numbers in each cell's corner, same shade.
 */
export function makeGuideImage(o: GuideOptions): RGBAImage {
  void o;
  throw new Error('not implemented');
}
