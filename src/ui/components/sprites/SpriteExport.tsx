import { slug } from '../../../core/export/common.ts';
import { useState } from 'react';
import type { ExportTarget, SpriteResult } from '../../../core/types.ts';
import { useI18n, type MessageKey } from '../../../i18n/index.ts';
import { buildZip } from '../../../worker/client.ts';
import { downloadBlob, rgbaToPngBlob } from '../../lib/image.ts';
import { hrefFor } from '../../route.ts';
import { useApp } from '../../state/context.ts';
import { exportNames } from '../../state/jobs.ts';
import { ExportCard } from '../common/ExportCard.tsx';

const ENGINES: ExportTarget[] = ['godot', 'gdevelop', 'kaplay', 'generic'];
const GUIDE_SECTION: Record<ExportTarget, string> = { godot: 'godot', gdevelop: 'gdevelop', kaplay: 'kaplay', generic: 'other' };

export function SpriteExport() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const names = exportNames(state.assets);
  const ready = state.assets.filter((a) => state.run.results[a.id]);
  const selected = state.assets.find((a) => a.id === state.selectedId);
  const selectedResult = selected ? state.run.results[selected.id] : undefined;
  const running = state.run.status === 'running';
  const engine = state.exportEngine;
  const targets: ExportTarget[] = state.exportAll ? ENGINES : [engine];

  const zip = async () => {
    setBusy(true);
    setError(null);
    try {
      // The export name follows the (possibly renamed) asset without re-running the pipeline.
      const results: SpriteResult[] = ready.map((a) => ({ ...state.run.results[a.id], name: names.get(a.id) ?? a.name }));
      const bytes = await buildZip(results, targets);
      const base = ready.length === 1 ? (names.get(ready[0].id) ?? 'align-sprites') : 'align-sprites';
      downloadBlob(new Blob([bytes as BlobPart], { type: 'application/zip' }), `${base}${state.exportAll ? '' : `-${engine}`}.zip`);
    } catch (e) {
      setError(t('error.export', { message: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(false);
    }
  };
  const png = async () => {
    if (!selected || !selectedResult) return;
    try {
      downloadBlob(await rgbaToPngBlob(selectedResult.sheet.image), `${names.get(selected.id) ?? 'sprite'}.png`);
    } catch (e) {
      setError(t('error.export', { message: e instanceof Error ? e.message : String(e) }));
    }
  };

  const label = t(`engine.${engine}`);
  return (
    <ExportCard<ExportTarget>
      name="engine"
      options={ENGINES.map((e) => ({ value: e, label: t(`engine.${e}`) }))}
      value={engine}
      onChange={(exportEngine) => dispatch({ type: 'export', patch: { exportEngine } })}
      steps={[1, 2, 3].map((n) => t(`engine.${engine}.s${n}` as MessageKey, { name: slug(names.get(selected?.id ?? '') ?? selected?.name ?? 'sprite') }))}
      guideHref={hrefFor('guide', GUIDE_SECTION[engine])}
      all={state.exportAll}
      onAll={(exportAll) => dispatch({ type: 'export', patch: { exportAll } })}
      primaryLabel={state.exportAll ? t('export.downloadAll') : t('export.downloadFor', { engine: label })}
      onPrimary={() => void zip()}
      secondaryLabel={t('export.pngOnly')}
      onSecondary={() => void png()}
      busy={busy}
      disabled={running || !ready.length}
      error={error}
      note={ready.length > 1 ? t('export.batchHint', { count: ready.length }) : undefined}
    />
  );
}
