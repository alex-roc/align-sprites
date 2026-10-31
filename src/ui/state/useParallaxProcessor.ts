// Debounced processor of the parallax tool: re-runs the worker ~300 ms after any setting that changes the pixels.
// Scroll factors are not part of the run (they only travel with the result), so editing a speed never re-runs it.
import { useEffect, useMemo, useRef } from 'react';
import { defaultFactors, type ParallaxInput, type ParallaxOptions, type ParallaxResult } from '../../core/parallax/index.ts';
import { resolutionByWidth } from '../../core/kit/level.ts';
import { buildParallax } from '../../worker/client.ts';
import { useApp } from './context.ts';
import { fixedPalette } from './jobs.ts';
import type { GlobalSettings, ParallaxState } from './types.ts';

const DEBOUNCE_MS = 300;

/** Layer height in px: the custom one, or the height of the game resolution. */
export function parallaxHeight(s: ParallaxState, g: GlobalSettings): number {
  return s.height ?? resolutionByWidth(g.gameRes).h;
}

/** Scroll factor of every layer: the typed one, or the default for its position. */
export function parallaxFactors(s: ParallaxState): number[] {
  const d = defaultFactors(s.layers.length);
  return s.layers.map((l, i) => l.factor ?? d[i]!);
}

/** The run result with the current factors (they can change without a re-run). */
export function withFactors(result: ParallaxResult, factors: number[]): ParallaxResult {
  return { ...result, layers: result.layers.map((l, i) => ({ ...l, factor: factors[i] ?? l.factor })) };
}

export function useParallaxProcessor() {
  const { state, dispatch } = useApp();
  const s = state.tiles.parallax;
  const height = parallaxHeight(s, state.global);
  const palette = useMemo(() => fixedPalette(state.global, s.mode), [state.global, s.mode]);
  const sig = useMemo(
    () =>
      s.layers.length
        ? JSON.stringify({ layers: s.layers.map((l) => [l.image.id, l.removeBg]), mode: s.mode, height, loop: s.loop, overlap: s.overlap, tol: s.bgTolerance, palette })
        : null,
    [s.layers, s.mode, height, s.loop, s.overlap, s.bgTolerance, palette],
  );
  const latest = useRef(s);
  const paletteRef = useRef(palette);
  useEffect(() => {
    latest.current = s;
    paletteRef.current = palette;
  });
  const runId = useRef(0);

  useEffect(() => {
    const id = ++runId.current;
    const cur = latest.current;
    if (!sig) {
      if (cur.run.result) dispatch({ type: 'tiles/parallax', patch: { run: { status: 'idle', sig: null, result: null, error: null } } });
      return;
    }
    if (cur.run.sig === sig && cur.run.status === 'ready') return;
    const patchRun = (p: Partial<ParallaxState['run']>) => dispatch({ type: 'tiles/parallax', patch: { run: { ...latest.current.run, ...p } } });
    const timer = setTimeout(() => {
      patchRun({ status: 'running', error: null });
      const inputs: ParallaxInput[] = cur.layers.map((l) => ({ image: l.image.image, removeBg: l.removeBg, factor: 0 }));
      const opts: ParallaxOptions = { mode: cur.mode, height, loop: cur.loop, overlap: cur.overlap / 100, bgTolerance: cur.bgTolerance, palette: paletteRef.current };
      buildParallax(inputs, opts).then(
        (result) => {
          if (id === runId.current) patchRun({ status: 'ready', sig, result, error: null });
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
