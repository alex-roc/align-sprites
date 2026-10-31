import { slug } from '../../../core/export/common.ts';
import { useMemo, useRef, useState } from 'react';
import type { ArtMode } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { buildAtlasZip } from '../../../worker/client.ts';
import { fetchPublicImage } from '../../dev/examples.ts';
import { downloadBlob, hexToRgb, rgbaToPngBlob, rgbToHex } from '../../lib/image.ts';
import { useDropPaste } from '../../lib/useDropPaste.ts';
import { hrefFor } from '../../route.ts';
import { useApp } from '../../state/context.ts';
import { useSheetProcessor } from '../../state/useTileProcessors.ts';
import type { TileBgStrategy, TileFormat, TileSheetState } from '../../state/types.ts';
import { useLoadImage } from '../../state/useLoadImage.ts';
import { DropOverlay } from '../common/DropOverlay.tsx';
import { EmptyStage } from '../common/EmptyStage.tsx';
import { ExportCard } from '../common/ExportCard.tsx';
import { Check, Field, NumberInput, Segmented } from '../common/Field.tsx';
import { RgbaCanvas } from '../common/RgbaCanvas.tsx';
import { Fold, Section } from '../common/Section.tsx';
import { StatusLine } from '../common/StatusLine.tsx';
import { Warnings, type Fix } from '../common/Warnings.tsx';
import { TileAtlasView } from './TileAtlasView.tsx';
import { TILE_PRESETS } from '../../lib/tilePresets.ts';
import { TileSizeField } from './TileSizeField.tsx';
import type { Warning } from '../../../core/types.ts';

const STRATEGIES: { value: TileBgStrategy; key: 'auto' | 'global' | 'flood' | 'floodHoles' }[] = [
  { value: 'auto', key: 'auto' },
  { value: 'global', key: 'global' },
  { value: 'flood', key: 'flood' },
  { value: 'flood+holes', key: 'floodHoles' },
];
const FORMATS: TileFormat[] = ['godot', 'tiled', 'png'];

export function TileSheetPanel() {
  useSheetProcessor();
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const s = state.tiles.sheet;
  const { load, error, busy } = useLoadImage();

  const setSource = async (blob: Blob, name: string) => {
    const img = await load(blob, name);
    if (img) dispatch({ type: 'tiles/sheet', patch: { source: img, run: { ...s.run, sig: null, result: null, grid: null } } });
  };
  const { dragging } = useDropPaste((files) => void setSource(files[0], files[0].name));
  const example = async () => {
    try {
      await setSource(await fetchPublicImage('tileset-andes.png'), 'tileset-andes.png');
    } catch {
      /* missing example file: nothing to show */
    }
  };

  return (
    <div className="workbench-page">
      <DropOverlay show={dragging} />
      {!s.source ? (
        <EmptyStage
          title={t('tiles.sheet.drop')}
          hint={t('tiles.sheet.dropHint')}
          onFiles={(files) => files[0] && void setSource(files[0], files[0].name)}
          busy={busy}
          error={error}
          examples={[{ key: 'andes', label: t('tiles.sheet.example'), onClick: () => void example() }]}
          steps={['tiles.how.s1', 'tiles.how.s2', 'tiles.how.s3']}
        />
      ) : (
        <div className="workbench">
          <aside className="settings" aria-label={t('set.label')}>
            <SheetSettings onReplace={(f) => void setSource(f, f.name)} />
          </aside>
          <div className="main-col">
            {error && <p className="alert" role="alert">{error}</p>}
            <SheetStage />
            <SheetExport />
          </div>
        </div>
      )}
    </div>
  );
}

function SheetSettings({ onReplace }: { onReplace: (f: File) => void }) {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const s = state.tiles.sheet;
  const input = useRef<HTMLInputElement>(null);
  const patch = (p: Partial<TileSheetState>) => dispatch({ type: 'tiles/sheet', patch: p });
  const setBg = (p: Partial<TileSheetState['bg']>) => patch({ bg: { ...s.bg, ...p } });
  const src = s.source!;
  const detected = src.autoBg?.color;
  const shown = s.bg.custom ? s.bg.color : detected;
  const transparent = !s.bg.custom && detected !== undefined && detected[3] === 0;
  const autoWorked = s.removeBg && !s.bg.custom && s.bg.strategy === 'auto' && detected !== undefined;
  const hintKey = s.bg.strategy === 'flood+holes' ? 'floodHoles' : s.bg.strategy;

  return (
    <div className="settings-in">
      <section className="set source-card">
        <div className="asset-thumb"><RgbaCanvas image={src.image} pixelated={s.mode === 'pixel'} label={src.name} /></div>
        <div className="asset-meta">
          <input className="asset-name" type="text" value={src.name} aria-label={t('assets.name')} onChange={(e) => patch({ source: { ...src, name: e.target.value } })} />
          <span className="muted">{src.image.width}×{src.image.height}</span>
        </div>
        <button type="button" className="btn btn-sm" onClick={() => input.current?.click()}>{t('tiles.replace')}</button>
        <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { const f = e.target.files?.[0]; if (f) onReplace(f); e.target.value = ''; }} />
      </section>

      <Section title={t('set.style')}>
        <Segmented<ArtMode>
          name="tile-sheet-mode"
          label={t('set.style')}
          value={s.mode}
          onChange={(mode) => patch({ mode })}
          options={[
            { value: 'pixel', label: t('mode.pixel') },
            { value: 'cartoon', label: t('mode.cartoon') },
          ]}
        />
      </Section>

      <Section title={t('tiles.tileSize')}>
        <TileSizeField value={s.tileSize} onChange={(tileSize) => patch({ tileSize })} />
      </Section>

      <Section title={t('tiles.grid')} hint={t('tiles.gridHint')}>
        <Check checked={s.gridAuto} onChange={(gridAuto) => patch({ gridAuto })} label={t('tiles.gridAuto')} />
        {!s.gridAuto && (
          <div className="row">
            <Field label={t('seg.cols')}>
              <NumberInput value={s.cols} min={1} max={64} onChange={(cols) => patch({ cols })} />
            </Field>
            <Field label={t('seg.rows')}>
              <NumberInput value={s.rows} min={1} max={64} onChange={(rows) => patch({ rows })} />
            </Field>
          </div>
        )}
      </Section>

      {s.mode === 'pixel' && (
        <Section title={t('set.colours')}>
          <Field label={t('colours.max')} hint={t('colours.maxHint')}>
            <NumberInput value={s.maxColors} min={0} max={256} onChange={(maxColors) => patch({ maxColors })} />
          </Field>
        </Section>
      )}

      <Fold
        title={t('set.background')}
        open={!autoWorked}
        key={`tbg-${src.id}`}
        summary={
          <span className="bg-summary">
            <span className="swatch checker" aria-hidden="true">{shown && !transparent && s.removeBg && <i style={{ background: rgbToHex(shown) }} />}</span>
            {!s.removeBg ? t('tiles.bgOff') : autoWorked ? (transparent ? t('bg.transparentOk') : t('bg.autoOk', { color: rgbToHex(shown ?? [0, 0, 0]) })) : t(`bg.strategy.${hintKey}`)}
          </span>
        }
      >
        <Check checked={s.removeBg} onChange={(removeBg) => patch({ removeBg })} label={t('tiles.removeBg')} />
        {s.removeBg && (
          <>
            <Check checked={s.bg.custom} onChange={(custom) => setBg({ custom })} label={t('bg.useCustom')} />
            {s.bg.custom && (
              <Field label={t('bg.color')}>
                <input type="color" value={rgbToHex(s.bg.color)} onChange={(e) => setBg({ color: hexToRgb(e.target.value) })} />
              </Field>
            )}
            <Field label={t('bg.strategy')} hint={t(`bg.strategy.${hintKey}Hint`)}>
              <select value={s.bg.strategy} onChange={(e) => setBg({ strategy: e.target.value as TileBgStrategy })}>
                {STRATEGIES.map((o) => (
                  <option key={o.value} value={o.value}>{t(`bg.strategy.${o.key}`)}</option>
                ))}
              </select>
            </Field>
            <Field label={`${t('bg.tolerance')}: ${s.bg.tolerance}`} hint={t('bg.toleranceHint')}>
              <input type="range" min={0} max={60} value={s.bg.tolerance} onChange={(e) => setBg({ tolerance: Number(e.target.value) })} />
            </Field>
          </>
        )}
      </Fold>
    </div>
  );
}

function SheetStage() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const s = state.tiles.sheet;
  const { run } = s;
  const result = run.result;
  const running = run.status === 'running';
  const src = s.source!;
  const friendlyError = run.error ? (/not implemented/i.test(run.error) ? t('error.notImplemented') : t('error.processing', { message: run.error })) : null;
  const empty = useMemo(() => new Set(result?.tiles.filter((x) => x.empty).map((x) => `${x.col}:${x.row}`) ?? []), [result]);
  const patch = (p: Partial<TileSheetState>) => dispatch({ type: 'tiles/sheet', patch: p });

  const fixFor = (w: Warning): Fix | null => {
    switch (w.key) {
      case 'warn.tileGridUncertain':
        return { label: t('fix.enterGrid'), onClick: () => patch({ gridAuto: false, cols: run.grid?.cols ?? s.cols, rows: run.grid?.rows ?? s.rows }) };
      case 'warn.tileUpscaled': {
        const smaller = [...TILE_PRESETS].reverse().find((p) => p < s.tileSize);
        return smaller ? { label: t('fix.tileSize', { px: smaller }), onClick: () => patch({ tileSize: smaller }) } : null;
      }
      default:
        return null;
    }
  };

  return (
    <section className="stage-card" aria-label={t('stage.label')}>
      <div className="stage-head">
        <Segmented<'atlas' | 'source'>
          name="tile-sheet-view"
          label={t('stage.views')}
          value={s.view}
          onChange={(view) => patch({ view })}
          options={[
            { value: 'atlas', label: t('stage.atlas') },
            { value: 'source', label: t('stage.original') },
          ]}
        />
        {running && <span className="spinner-label" role="status"><i className="spinner" aria-hidden="true" />{t('stage.processing')}</span>}
      </div>
      {friendlyError && <p className="alert" role="alert">{friendlyError}</p>}
      <div className={running ? 'is-stale' : undefined}>
        {s.view === 'source' || !result ? (
          s.view === 'atlas' && !result ? (
            <div className="stage-body waiting"><p className="on-stage-soft">{t('stage.waiting')}</p></div>
          ) : (
            <div className="sheetview">
              <div className="stage-body scroll-stage">
                <div className="sheet-wrap" style={{ maxWidth: src.image.width * 4 }}>
                  <RgbaCanvas image={src.image} pixelated={s.mode === 'pixel'} label={src.name} />
                  {run.grid && (
                    <svg viewBox={`0 0 ${src.image.width} ${src.image.height}`} preserveAspectRatio="none" aria-hidden="true" className="overlay">
                      {run.grid.xCuts.map((x, i) => (
                        <line key={`x${i}`} x1={x} x2={x} y1={0} y2={src.image.height} className="cut-line" vectorEffect="non-scaling-stroke" />
                      ))}
                      {run.grid.yCuts.map((y, i) => (
                        <line key={`y${i}`} x1={0} x2={src.image.width} y1={y} y2={y} className="cut-line" vectorEffect="non-scaling-stroke" />
                      ))}
                    </svg>
                  )}
                </div>
              </div>
              <p className="hint">{t('tiles.sheet.sourceHint')}</p>
            </div>
          )
        ) : (
          <TileAtlasView image={result.atlas} tileSize={result.tileSize} cols={result.cols} rows={result.rows} empty={empty} pixelated={s.mode === 'pixel'} />
        )}
      </div>
      {result && (
        <>
          <StatusLine
            items={[
              { label: t('tiles.diag.grid'), value: `${result.cols}×${result.rows}` },
              { label: t('tiles.diag.confidence'), value: run.grid?.confidence == null ? t('tiles.diag.manual') : `${Math.round(run.grid.confidence * 100)} %` },
              { label: t('tiles.diag.tiles'), value: t('tiles.diag.tilesValue', { filled: result.tiles.length - empty.size, empty: empty.size }) },
              { label: t('tiles.tileSize'), value: `${result.tileSize} px` },
            ]}
          />
          <Warnings warnings={result.warnings} fixFor={fixFor} />
        </>
      )}
    </section>
  );
}

function SheetExport() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const s = state.tiles.sheet;
  const result = s.run.result;
  const running = s.run.status === 'running';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = s.source?.name ?? 'tiles';
  const patch = (p: Partial<TileSheetState>) => dispatch({ type: 'tiles/sheet', patch: p });

  const downloadPng = async () => {
    if (result) downloadBlob(await rgbaToPngBlob(result.atlas), `${name}.png`);
  };
  const primary = async () => {
    if (!result) return;
    if (s.format === 'png' && !s.allFormats) return downloadPng();
    setBusy(true);
    setError(null);
    try {
      const targets = s.allFormats ? { godot: true, tiled: true, png: true } : { godot: s.format === 'godot', tiled: s.format === 'tiled', png: false };
      const zip = await buildAtlasZip(result, name, targets);
      downloadBlob(new Blob([zip as BlobPart], { type: 'application/zip' }), `${name}-tiles${s.allFormats ? '' : `-${s.format}`}.zip`);
    } catch (e) {
      setError(t('error.export', { message: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(false);
    }
  };

  const label = t(`tfmt.${s.format}`);
  return (
    <ExportCard<TileFormat>
      name="tile-format"
      options={FORMATS.map((f) => ({ value: f, label: t(`tfmt.${f}`) }))}
      value={s.format}
      onChange={(format) => patch({ format })}
      steps={[1, 2, 3].map((n) => t(`tfmt.${s.format}.s${n}` as 'tfmt.godot.s1', { name: slug(name) }))}
      guideHref={hrefFor('guide', 'tiles')}
      all={s.allFormats}
      onAll={(allFormats) => patch({ allFormats })}
      allLabel={t('tiles.exportAll')}
      primaryLabel={s.allFormats ? t('tiles.downloadAll') : s.format === 'png' ? t('tiles.downloadPng') : t('export.downloadFor', { engine: label })}
      onPrimary={() => void primary()}
      secondaryLabel={s.format === 'png' && !s.allFormats ? undefined : t('export.pngOnly')}
      onSecondary={() => void downloadPng()}
      busy={busy}
      disabled={running || !result}
      error={error}
    />
  );
}
