import { CARTOON_DEFAULT_HEIGHT, initialState } from './defaults.ts';
import type { Action, AppState } from './types.ts';

export { initialState };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'asset/add': {
      const assets = [...state.assets, ...action.assets];
      const selectedId = action.select ? (action.assets[0]?.id ?? state.selectedId) : (state.selectedId ?? action.assets[0]?.id ?? null);
      // The second image opens "All together": the first thing to check in a batch is that they share a scale.
      const stageView = state.assets.length < 2 && assets.length >= 2 ? 'all' : state.stageView;
      return { ...state, assets, selectedId, stageView };
    }
    case 'asset/remove': {
      const assets = state.assets.filter((a) => a.id !== action.id);
      const selectedId = state.selectedId === action.id ? (assets[0]?.id ?? null) : state.selectedId;
      const { [action.id]: _r, ...results } = state.run.results;
      const { [action.id]: _c, ...frameCounts } = state.run.frameCounts;
      const stageView = state.stageView === 'all' && assets.length < 2 ? 'animation' : state.stageView;
      return { ...state, assets, selectedId, stageView, run: { ...state.run, results, frameCounts } };
    }
    case 'asset/patch':
      return { ...state, assets: state.assets.map((a) => (a.id === action.id ? { ...a, ...action.patch } : a)) };
    case 'asset/select':
      return { ...state, selectedId: action.id };
    case 'global/patch': {
      let global = { ...state.global, ...action.patch };
      // Cartoon at native size means the full source resolution: propose a sensible shared height.
      if (action.patch.mode === 'cartoon' && global.targetHeight === null) global = { ...global, targetHeight: CARTOON_DEFAULT_HEIGHT };
      return { ...state, global };
    }
    case 'export':
      return { ...state, ...action.patch };
    case 'stageView':
      return { ...state, stageView: action.view };
    case 'run/start':
      return { ...state, run: { ...state.run, status: 'running', error: null } };
    case 'run/done':
      return { ...state, run: { status: 'ready', results: action.results, frameCounts: action.frameCounts, error: null } };
    case 'run/error':
      return { ...state, run: { ...state.run, status: 'error', error: action.message } };
    case 'run/clear':
      return { ...state, run: { status: 'idle', results: {}, frameCounts: {}, error: null } };
    case 'promptKind':
      return { ...state, promptKind: action.kind };
    case 'prompt/patch':
      return { ...state, prompt: { ...state.prompt, ...action.patch } };
    case 'tilePrompt/patch':
      return { ...state, tilePrompt: { ...state.tilePrompt, ...action.patch } };
    case 'assetPrompt/patch':
      return { ...state, assetPrompts: { ...state.assetPrompts, [action.kind]: { ...state.assetPrompts[action.kind], ...action.patch } } };
    case 'tiles/kind':
      return { ...state, tiles: { ...state.tiles, kind: action.kind } };
    case 'tiles/sheet':
      return { ...state, tiles: { ...state.tiles, sheet: { ...state.tiles.sheet, ...action.patch } } };
    case 'tiles/parallax':
      return { ...state, tiles: { ...state.tiles, parallax: { ...state.tiles.parallax, ...action.patch } } };
    case 'tiles/items':
      return { ...state, tiles: { ...state.tiles, items: { ...state.tiles.items, ...action.patch } } };
    case 'tiles/terrain':
      return { ...state, tiles: { ...state.tiles, terrain: { ...state.tiles.terrain, ...action.patch } } };
  }
}
