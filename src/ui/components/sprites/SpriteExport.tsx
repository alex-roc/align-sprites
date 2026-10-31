import { feetOrigin, slug } from '../../../core/export/common.ts';
import { gdevelopFramePrefix } from '../../../core/export/gdevelop.ts';
import { useState } from 'react';
import type { ExportTarget, SpriteResult } from '../../../core/types.ts';
import { useI18n, type MessageKey } from '../../../i18n/index.ts';
import { buildZip } from '../../../worker/client.ts';
import { downloadBlob, rgbaToPngBlob } from '../../lib/image.ts';
import { hrefFor } from '../../route.ts';
import { useApp } from '../../state/context.ts';
import { exportNames } from '../../state/jobs.ts';
import { ExportCard } from '../common/ExportCard.tsx';
import { Check } from '../common/Field.tsx';

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
  const batch = ready.length > 1;
  const label = t(`engine.${engine}`);

  // The export name follows the (possibly renamed) asset without re-running the pipeline.
  const named = (ids: string[]): SpriteResult[] => ids.map((id) => ({ ...state.run.results[id], name: names.get(id) ?? '' }));
  const zip = async (ids: string[], base: string) => {
    setBusy(true);
    setError(null);
    try {
      const bytes = await buildZip(named(ids), targets, { gdevelopSpritesheets: state.exportGdSheets });
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

  const slugName = slug(names.get(selected?.id ?? '') ?? selected?.name ?? 'sprite');
  // A single sprite has no animations: its steps talk about one image.
  const stepKey = (n: number) => (selected?.kind === 'single' ? `engine.${engine}.single.s${n}` : `engine.${engine}.s${n}`) as MessageKey;
  const count = ready.length;
  // Exact values of the selected sprite for the steps (GDevelop: origin and time between frames).
  const sheet = selectedResult?.sheet;
  const origin = sheet ? feetOrigin(sheet) : { x: 0, y: 0 };
  const fps = sheet?.anims[0]?.fps ?? 8;
  const frames0 = sheet ? `${gdevelopFramePrefix(slugName, sheet, 0)}_00.png` : `${slugName}_00.png`;
  const stepParams = { name: slugName, frames0, ox: origin.x, oy: origin.y, fps: Math.round(fps * 100) / 100, interval: Math.round(1000 / fps) / 1000 };
  const activeName = selected?.name ?? '';

  return (
    <ExportCard<ExportTarget>
      name="engine"
      options={ENGINES.map((e) => ({ value: e, label: t(`engine.${e}`) }))}
      value={engine}
      onChange={(exportEngine) => dispatch({ type: 'export', patch: { exportEngine } })}
      steps={[1, 2, 3].map((n) => t(stepKey(n), stepParams))}
      guideHref={hrefFor('guide', GUIDE_SECTION[engine])}
      all={state.exportAll}
      onAll={(exportAll) => dispatch({ type: 'export', patch: { exportAll } })}
      primaryLabel={
        batch
          ? state.exportAll ? t('export.downloadBatchAll', { count }) : t('export.downloadBatch', { count, engine: label })
          : state.exportAll ? t('export.downloadAll') : t('export.downloadFor', { engine: label })
      }
      onPrimary={() => void zip(ready.map((a) => a.id), batch ? 'align-sprites' : (names.get(ready[0]?.id ?? '') ?? 'align-sprites'))}
      secondaryLabel={batch ? t('export.pngOf', { name: activeName }) : t('export.pngOnly')}
      onSecondary={() => void png()}
      extra={
        batch && selectedResult ? (
          <button type="button" className="btn" disabled={busy || running} onClick={() => void zip([selected!.id], names.get(selected!.id) ?? 'sprite')}>
            {t('export.onlyActive', { name: activeName, engine: state.exportAll ? t('export.all') : label })}
          </button>
        ) : undefined
      }
      busy={busy}
      disabled={running || !ready.length}
      error={error}
      note={batch ? t('export.includes', { names: ready.map((a) => names.get(a.id) ?? a.name).join(', ') }) : undefined}
      choices={
        targets.includes('gdevelop') && ready.some((a) => a.kind === 'sheet') ? (
          <Check
            checked={state.exportGdSheets}
            onChange={(exportGdSheets) => dispatch({ type: 'export', patch: { exportGdSheets } })}
            label={t('export.gdSheets')}
          />
        ) : undefined
      }
    />
  );
}
