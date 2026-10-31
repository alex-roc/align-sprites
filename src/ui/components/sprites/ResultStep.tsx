import { useI18n } from '../../../i18n/index.ts';
import { useApp } from '../../state/context.ts';
import { Step } from '../common/Step.tsx';
import { AnimPreview } from './AnimPreview.tsx';
import { AssetChips } from './AssetChips.tsx';
import { Diagnostics } from './Diagnostics.tsx';
import { ExportPanel } from './ExportPanel.tsx';
import { SheetView } from './SheetView.tsx';
import { SourceView } from './SourceView.tsx';

export function ResultStep() {
  const { t } = useI18n();
  const { state } = useApp();
  const { run } = state;
  const asset = state.assets.find((a) => a.id === state.selectedId);
  const result = asset ? run.results[asset.id] : undefined;
  const pixelated = state.global.mode === 'pixel';
  const friendlyError = run.error ? (/not implemented/i.test(run.error) ? t('error.notImplemented') : t('error.processing', { message: run.error })) : null;

  return (
    <Step
      n={3}
      title={t('step.result')}
      muted={!asset}
      actions={run.status === 'running' ? <span className="spinner-label" role="status"><i className="spinner" aria-hidden="true" />{t('result.processing')}</span> : undefined}
    >
      {!asset ? (
        <p className="muted">{t('step.needImage')}</p>
      ) : (
        <>
          <AssetChips />
          {friendlyError && <p className="alert" role="alert">{friendlyError}</p>}
          {!result && !friendlyError && <p className="muted">{t('result.waiting')}</p>}
          <div className={run.status === 'running' ? 'is-stale' : undefined}>
            <div className="result-grid">
              <section>
                <h3>{t('result.source')}</h3>
                <SourceView asset={asset} result={result} pixelated={pixelated} />
              </section>
              {result && (
                <section>
                  <h3>{t('result.sheet')}</h3>
                  <SheetView result={result} />
                </section>
              )}
            </div>
            {result && (
              <div className="result-grid">
                <section>
                  <h3>{t('result.preview')}</h3>
                  <AnimPreview result={result} key={asset.id} />
                </section>
                <section>
                  <h3>{t('result.diagnostics')}</h3>
                  <Diagnostics result={result} />
                </section>
              </div>
            )}
          </div>
          {state.assets.some((a) => run.results[a.id]) && <ExportPanel />}
        </>
      )}
    </Step>
  );
}
