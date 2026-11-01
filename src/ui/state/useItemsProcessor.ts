// Debounced processor of the Items tool: re-runs the worker ~300 ms after any setting that changes the atlas.
import { useEffect, useMemo, useRef } from 'react';
import { normalizeItems } from '../../worker/client.ts';
import { useApp } from './context.ts';
import { fixedPalette } from './jobs.ts';
import { buildItemsOptions } from './tilesJobs.ts';
import type { ItemsState } from './types.ts';

const DEBOUNCE_MS = 300;

/** Item names are not part of the signature: renaming never re-runs, the export applies the current names. */
export function useItemsProcessor() {
  const { state, dispatch } = useApp();
  const s = state.items;
  const options = useMemo(() => buildItemsOptions(s), [s]);
  // The kit's shared palette (when fixed) also applies to the items.
  const palette = useMemo(() => fixedPalette(state.global, s.mode), [state.global, s.mode]);
  const sig = useMemo(() => (s.source ? JSON.stringify({ id: s.source.id, ...options, palette }) : null), [s.source, options, palette]);
  const latest = useRef(s);
  const paletteRef = useRef(palette);
  useEffect(() => {
    latest.current = s;
    paletteRef.current = palette;
  });
  const runId = useRef(0);

  useEffect(() => {
    const id = ++runId.current;
    const src = latest.current.source;
    if (!src || !sig) return;
    if (latest.current.run.sig === sig && latest.current.run.status === 'ready') return;
    const patchRun = (p: Partial<ItemsState['run']>) => dispatch({ type: 'items/patch', patch: { run: { ...latest.current.run, ...p } } });
    const timer = setTimeout(() => {
      patchRun({ status: 'running', error: null });
      normalizeItems(src.image, options, paletteRef.current).then(
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
