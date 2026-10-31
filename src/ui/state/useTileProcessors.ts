// Debounced processors of the Tiles tab: re-run the worker ~300 ms after any setting that changes the output.
import { useEffect, useMemo, useRef } from 'react';
import { composeTerrain, normalizeTiles, renderTerrainPreview } from '../../worker/client.ts';
import { randomMap } from '../lib/map.ts';
import { useApp } from './context.ts';
import { buildAtlasOptions, buildEdgeStyle } from './tilesJobs.ts';
import type { TerrainState, TileSheetState } from './types.ts';

const DEBOUNCE_MS = 300;
export const MAP_W = 16;
export const MAP_H = 10;

/** Re-runs the atlas normalizer ~300 ms after any setting that affects the output changes. */
export function useSheetProcessor() {
  const { state, dispatch } = useApp();
  const s = state.tiles.sheet;
  const options = useMemo(() => buildAtlasOptions(s), [s]);
  const sig = useMemo(() => (s.source ? JSON.stringify({ id: s.source.id, ...options }) : null), [s.source, options]);
  const latest = useRef(s);
  useEffect(() => {
    latest.current = s;
  });
  const runId = useRef(0);

  useEffect(() => {
    const id = ++runId.current;
    const src = latest.current.source;
    if (!src || !sig) return;
    if (latest.current.run.sig === sig && latest.current.run.status === 'ready') return;
    const patchRun = (p: Partial<TileSheetState['run']>) => dispatch({ type: 'tiles/sheet', patch: { run: { ...latest.current.run, ...p } } });
    const timer = setTimeout(() => {
      patchRun({ status: 'running', error: null });
      normalizeTiles(src.image, options).then(
        (out) => {
          if (id === runId.current) patchRun({ status: 'ready', sig, result: out.result, grid: out.grid, error: null });
        },
        (e: unknown) => {
          if (id === runId.current) patchRun({ status: 'error', error: e instanceof Error ? e.message : String(e) });
        },
      );
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, dispatch]);
}


type Run = TerrainState['run'];

/** Composes the tile set ~300 ms after a setting changes, then renders the test map with the current seed. */
export function useTerrainProcessor() {
  const { state, dispatch } = useApp();
  const s = state.tiles.terrain;
  const b = s.bTransparent ? null : s.b;
  const ready = !!s.a && (s.bTransparent || !!s.b);
  const sig = useMemo(
    () => (ready ? JSON.stringify({ a: s.a!.id, b: b?.id ?? null, T: s.tileSize, layout: s.layout, style: s.style, mode: s.mode }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, s.a, b, s.tileSize, s.layout, s.style, s.mode],
  );
  const latest = useRef(s);
  useEffect(() => {
    latest.current = s;
  });
  const runId = useRef(0);
  const previewSeed = useRef<number | null>(null);
  const previewId = useRef(0);

  useEffect(() => {
    const id = ++runId.current;
    const cur = latest.current;
    if (!sig || !cur.a) return;
    if (cur.run.sig === sig && cur.run.status === 'ready') return;
    const a = cur.a;
    const other = cur.bTransparent ? null : cur.b;
    const patchRun = (p: Partial<Run>, extra: Partial<TerrainState> = {}) => dispatch({ type: 'tiles/terrain', patch: { run: { ...latest.current.run, ...p }, ...extra } });
    const timer = setTimeout(async () => {
      patchRun({ status: 'running', error: null });
      try {
        const style = buildEdgeStyle(cur.style, cur.mode);
        const out = await composeTerrain(a.image, other?.image ?? null, cur.tileSize, cur.layout, style, cur.mode);
        if (id !== runId.current) return;
        const seed = latest.current.mapSeed;
        const map = randomMap(seed, MAP_W, MAP_H);
        const preview = await renderTerrainPreview(map, MAP_W, MAP_H);
        if (id !== runId.current) return;
        previewSeed.current = seed;
        patchRun(
          { status: 'ready', sig, set: out.set, tileA: out.tileA, tileB: out.tileB, seamA: out.seamA, seamB: out.seamB, error: null },
          { preview },
        );
      } catch (e) {
        if (id === runId.current) patchRun({ status: 'error', error: e instanceof Error ? e.message : String(e) });
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, dispatch]);

  // Shuffle: only the test map changes, the tile set stays.
  useEffect(() => {
    const cur = latest.current;
    if (cur.run.status !== 'ready' || cur.run.sig !== sig || previewSeed.current === s.mapSeed) return;
    const id = ++previewId.current;
    const seed = s.mapSeed;
    renderTerrainPreview(randomMap(seed, MAP_W, MAP_H), MAP_W, MAP_H).then(
      (preview) => {
        if (id !== previewId.current) return;
        previewSeed.current = seed;
        dispatch({ type: 'tiles/terrain', patch: { preview } });
      },
      () => undefined,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.mapSeed]);
}

