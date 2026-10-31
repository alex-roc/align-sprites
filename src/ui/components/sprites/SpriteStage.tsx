import { useI18n } from '../../../i18n/index.ts';
import { useApp } from '../../state/context.ts';
import type { Asset, StageView } from '../../state/types.ts';
import { Segmented } from '../common/Field.tsx';
import { Warnings } from '../common/Warnings.tsx';
import { AllTogether } from './AllTogether.tsx';
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
          ...(asset.kind === 'sheet' ? [{ label: t('status.frames'), value: String(diag.regions.length) }] : []),
          ...(sheet.mode === 'pixel' ? [{ label: t('status.grid'), value: diag.grid ? `${fmtNum(diag.grid.periodX)} px` : t('status.noGrid') }] : []),
          { label: t('status.frameSize'), value: `${sheet.cell.w}×${sheet.cell.h}` },
          { label: t('status.height'), value: `${fmtNum(diag.refHeight, 0)} px` },
          ...(diag.palette?.length ? [{ label: t('status.colours'), value: String(diag.palette.length) }] : []),
        ]}
      />
      <Warnings warnings={diag.warnings} fixFor={fixFor} />
    </>
  );
}

/**
 * The right column: view switch, the view itself, status and warnings. Sprite sheets get Animation / Final sheet /
 * Original, single sprites Sprite / Original, and a batch of 2+ images starts with "All together".
 */
export function SpriteStage() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const { run } = state;
  const asset = state.assets.find((a) => a.id === state.selectedId);
  if (!asset) return null;
  const result = run.results[asset.id];
  const running = run.status === 'running';
  const friendlyError = run.error ? (/not implemented/i.test(run.error) ? t('error.notImplemented') : t('error.processing', { message: run.error })) : null;
  const pixelated = state.global.mode === 'pixel';
  const single = asset.kind === 'single';
  const batch = state.assets.length > 1;

  const options: { value: StageView; label: string }[] = [
    ...(batch ? [{ value: 'all' as const, label: t('stage.all') }] : []),
    { value: 'animation', label: single ? t('stage.sprite') : t('stage.animation') },
    ...(single ? [] : [{ value: 'sheet' as const, label: t('stage.sheet') }]),
    { value: 'original', label: t('stage.original') },
  ];
  // A view that does not exist for this image (Final sheet on a single sprite) falls back to the animation.
  const view = options.some((o) => o.value === state.stageView) ? state.stageView : 'animation';

  return (
    <section className="stage-card" aria-label={t('stage.label')}>
      <div className="stage-head">
        <Segmented<StageView> name="stage-view" label={t('stage.views')} value={view} onChange={(v) => dispatch({ type: 'stageView', view: v })} options={options} />
        {running && <span className="spinner-label" role="status"><i className="spinner" aria-hidden="true" />{t('stage.processing')}</span>}
      </div>
      {friendlyError && <p className="alert" role="alert">{friendlyError}</p>}
      <div className={running ? 'is-stale' : undefined}>
        {view === 'original' ? (
          <SourceView asset={asset} result={result} pixelated={pixelated} />
        ) : view === 'all' ? (
          <AllTogether />
        ) : !result ? (
          <div className="stage-body waiting"><p className="on-stage-soft">{t('stage.waiting')}</p></div>
        ) : view === 'sheet' ? (
          <SheetView result={result} />
        ) : (
          <AnimationView asset={asset} result={result} key={asset.id + asset.kind} />
        )}
      </div>
      {result && view === 'all' && <p className="muted">{t('stage.statusOf', { name: asset.name })}</p>}
      {result && <Result asset={asset} />}
    </section>
  );
}
