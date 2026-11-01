// Headless component: re-runs the sprite batch ~300 ms after any setting that affects the output changes, and hosts
// the processors of the World and Items tools, so their results stay current (and reach the Kit) whatever tab is open.
import { useEffect, useMemo, useRef } from 'react';
import { runBatch } from '../../worker/client.ts';
import { useApp } from './context.ts';
import { buildJobs, jobsSignature } from './jobs.ts';
import { useItemsProcessor } from './useItemsProcessor.ts';
import { useParallaxProcessor } from './useParallaxProcessor.ts';
import { useSheetProcessor, useTerrainProcessor } from './useTileProcessors.ts';

const DEBOUNCE_MS = 300;

export function Processor() {
  useSheetProcessor();
  useTerrainProcessor();
  useParallaxProcessor();
  useItemsProcessor();
  const { state, dispatch } = useApp();
  const bundle = useMemo(() => buildJobs(state.assets, state.global, state.run.frameCounts), [state.assets, state.global, state.run.frameCounts]);
  const signature = useMemo(() => jobsSignature(bundle), [bundle]);
  const runId = useRef(0);

  useEffect(() => {
    const id = ++runId.current; // invalidates any run still in flight
    const { jobs, assetIds } = bundle; // the effect only re-runs when the signature changes
    if (!jobs.length) {
      dispatch({ type: 'run/clear' });
      return;
    }
    const timer = setTimeout(() => {
      dispatch({ type: 'run/start' });
      runBatch(jobs).then(
        (list) => {
          if (id !== runId.current) return;
          const results: Record<string, (typeof list)[number]> = {};
          const frameCounts: Record<string, number> = {};
          list.forEach((r, i) => {
            results[assetIds[i]] = r;
            frameCounts[assetIds[i]] = r.diag.regions.length;
          });
          dispatch({ type: 'run/done', results, frameCounts });
        },
        (e: unknown) => {
          if (id !== runId.current) return;
          dispatch({ type: 'run/error', message: e instanceof Error ? e.message : String(e) });
        },
      );
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, dispatch]);

  return null;
}
