// Maps the Tiles tab forms → core options.
import type { TileAtlasOptions } from '../../core/tiles/index.ts';
import type { BgOptions, EdgeStyle } from '../../core/types.ts';
import type { EdgeStyleForm, TileSheetState } from './types.ts';

export function buildTileBg(s: TileSheetState): BgOptions {
  const strategy = s.bg.strategy === 'auto' ? (s.source?.autoBg?.strategy ?? 'flood') : s.bg.strategy;
  const bg: BgOptions = {
    color: s.bg.custom ? [s.bg.color[0], s.bg.color[1], s.bg.color[2], 255] : 'auto',
    tolerance: s.bg.tolerance,
    strategy,
    minHole: 16,
  };
  if (s.mode === 'cartoon') {
    bg.soft = { inner: 10, outer: 40 };
    bg.despill = true;
  }
  return bg;
}

export function buildAtlasOptions(s: TileSheetState): TileAtlasOptions {
  return {
    tileSize: s.tileSize,
    cols: s.gridAuto ? undefined : s.cols,
    rows: s.gridAuto ? undefined : s.rows,
    mode: s.mode,
    bg: s.removeBg ? buildTileBg(s) : undefined,
    maxColors: s.mode === 'pixel' && s.maxColors > 0 ? s.maxColors : undefined,
  };
}

export function buildEdgeStyle(f: EdgeStyleForm, mode: 'pixel' | 'cartoon'): EdgeStyle {
  return {
    margin: f.margin,
    blur: f.blur,
    noiseAmp: f.noiseAmp,
    noiseCells: f.noiseCells,
    seed: f.seed,
    outline: mode === 'pixel' && f.outline === 'auto' ? 'auto' : undefined,
  };
}
