import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../../i18n/index.ts';
import { buildAtlasZip, normalizeTiles } from '../../../worker/client.ts';
import { downloadBlob, hexToRgb, rgbaToPngBlob, rgbToHex } from '../../lib/image.ts';
import { useApp } from '../../state/context.ts';
import { buildAtlasOptions } from '../../state/tilesJobs.ts';
import type { TileBgStrategy, TileSheetState } from '../../state/types.ts';
import { useLoadImage } from '../../state/useLoadImage.ts';
import { Check, Field, Group, NumberInput, Segmented } from '../common/Field.tsx';
import { RgbaCanvas } from '../common/RgbaCanvas.tsx';
import { Step } from '../common/Step.tsx';
import { ImageDrop } from './ImageDrop.tsx';
import { TileAtlasView } from './TileAtlasView.tsx';
import { TileSizeField } from './TileSizeField.tsx';
import type { ArtMode } from '../../../core/types.ts';

const DEBOUNCE_MS = 300;
const EXAMPLES = [{ file: 'tileset-andes.png', labelKey: 'tiles.sheet.example' as const }];
const STRATEGIES: { value: TileBgStrategy; key: 'auto' | 'global' | 'flood' | 'floodHoles' }[] = [
  { value: 'auto', key: 'auto' },
  { value: 'global', key: 'global' },
  { value: 'flood', key: 'flood' },
  { value: 'flood+holes', key: 'floodHoles' },
];

/** Re-runs the atlas normalizer ~300 ms after any setting that affects the output changes. */
function useSheetProcessor() {
  const { state, dispatch } = useApp();
  const s = state.tiles.sheet;
  const options = useMemo(() => buildAtlasOptions(s), [s]);
  const sig = useMemo(() => (s.source ? JSON.stringify({ id: s.source.id, ...options }) : null), [s.source, options]);
  const latest = useRef(s);
  useEffect(() => {
    latest.current = s;
  });
  const runId = useRef(0);

  useEffect(() => {
    const id = ++runId.current;
    const src = latest.current.source;
    if (!src || !sig) return;
    if (latest.current.run.sig === sig && latest.current.run.status === 'ready') return;
    const patchRun = (p: Partial<TileSheetState['run']>) => dispatch({ type: 'tiles/sheet', patch: { run: { ...latest.current.run, ...p } } });
    const timer = setTimeout(() => {
      patchRun({ status: 'running', error: null });
      normalizeTiles(src.image, options).then(
        (out) => {
          if (id === runId.current) patchRun({ status: 'ready', sig, result: out.result, grid: out.grid, error: null });
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

export function TileSheetPanel() {
  useSheetProcessor();
  return (
    <div className="sprites">
      <SheetUpload />
      <div className="steps-2-3">
        <SheetSettings />
        <SheetResult />
      </div>
    </div>
  );
}

function SheetUpload() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const s = state.tiles.sheet;
  const { load, error, busy } = useLoadImage();
  const onImage = async (blob: Blob, name: string) => {
    const img = await load(blob, name);
    if (img) dispatch({ type: 'tiles/sheet', patch: { source: img, run: { ...s.run, sig: null, result: null, grid: null } } });
  };
  return (
    <Step n={1} title={t('tiles.sheet.stepUpload')}>
      <ImageDrop label={t('tiles.sheet.drop')} hintKey="tiles.sheet.dropHint" examples={EXAMPLES} paste busy={busy} error={error} onImage={(b, n) => void onImage(b, n)} />
      {s.source && (
        <div className="row wrap">
          <div className="asset-thumb"><RgbaCanvas image={s.source.image} pixelated={s.mode === 'pixel'} label={s.source.name} /></div>
          <span className="muted asset-dims">{s.source.image.width}×{s.source.image.height}</span>
        </div>
      )}
    </Step>
  );
}

function SheetSettings() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const s = state.tiles.sheet;
  const patch = (p: Partial<TileSheetState>) => dispatch({ type: 'tiles/sheet', patch: p });
  const setBg = (p: Partial<TileSheetState['bg']>) => patch({ bg: { ...s.bg, ...p } });
  const detected = s.source?.autoBg?.color;
  const shown = s.bg.custom ? s.bg.color : detected;
  const transparent = !s.bg.custom && detected !== undefined && detected[3] === 0;
  const hintKey = s.bg.strategy === 'flood+holes' ? 'floodHoles' : s.bg.strategy;

  return (
    <Step n={2} title={t('step.settings')} muted={!s.source}>
      {!s.source ? (
        <p className="muted">{t('tiles.sheet.needImage')}</p>
      ) : (
        <div className="settings-block">
          <Group legend={t('settings.mode')}>
            <Segmented<ArtMode>
              name="tile-sheet-mode"
              label={t('settings.mode')}
              value={s.mode}
              onChange={(mode) => patch({ mode })}
              options={[
                { value: 'pixel', label: t('settings.mode.pixel') },
                { value: 'cartoon', label: t('settings.mode.cartoon') },
              ]}
            />
          </Group>
          <TileSizeField value={s.tileSize} onChange={(tileSize) => patch({ tileSize })} />
          <Group legend={t('tiles.grid')} hint={t('tiles.gridHint')}>
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
          </Group>
          <Group legend={t('bg.title')}>
            <Check checked={s.removeBg} onChange={(removeBg) => patch({ removeBg })} label={t('tiles.removeBg')} />
            {s.removeBg && (
              <>
                <div className="row wrap">
                  <span className="swatch checker" aria-hidden="true">{shown && !transparent && <i style={{ background: rgbToHex(shown) }} />}</span>
                  <span className="muted">
                    {transparent ? t('bg.alreadyTransparent') : shown ? `${s.bg.custom ? t('bg.custom') : t('bg.detected')}: ${rgbToHex(shown)}` : t('bg.unknown')}
                  </span>
                </div>
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
          </Group>
          {s.mode === 'pixel' && (
            <Field label={t('settings.colors')} hint={t('settings.colorsHint')}>
              <NumberInput value={s.maxColors} min={0} max={256} onChange={(maxColors) => patch({ maxColors })} />
            </Field>
          )}
        </div>
      )}
    </Step>
  );
}

function SheetResult() {
  const { t, tw } = useI18n();
  const { state, dispatch } = useApp();
  const s = state.tiles.sheet;
  const { run } = s;
  const result = run.result;
  const friendlyError = run.error ? (/not implemented/i.test(run.error) ? t('error.notImplemented') : t('error.processing', { message: run.error })) : null;
  const empty = useMemo(() => new Set(result?.tiles.filter((x) => x.empty).map((x) => `${x.col}:${x.row}`) ?? []), [result]);
  const [busy, setBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const running = run.status === 'running';
  const exportName = s.source?.name ?? 'tiles';

  const downloadZip = async () => {
    if (!result) return;
    setBusy(true);
    setExportError(null);
    try {
      const zip = await buildAtlasZip(result, exportName, s.targets);
      downloadBlob(new Blob([zip as BlobPart], { type: 'application/zip' }), `${exportName}-tiles.zip`);
    } catch (e) {
      setExportError(t('error.export', { message: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(false);
    }
  };
  const downloadPng = async () => {
    if (result) downloadBlob(await rgbaToPngBlob(result.atlas), `${exportName}.png`);
  };
  const setTarget = (k: keyof TileSheetState['targets'], v: boolean) => dispatch({ type: 'tiles/sheet', patch: { targets: { ...s.targets, [k]: v } } });

  return (
    <Step
      n={3}
      title={t('step.result')}
      muted={!s.source}
      actions={running ? <span className="spinner-label" role="status"><i className="spinner" aria-hidden="true" />{t('result.processing')}</span> : undefined}
    >
      {!s.source ? (
        <p className="muted">{t('tiles.sheet.needImage')}</p>
      ) : (
        <>
          {friendlyError && <p className="alert" role="alert">{friendlyError}</p>}
          {!result && !friendlyError && <p className="muted">{t('result.waiting')}</p>}
          <div className={running ? 'is-stale' : undefined}>
            <div className="result-grid">
              <section>
                <h3>{t('tiles.sheet.source')}</h3>
                <div className="stage" style={{ maxWidth: s.source.image.width * 4 }}>
                  <RgbaCanvas image={s.source.image} pixelated={s.mode === 'pixel'} label={s.source.name} />
                  {run.grid && (
                    <svg viewBox={`0 0 ${s.source.image.width} ${s.source.image.height}`} preserveAspectRatio="none" aria-hidden="true" className="overlay">
                      {run.grid.xCuts.map((x, i) => (
                        <line key={`x${i}`} x1={x} x2={x} y1={0} y2={s.source!.image.height} className="cut-line" vectorEffect="non-scaling-stroke" />
                      ))}
                      {run.grid.yCuts.map((y, i) => (
                        <line key={`y${i}`} x1={0} x2={s.source!.image.width} y1={y} y2={y} className="cut-line" vectorEffect="non-scaling-stroke" />
                      ))}
                    </svg>
                  )}
                </div>
              </section>
              {result && (
                <section>
                  <h3>{t('tiles.sheet.atlas')}</h3>
                  <TileAtlasView image={result.atlas} tileSize={result.tileSize} cols={result.cols} rows={result.rows} empty={empty} pixelated={s.mode === 'pixel'} />
                  {empty.size > 0 && <small className="hint">{t('tiles.emptyLegend')}</small>}
                </section>
              )}
            </div>
            {result && (
              <div className="diag">
                <h3>{t('result.diagnostics')}</h3>
                <dl>
                  <dt>{t('tiles.diag.grid')}</dt>
                  <dd>{result.cols} × {result.rows}</dd>
                  <dt>{t('tiles.diag.confidence')}</dt>
                  <dd>{run.grid?.confidence == null ? t('tiles.diag.manual') : `${Math.round(run.grid.confidence * 100)} %`}</dd>
                  <dt>{t('tiles.diag.tiles')}</dt>
                  <dd>{t('tiles.diag.tilesValue', { filled: result.tiles.length - empty.size, empty: empty.size })}</dd>
                  <dt>{t('tiles.tileSize')}</dt>
                  <dd>{result.tileSize} px</dd>
                </dl>
                <div>
                  <span className="field-label">{t('diag.warnings')}</span>
                  {result.warnings.length ? (
                    <ul className="warnings">{result.warnings.map((w, i) => <li key={i}>{tw(w)}</li>)}</ul>
                  ) : (
                    <p className="ok">{t('diag.noWarnings')}</p>
                  )}
                </div>
              </div>
            )}
          </div>
          {result && (
            <div className="export">
              <h3>{t('export.title')}</h3>
              <Field label={t('tiles.exportName')}>
                <input type="text" value={s.source.name} onChange={(e) => dispatch({ type: 'tiles/sheet', patch: { source: { ...s.source!, name: e.target.value } } })} />
              </Field>
              <div className="row wrap">
                <Check checked={s.targets.godot} onChange={(v) => setTarget('godot', v)} label={t('tiles.export.godot')} />
                <Check checked={s.targets.tiled} onChange={(v) => setTarget('tiled', v)} label={t('tiles.export.tiled')} />
                <Check checked={s.targets.png} onChange={(v) => setTarget('png', v)} label={t('tiles.export.png')} />
              </div>
              <div className="row wrap">
                <button type="button" className="btn btn-primary" disabled={busy || running || !(s.targets.godot || s.targets.tiled || s.targets.png)} onClick={() => void downloadZip()}>
                  {busy ? t('export.working') : t('export.zip')}
                </button>
                <button type="button" className="btn" disabled={running} onClick={() => void downloadPng()}>{t('export.png')}</button>
              </div>
              <small className="hint">{t('tiles.export.hint')}</small>
              {exportError && <p className="alert" role="alert">{exportError}</p>}
            </div>
          )}
        </>
      )}
    </Step>
  );
}
