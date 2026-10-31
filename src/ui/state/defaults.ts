import type { Asset, AnimDraft, AppState, AssetKind, AutoBg, GlobalSettings } from './types.ts';
import type { RGBAImage } from '../../core/types.ts';

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
};
