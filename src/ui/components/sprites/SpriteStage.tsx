import { useI18n } from '../../../i18n/index.ts';
import { useApp } from '../../state/context.ts';
import type { Asset, StageView } from '../../state/types.ts';
import { Segmented } from '../common/Field.tsx';
import { Warnings } from '../common/Warnings.tsx';
import { AnimationView } from './AnimationView.tsx';
import { StatusLine } from '../common/StatusLine.tsx';
import { fmtNum } from '../../lib/format.ts';
import { SheetView } from './SheetView.tsx';
import { SourceView } from './SourceView.tsx';
import { useSpriteFixes } from './fixes.ts';

function Result({ asset }: { asset: Asset }) {
  const { t } = useI18n();
  const { state } = useApp();
  const result = state.run.results[asset.id];
  const fixFor = useSpriteFixes(asset, result);
  const { diag, sheet } = result;
  return (
    <>
      <StatusLine
        items={[
          { label: t('status.frames'), value: String(diag.regions.length) },
          ...(sheet.mode === 'pixel' ? [{ label: t('status.grid'), value: diag.grid ? `${fmtNum(diag.grid.periodX)} px` : t('status.noGrid') }] : []),
          { label: t('status.cell'), value: `${sheet.cell.w}×${sheet.cell.h}` },
          { label: t('status.height'), value: `${fmtNum(diag.refHeight, 0)} px` },
          ...(diag.palette?.length ? [{ label: t('status.colours'), value: String(diag.palette.length) }] : []),
        ]}
      />
      <Warnings warnings={diag.warnings} fixFor={fixFor} />
    </>
  );
}

/** The right column: view switch (Animation / Sheet / Original), the view itself, status and warnings. */
export function SpriteStage() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const { run, stageView } = state;
  const asset = state.assets.find((a) => a.id === state.selectedId);
  if (!asset) return null;
  const result = run.results[asset.id];
  const running = run.status === 'running';
  const friendlyError = run.error ? (/not implemented/i.test(run.error) ? t('error.notImplemented') : t('error.processing', { message: run.error })) : null;
  const pixelated = state.global.mode === 'pixel';

  return (
    <section className="stage-card" aria-label={t('stage.label')}>
      <div className="stage-head">
        <Segmented<StageView>
          name="stage-view"
          label={t('stage.views')}
          value={stageView}
          onChange={(view) => dispatch({ type: 'stageView', view })}
          options={[
            { value: 'animation', label: t('stage.animation') },
            { value: 'sheet', label: t('stage.sheet') },
            { value: 'original', label: t('stage.original') },
          ]}
        />
        {running && <span className="spinner-label" role="status"><i className="spinner" aria-hidden="true" />{t('stage.processing')}</span>}
      </div>
      {friendlyError && <p className="alert" role="alert">{friendlyError}</p>}
      <div className={running ? 'is-stale' : undefined}>
        {stageView === 'original' ? (
          <SourceView asset={asset} result={result} pixelated={pixelated} />
        ) : !result ? (
          <div className="stage-body waiting"><p className="on-stage-soft">{t('stage.waiting')}</p></div>
        ) : stageView === 'sheet' ? (
          <SheetView result={result} />
        ) : (
          <AnimationView result={result} key={asset.id} />
        )}
      </div>
      {result && <Result asset={asset} />}
    </section>
  );
}
