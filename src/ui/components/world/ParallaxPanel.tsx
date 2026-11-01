import { useMemo, useRef, useState } from 'react';
import { slug } from '../../../core/export/common.ts';
import { GAME_RESOLUTIONS, resolutionByWidth } from '../../../core/kit/level.ts';
import { layerRoles, wantsCutout } from '../../../core/parallax/index.ts';
import type { ArtMode, ExportTarget, Warning } from '../../../core/types.ts';
import { useI18n, type MessageKey } from '../../../i18n/index.ts';
import { buildParallaxZip } from '../../../worker/client.ts';
import { cx } from '../../cx.ts';
import { fetchPublicImage } from '../../dev/examples.ts';
import { downloadBlob } from '../../lib/image.ts';
import { useDropPaste } from '../../lib/useDropPaste.ts';
import { hrefFor } from '../../route.ts';
import { useApp } from '../../state/context.ts';
import type { ParallaxLayerDraft, ParallaxState } from '../../state/types.ts';
import { useLoadImage } from '../../state/useLoadImage.ts';
import { parallaxFactors, parallaxHeight, withFactors } from '../../state/useParallaxProcessor.ts';
import { DropOverlay } from '../common/DropOverlay.tsx';
import { EmptyStage } from '../common/EmptyStage.tsx';
import { ExportCard } from '../common/ExportCard.tsx';
import { Check, Field, NumberInput, Segmented, Slider } from '../common/Field.tsx';
import { PaletteNote } from '../common/PaletteField.tsx';
import { RgbaCanvas } from '../common/RgbaCanvas.tsx';
import { Fold, Section } from '../common/Section.tsx';
import { StatusLine } from '../common/StatusLine.tsx';
import { Warnings, type Fix } from '../common/Warnings.tsx';
import { ParallaxPlayer, WrapCheck } from './ParallaxPreview.tsx';

const MAX_LAYERS = 4;
const ENGINES: ExportTarget[] = ['godot', 'gdevelop', 'kaplay', 'generic'];
const ROLE_KEYS = {
  far: 'parallax.role.far',
  mid: 'parallax.role.mid',
  near: 'parallax.role.near',
  front: 'parallax.role.front',
} as const satisfies Record<string, MessageKey>;
const roleKey = (role: string): MessageKey => ROLE_KEYS[role as keyof typeof ROLE_KEYS] ?? 'parallax.role.far';

export function ParallaxPanel() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const s = state.world.parallax;
  const { load, error, busy } = useLoadImage();
  const patch = (p: Partial<ParallaxState>) => dispatch({ type: 'world/parallax', patch: p });

  /** Adds images as the next layers (far → near), up to 4. */
  const addFiles = async (files: { blob: Blob; name: string }[]) => {
    const drafts: ParallaxLayerDraft[] = [];
    for (const f of files.slice(0, MAX_LAYERS - s.layers.length)) {
      const image = await load(f.blob, f.name);
      if (image) drafts.push({ image, removeBg: wantsCutout(image.image, s.layers.length + drafts.length), factor: null });
    }
    if (drafts.length) patch({ layers: [...s.layers, ...drafts], view: 'scroll' });
  };
  const { dragging } = useDropPaste((files) => void addFiles(files.map((f) => ({ blob: f, name: f.name }))));
  const example = async () => {
    try {
      const names = ['andes-far.png', 'andes-near.png'];
      await addFiles(await Promise.all(names.map(async (name) => ({ blob: await fetchPublicImage(name), name }))));
      // Both images were generated for about 180 art px: that is the height the example is made for.
      patch({ height: 180 });
    } catch {
      /* missing example files: nothing to show */
    }
  };

  return (
    <div className="workbench-page">
      <DropOverlay show={dragging} />
      {!s.layers.length ? (
        <EmptyStage
          title={t('parallax.drop')}
          hint={t('parallax.dropHint')}
          multiple
          onFiles={(files) => void addFiles(files.map((f) => ({ blob: f, name: f.name })))}
          busy={busy}
          error={error}
          examples={[{ key: 'andes', label: t('parallax.example'), onClick: () => void example() }]}
          steps={['parallax.how.s1', 'parallax.how.s2', 'parallax.how.s3']}
        />
      ) : (
        <div className="workbench">
          <aside className="settings" aria-label={t('set.label')}>
            <ParallaxSettings onAdd={(files) => void addFiles(files.map((f) => ({ blob: f, name: f.name })))} />
          </aside>
          <div className="main-col">
            {error && <p className="alert" role="alert">{error}</p>}
            <ParallaxStage />
            <ParallaxExport />
          </div>
        </div>
      )}
    </div>
  );
}

function ParallaxSettings({ onAdd }: { onAdd: (files: File[]) => void }) {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const s = state.world.parallax;
  const input = useRef<HTMLInputElement>(null);
  const patch = (p: Partial<ParallaxState>) => dispatch({ type: 'world/parallax', patch: p });
  const roles = layerRoles(s.layers.length);
  const factors = parallaxFactors(s);
  const height = parallaxHeight(s, state.global);
  const res = resolutionByWidth(state.global.gameRes);

  const setLayer = (i: number, p: Partial<ParallaxLayerDraft>) => patch({ layers: s.layers.map((l, k) => (k === i ? { ...l, ...p } : l)) });
  const move = (i: number, d: -1 | 1) => {
    const layers = [...s.layers];
    [layers[i], layers[i + d]] = [layers[i + d]!, layers[i]!];
    patch({ layers });
  };
  const remove = (i: number) => patch({ layers: s.layers.filter((_, k) => k !== i), wrapLayer: 0 });
  const anyCut = s.layers.some((l) => l.removeBg);

  return (
    <div className="settings-in">
      <Section title={t('set.style')}>
        <Segmented<ArtMode>
          name="parallax-mode"
          label={t('set.style')}
          value={s.mode}
          onChange={(mode) => patch({ mode })}
          options={[
            { value: 'pixel', label: t('mode.pixel') },
            { value: 'cartoon', label: t('mode.cartoon') },
          ]}
        />
      </Section>

      <Section title={t('parallax.layers')} hint={t('parallax.layersHint')}>
        <ol className="layer-list">
          {s.layers.map((l, i) => (
            <li key={l.image.id} className="layer-row">
              <div className="asset-thumb"><RgbaCanvas image={l.image.image} pixelated={s.mode === 'pixel'} label={l.image.name} /></div>
              <div className="layer-body">
                <div className="layer-head">
                  <strong>{t(roleKey(roles[i]!))}</strong>
                  <span className="muted layer-name">{l.image.name}</span>
                </div>
                <div className="row wrap">
                  <Field label={t('parallax.speed')} className="field-narrow">
                    <NumberInput value={factors[i]!} min={0} max={1} step={0.05} className="num-sm" onChange={(factor) => setLayer(i, { factor })} />
                  </Field>
                  <Check checked={l.removeBg} onChange={(removeBg) => setLayer(i, { removeBg })} label={t('parallax.cutBg')} />
                </div>
              </div>
              <div className="layer-actions">
                <button type="button" className="btn btn-sm btn-icon" disabled={i === 0} aria-label={t('parallax.up', { name: l.image.name })} onClick={() => move(i, -1)}>↑</button>
                <button type="button" className="btn btn-sm btn-icon" disabled={i === s.layers.length - 1} aria-label={t('parallax.down', { name: l.image.name })} onClick={() => move(i, 1)}>↓</button>
                <button type="button" className="btn btn-sm btn-icon btn-ghost" aria-label={t('parallax.remove', { name: l.image.name })} onClick={() => remove(i)}>×</button>
              </div>
            </li>
          ))}
        </ol>
        <p className="hint">{t('parallax.speedHint')}</p>
        {s.layers.length < MAX_LAYERS ? (
          <button type="button" className="btn btn-sm" onClick={() => input.current?.click()}>{t('parallax.add')}</button>
        ) : (
          <p className="hint">{t('parallax.maxLayers')}</p>
        )}
        <input ref={input} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { const f = [...(e.target.files ?? [])]; if (f.length) onAdd(f); e.target.value = ''; }} />
      </Section>

      <Section title={t('parallax.height')} hint={t('parallax.heightHint')}>
        <div className="chips" role="group" aria-label={t('parallax.height')}>
          {GAME_RESOLUTIONS.map((r) => {
            const on = s.height === null && r.w === res.w;
            return (
              <button
                key={r.w}
                type="button"
                className={cx('chip', 'is-32', on && 'is-on')}
                aria-pressed={on}
                onClick={() => {
                  dispatch({ type: 'global/patch', patch: { gameRes: r.w } });
                  patch({ height: null });
                }}
              >
                {r.w}×{r.h}
              </button>
            );
          })}
          <button type="button" className={cx('chip', s.height !== null && 'is-on')} aria-pressed={s.height !== null} onClick={() => patch({ height: s.height === null ? height : null })}>
            {t('parallax.heightOther')}
          </button>
        </div>
        {s.height !== null && (
          <Field label={t('parallax.heightPx')}>
            <NumberInput value={s.height} min={32} max={2160} className="num-sm" onChange={(h) => patch({ height: Math.round(h) })} />
          </Field>
        )}
      </Section>

      <Section title={t('parallax.loop')} hint={t('parallax.loopHint')}>
        <Check checked={s.loop} onChange={(loop) => patch({ loop })} label={t('parallax.loop')} />
        {s.loop && <Slider label={t('parallax.overlap')} value={s.overlap} min={4} max={30} step={1} unit="%" onChange={(overlap) => patch({ overlap })} />}
        {s.loop && <p className="hint">{t('parallax.overlapHint')}</p>}
      </Section>

      {s.mode === 'pixel' && (
        <Section title={t('set.colours')}>
          <PaletteNote mode={s.mode} />
        </Section>
      )}

      {anyCut && (
        <Fold title={t('set.background')}>
          <Field label={`${t('bg.tolerance')}: ${s.bgTolerance}`} hint={t('bg.toleranceHint')}>
            <input type="range" min={0} max={60} value={s.bgTolerance} onChange={(e) => patch({ bgTolerance: Number(e.target.value) })} />
          </Field>
        </Fold>
      )}
    </div>
  );
}

function ParallaxStage() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const s = state.world.parallax;
  const { run } = s;
  const running = run.status === 'running';
  const patch = (p: Partial<ParallaxState>) => dispatch({ type: 'world/parallax', patch: p });
  const factors = parallaxFactors(s);
  const height = parallaxHeight(s, state.global);
  // A run for a different number of layers is stale (a layer was just added or removed): wait for the next one.
  const factorKey = factors.join(',');
  const layerCount = s.layers.length;
  const result = useMemo(
    () => (run.result && run.result.layers.length === layerCount ? withFactors(run.result, factorKey.split(',').map(Number)) : null),
    [run.result, layerCount, factorKey],
  );
  const friendlyError = run.error ? (/not implemented/i.test(run.error) ? t('error.notImplemented') : t('error.processing', { message: run.error })) : null;
  const wrapIndex = Math.min(s.wrapLayer, Math.max(0, s.layers.length - 1));
  const pixelated = s.mode === 'pixel';

  const fixFor = (w: Warning): Fix | null => {
    switch (w.key) {
      case 'warn.parallaxFit':
        return { label: t('fix.parallaxHeight', { px: Number(w.params?.fit) }), onClick: () => patch({ height: Number(w.params?.fit) }) };
      case 'warn.parallaxSeam':
        return s.overlap >= 30 ? null : { label: t('fix.parallaxJoin'), onClick: () => patch({ loop: true, overlap: Math.min(30, s.overlap + 8) }) };
      default:
        return null;
    }
  };

  const joinValue = (l: NonNullable<typeof result>['layers'][number]): string => {
    const f = (n: number) => n.toFixed(1);
    if (l.loop.applied) return t('parallax.join.value', { before: f(l.loop.before), after: f(l.loop.after) });
    return t(l.loop.alreadyLoops ? 'parallax.join.already' : s.loop ? 'parallax.join.kept' : 'parallax.join.off', { score: f(l.loop.before) });
  };

  return (
    <section className="stage-card" aria-label={t('stage.label')}>
      <div className="stage-head">
        <Segmented<ParallaxState['view']>
          name="parallax-view"
          label={t('stage.views')}
          value={s.view}
          onChange={(view) => patch({ view })}
          options={[
            { value: 'scroll', label: t('parallax.view.scroll') },
            { value: 'wrap', label: t('parallax.view.wrap') },
          ]}
        />
        {s.view === 'wrap' && result && (
          <Segmented<string>
            name="parallax-wrap-layer"
            label={t('parallax.wrapLayer')}
            value={String(wrapIndex)}
            onChange={(v) => patch({ wrapLayer: Number(v) })}
            options={result.layers.map((l, i) => ({ value: String(i), label: t(roleKey(l.role)) }))}
          />
        )}
        {running && <span className="spinner-label" role="status"><i className="spinner" aria-hidden="true" />{t('stage.processing')}</span>}
      </div>
      {friendlyError && <p className="alert" role="alert">{friendlyError}</p>}
      <div className={cx('stage-body', 'parallax-stage', !result && 'waiting', running && 'is-stale')}>
        {!result ? (
          <p className="on-stage-soft">{t('stage.waiting')}</p>
        ) : s.view === 'scroll' ? (
          <ParallaxPlayer layers={result.layers.map((l) => ({ image: l.image, factor: l.factor }))} height={height} speed={s.speed} onSpeed={(speed) => patch({ speed })} pixelated={pixelated} />
        ) : (
          <WrapCheck image={result.layers[wrapIndex]!.image} pixelated={pixelated} label={t(roleKey(result.layers[wrapIndex]!.role))} />
        )}
      </div>
      {result && (
        <>
          <StatusLine
            items={[
              { label: t('parallax.diag.layers'), value: String(result.layers.length) },
              { label: t('parallax.diag.size'), value: `${result.layers.map((l) => l.image.width).join(', ')} × ${result.height} px` },
              ...result.layers.map((l) => ({ label: t('parallax.diag.join', { role: t(roleKey(l.role)) }), value: joinValue(l), tone: l.loop.after > 1.8 ? ('bad' as const) : undefined })),
            ]}
          />
          <Warnings warnings={result.warnings} fixFor={fixFor} />
        </>
      )}
    </section>
  );
}

function ParallaxExport() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const s = state.world.parallax;
  const running = s.run.status === 'running';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const patch = (p: Partial<ParallaxState>) => dispatch({ type: 'world/parallax', patch: p });
  const result = s.run.result && s.run.result.layers.length === s.layers.length ? s.run.result : null;
  const name = slug(s.name || 'background');
  const height = parallaxHeight(s, state.global);

  const primary = async () => {
    if (!result) return;
    setBusy(true);
    setError(null);
    try {
      const zip = await buildParallaxZip(withFactors(result, parallaxFactors(s)), name, s.allFormats ? ENGINES : [s.format]);
      downloadBlob(new Blob([zip as BlobPart], { type: 'application/zip' }), `${name}-parallax${s.allFormats ? '' : `-${s.format}`}.zip`);
    } catch (e) {
      setError(t('error.export', { message: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ExportCard<ExportTarget>
      name="parallax-engine"
      options={ENGINES.map((e) => ({ value: e, label: t(`engine.${e}`) }))}
      value={s.format}
      onChange={(format) => patch({ format })}
      steps={[1, 2, 3].map((n) => t(`parallax.eng.${s.format}.s${n}` as 'parallax.eng.godot.s1', { name, height }))}
      guideHref={hrefFor('guide', 'parallax')}
      all={s.allFormats}
      onAll={(allFormats) => patch({ allFormats })}
      allLabel={t('export.all')}
      primaryLabel={s.allFormats ? t('export.downloadAll') : t('export.downloadFor', { engine: t(`engine.${s.format}`) })}
      onPrimary={() => void primary()}
      busy={busy}
      disabled={running || !result}
      error={error}
      choices={
        <Field label={t('parallax.name')} className="field-narrow">
          <input type="text" value={s.name} onChange={(e) => patch({ name: e.target.value })} />
        </Field>
      }
    />
  );
}
