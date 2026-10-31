import { useState } from 'react';
import type { ExportTarget, SpriteResult } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { buildZip } from '../../../worker/client.ts';
import { downloadBlob, rgbaToPngBlob } from '../../lib/image.ts';
import { useApp } from '../../state/context.ts';
import { exportNames } from '../../state/jobs.ts';
import { Check } from '../common/Field.tsx';

const TARGETS: ExportTarget[] = ['godot', 'gdevelop', 'kaplay', 'generic'];

export function ExportPanel() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const names = exportNames(state.assets);
  const ready = state.assets.filter((a) => state.run.results[a.id]);
  const selected = state.assets.find((a) => a.id === state.selectedId);
  const selectedResult = selected ? state.run.results[selected.id] : undefined;
  const running = state.run.status === 'running';

  const toggle = (target: ExportTarget, on: boolean) =>
    dispatch({ type: 'targets', targets: TARGETS.filter((x) => (x === target ? on : state.targets.includes(x))) });

  const downloadZip = async () => {
    setBusy(true);
    setError(null);
    try {
      // The export name follows the (possibly renamed) asset without re-running the pipeline.
      const results: SpriteResult[] = ready.map((a) => ({ ...state.run.results[a.id], name: names.get(a.id) ?? a.name }));
      const zip = await buildZip(results, state.targets);
      const base = ready.length === 1 ? (names.get(ready[0].id) ?? 'align-sprites') : 'align-sprites';
      downloadBlob(new Blob([zip as BlobPart], { type: 'application/zip' }), `${base}.zip`);
    } catch (e) {
      setError(t('error.export', { message: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(false);
    }
  };

  const downloadPng = async () => {
    if (!selected || !selectedResult) return;
    try {
      downloadBlob(await rgbaToPngBlob(selectedResult.sheet.image), `${names.get(selected.id) ?? 'sprite'}.png`);
    } catch (e) {
      setError(t('error.export', { message: e instanceof Error ? e.message : String(e) }));
    }
  };

  return (
    <div className="export">
      <h3>{t('export.title')}</h3>
      <div className="row wrap">
        {TARGETS.map((target) => (
          <Check key={target} checked={state.targets.includes(target)} onChange={(on) => toggle(target, on)} label={t(`export.${target}`)} />
        ))}
      </div>
      <div className="row wrap">
        <button type="button" className="btn btn-primary" disabled={busy || running || !ready.length || !state.targets.length} onClick={() => void downloadZip()}>
          {busy ? t('export.working') : t('export.zip')}
        </button>
        <button type="button" className="btn" disabled={!selectedResult || running} onClick={() => void downloadPng()}>
          {t('export.png')}
        </button>
      </div>
      <small className="hint">{ready.length > 1 ? t('export.batchHint', { count: ready.length }) : t('export.hint')}</small>
      {error && <p className="alert" role="alert">{error}</p>}
    </div>
  );
}
