import { useEffect, useMemo, useRef, useState } from 'react';
import type { ArtMode, TileLayout } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { buildTerrainZip, composeTerrain, renderTerrainPreview } from '../../../worker/client.ts';
import { downloadBlob, rgbaToPngBlob } from '../../lib/image.ts';
import { randomMap } from '../../lib/map.ts';
import { useApp } from '../../state/context.ts';
import { edgeStyleForm } from '../../state/defaults.ts';
import { buildEdgeStyle } from '../../state/tilesJobs.ts';
import type { EdgeStyleForm, LoadedImage, TerrainState } from '../../state/types.ts';
import { useLoadImage } from '../../state/useLoadImage.ts';
import { Check, Field, Group, NumberInput, Segmented } from '../common/Field.tsx';
import { RgbaCanvas } from '../common/RgbaCanvas.tsx';
import { Step } from '../common/Step.tsx';
import { ImageDrop } from './ImageDrop.tsx';
import { TileAtlasView } from './TileAtlasView.tsx';
import { TileSizeField } from './TileSizeField.tsx';
import { TiledPreview } from './TiledPreview.tsx';

const DEBOUNCE_MS = 300;
const MAP_W = 16;
const MAP_H = 10;
/** Core threshold for warn.notSeamless. */
const SEAM_WARN = 1.8;

type Run = TerrainState['run'];

/** Composes the tile set ~300 ms after a setting changes, then renders the test map with the current seed. */
function useTerrainProcessor() {
  const { state, dispatch } = useApp();
  const s = state.tiles.terrain;
  const b = s.bTransparent ? null : s.b;
  const ready = !!s.a && (s.bTransparent || !!s.b);
  const sig = useMemo(
    () => (ready ? JSON.stringify({ a: s.a!.id, b: b?.id ?? null, T: s.tileSize, layout: s.layout, style: s.style, mode: s.mode }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, s.a, b, s.tileSize, s.layout, s.style, s.mode],
  );
  const latest = useRef(s);
  useEffect(() => {
    latest.current = s;
  });
  const runId = useRef(0);
  const previewSeed = useRef<number | null>(null);
  const previewId = useRef(0);

  useEffect(() => {
    const id = ++runId.current;
    const cur = latest.current;
    if (!sig || !cur.a) return;
    if (cur.run.sig === sig && cur.run.status === 'ready') return;
    const a = cur.a;
    const other = cur.bTransparent ? null : cur.b;
    const patchRun = (p: Partial<Run>, extra: Partial<TerrainState> = {}) => dispatch({ type: 'tiles/terrain', patch: { run: { ...latest.current.run, ...p }, ...extra } });
    const timer = setTimeout(async () => {
      patchRun({ status: 'running', error: null });
      try {
        const style = buildEdgeStyle(cur.style, cur.mode);
        const out = await composeTerrain(a.image, other?.image ?? null, cur.tileSize, cur.layout, style, cur.mode);
        if (id !== runId.current) return;
        const seed = latest.current.mapSeed;
        const map = randomMap(seed, MAP_W, MAP_H);
        const preview = await renderTerrainPreview(map, MAP_W, MAP_H);
        if (id !== runId.current) return;
        previewSeed.current = seed;
        patchRun(
          { status: 'ready', sig, set: out.set, tileA: out.tileA, tileB: out.tileB, seamA: out.seamA, seamB: out.seamB, error: null },
          { preview },
        );
      } catch (e) {
        if (id === runId.current) patchRun({ status: 'error', error: e instanceof Error ? e.message : String(e) });
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, dispatch]);

  // Shuffle: only the test map changes, the tile set stays.
  useEffect(() => {
    const cur = latest.current;
    if (cur.run.status !== 'ready' || cur.run.sig !== sig || previewSeed.current === s.mapSeed) return;
    const id = ++previewId.current;
    const seed = s.mapSeed;
    renderTerrainPreview(randomMap(seed, MAP_W, MAP_H), MAP_W, MAP_H).then(
      (preview) => {
        if (id !== previewId.current) return;
        previewSeed.current = seed;
        dispatch({ type: 'tiles/terrain', patch: { preview } });
      },
      () => undefined,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.mapSeed]);
}

export function TerrainPanel() {
  useTerrainProcessor();
  return (
    <div className="sprites">
      <TerrainUpload />
      <div className="steps-2-3">
        <TerrainSettings />
        <TerrainResult />
      </div>
    </div>
  );
}

function TextureSlot({ title, image, paste, examples, onImage, onClear, disabled }: {
  title: string;
  image: LoadedImage | null;
  paste: boolean;
  examples?: { file: string; labelKey: 'tiles.terrain.exampleGrass' | 'tiles.terrain.exampleDirt' }[];
  onImage: (img: LoadedImage) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const { load, error, busy } = useLoadImage();
  const handle = async (blob: Blob, name: string) => {
    const img = await load(blob, name);
    if (img) onImage(img);
  };
  return (
    <section className={disabled ? 'texture-slot is-muted' : 'texture-slot'}>
      <h3>{title}</h3>
      {image ? (
        <div className="row wrap">
          <div className="asset-thumb"><RgbaCanvas image={image.image} pixelated label={image.name} /></div>
          <span className="muted asset-dims">{image.name} · {image.image.width}×{image.image.height}</span>
          <button type="button" className="btn btn-ghost" onClick={onClear}>{t('assets.remove')}</button>
        </div>
      ) : (
        !disabled && <ImageDrop label={t('tiles.terrain.drop')} examples={examples} paste={paste} busy={busy} error={error} onImage={(b, n) => void handle(b, n)} />
      )}
    </section>
  );
}

function TerrainUpload() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const s = state.tiles.terrain;
  const patch = (p: Partial<TerrainState>) => dispatch({ type: 'tiles/terrain', patch: p });
  return (
    <Step n={1} title={t('tiles.terrain.stepUpload')}>
      <p className="hint">{t('tiles.terrain.intro')}</p>
      <div className="slots">
        <TextureSlot
          title={t('tiles.terrain.textureA')}
          image={s.a}
          paste={!s.a}
          examples={[{ file: 'grass.png', labelKey: 'tiles.terrain.exampleGrass' }]}
          onImage={(a) => patch({ a })}
          onClear={() => patch({ a: null })}
        />
        <div className="slot-b">
          <TextureSlot
            title={t('tiles.terrain.textureB')}
            image={s.b}
            paste={!!s.a && !s.b && !s.bTransparent}
            examples={[{ file: 'dirt.png', labelKey: 'tiles.terrain.exampleDirt' }]}
            onImage={(b) => patch({ b })}
            onClear={() => patch({ b: null })}
            disabled={s.bTransparent}
          />
          <Check checked={s.bTransparent} onChange={(bTransparent) => patch({ bTransparent })} label={t('tiles.terrain.bTransparent')} />
          <small className="hint">{t('tiles.terrain.bTransparentHint')}</small>
        </div>
      </div>
    </Step>
  );
}

function TerrainSettings() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const s = state.tiles.terrain;
  const patch = (p: Partial<TerrainState>) => dispatch({ type: 'tiles/terrain', patch: p });
  const setStyle = (p: Partial<EdgeStyleForm>) => patch({ style: { ...s.style, ...p } });
  const has = !!s.a;
  return (
    <Step n={2} title={t('step.settings')} muted={!has}>
      {!has ? (
        <p className="muted">{t('tiles.terrain.needTexture')}</p>
      ) : (
        <div className="settings-block">
          <Group legend={t('settings.mode')}>
            <Segmented<ArtMode>
              name="terrain-mode"
              label={t('settings.mode')}
              value={s.mode}
              onChange={(mode) => patch({ mode })}
              options={[
                { value: 'pixel', label: t('settings.mode.pixel') },
                { value: 'cartoon', label: t('settings.mode.cartoon') },
              ]}
            />
          </Group>
          {/* A new tile size restarts the edge style from its defaults for that size. */}
          <TileSizeField value={s.tileSize} onChange={(tileSize) => patch({ tileSize, style: edgeStyleForm(tileSize, s.style.seed) })} />
          <Group legend={t('tiles.layout')}>
            <Segmented<TileLayout>
              name="terrain-layout"
              label={t('tiles.layout')}
              value={s.layout}
              onChange={(layout) => patch({ layout })}
              options={[
                { value: 'blob47', label: t('tiles.layout.blob47') },
                { value: 'dual16', label: t('tiles.layout.dual16') },
              ]}
            />
            <small className="hint">{t(s.layout === 'blob47' ? 'tiles.layout.blob47Hint' : 'tiles.layout.dual16Hint')}</small>
          </Group>
          <Group legend={t('tiles.edge.title')} hint={t('tiles.edge.hint')}>
            <div className="row wrap">
              <Field label={t('tiles.edge.margin')}>
                <NumberInput value={s.style.margin} min={0} max={64} onChange={(margin) => setStyle({ margin })} />
              </Field>
              <Field label={t('tiles.edge.blur')}>
                <NumberInput value={s.style.blur} min={1} max={64} onChange={(blur) => setStyle({ blur })} />
              </Field>
            </div>
            <div className="row wrap">
              <Field label={t('tiles.edge.noiseAmp')}>
                <NumberInput value={s.style.noiseAmp} min={0} max={64} onChange={(noiseAmp) => setStyle({ noiseAmp })} />
              </Field>
              <Field label={t('tiles.edge.noiseCells')}>
                <NumberInput value={s.style.noiseCells} min={1} max={32} onChange={(noiseCells) => setStyle({ noiseCells })} />
              </Field>
            </div>
            <div className="row wrap">
              <Field label={t('tiles.edge.seed')}>
                <NumberInput value={s.style.seed} min={0} max={999999} onChange={(seed) => setStyle({ seed })} />
              </Field>
              <button type="button" className="btn" onClick={() => setStyle({ seed: Math.floor(Math.random() * 100000) })}>{t('tiles.edge.randomSeed')}</button>
            </div>
            <Field label={t('tiles.edge.outline')} hint={s.mode === 'pixel' ? t('tiles.edge.outlineHint') : t('tiles.edge.outlinePixelOnly')}>
              <select value={s.style.outline} disabled={s.mode !== 'pixel'} onChange={(e) => setStyle({ outline: e.target.value as EdgeStyleForm['outline'] })}>
                <option value="none">{t('tiles.edge.outline.none')}</option>
                <option value="auto">{t('tiles.edge.outline.auto')}</option>
              </select>
            </Field>
            <button type="button" className="btn btn-ghost" onClick={() => patch({ style: edgeStyleForm(s.tileSize, s.style.seed) })}>{t('tiles.edge.reset')}</button>
          </Group>
        </div>
      )}
    </Step>
  );
}

function SeamLine({ label, score }: { label: string; score: number | null }) {
  const { t } = useI18n();
  if (score === null) return null;
  const bad = score > SEAM_WARN;
  return (
    <>
      <dt>{label}</dt>
      <dd className={bad ? 'is-bad' : 'is-good'}>{score.toFixed(2)} · {bad ? t('tiles.seam.bad') : t('tiles.seam.ok')}</dd>
    </>
  );
}

function TerrainResult() {
  const { t, tw } = useI18n();
  const { state, dispatch } = useApp();
  const s = state.tiles.terrain;
  const { run } = s;
  const set = run.set;
  const ready = !!s.a && (s.bTransparent || !!s.b);
  const running = run.status === 'running';
  const pixelated = s.mode === 'pixel';
  const friendlyError = run.error ? (/not implemented/i.test(run.error) ? t('error.notImplemented') : t('error.processing', { message: run.error })) : null;
  const [busy, setBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const baseName = s.a ? (s.bTransparent || !s.b ? s.a.name : `${s.a.name}-${s.b.name}`) : 'terrain';
  const [name, setName] = useState<string | null>(null);
  const exportName = name ?? baseName;

  const downloadZip = async () => {
    if (!set) return;
    setBusy(true);
    setExportError(null);
    try {
      const names: [string, string] = [s.a?.name ?? 'base', s.bTransparent ? 'overlay' : (s.b?.name ?? 'overlay')];
      const zip = await buildTerrainZip(set, exportName, names);
      downloadBlob(new Blob([zip as BlobPart], { type: 'application/zip' }), `${exportName}-terrain.zip`);
    } catch (e) {
      setExportError(t('error.export', { message: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Step
      n={3}
      title={t('step.result')}
      muted={!ready}
      actions={running ? <span className="spinner-label" role="status"><i className="spinner" aria-hidden="true" />{t('result.processing')}</span> : undefined}
    >
      {!ready ? (
        <p className="muted">{s.a ? t('tiles.terrain.needB') : t('tiles.terrain.needTexture')}</p>
      ) : (
        <>
          {friendlyError && <p className="alert" role="alert">{friendlyError}</p>}
          {!set && !friendlyError && <p className="muted">{t('result.waiting')}</p>}
          {set && (
            <div className={running ? 'is-stale' : undefined}>
              <div className="result-grid">
                <section>
                  <h3>{t('tiles.terrain.atlas')}</h3>
                  <TileAtlasView image={set.atlas} tileSize={set.tileSize} cols={set.cols} rows={set.rows} pixelated={pixelated} />
                </section>
                <section>
                  <h3>{t('tiles.terrain.testMap')}</h3>
                  <div className="row wrap toolbar">
                    <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: 'tiles/terrain', patch: { mapSeed: Math.floor(Math.random() * 1_000_000) } })}>
                      {t('tiles.terrain.shuffle')}
                    </button>
                    <small className="hint">{t('tiles.terrain.testMapHint')}</small>
                  </div>
                  {s.preview && (
                    <div className="stage">
                      <RgbaCanvas image={s.preview} pixelated={pixelated} label={t('tiles.terrain.testMap')} />
                    </div>
                  )}
                </section>
              </div>
              <div className="result-grid">
                <section className="diag">
                  <h3>{t('result.diagnostics')}</h3>
                  <dl>
                    <dt>{t('tiles.terrain.tiles')}</dt>
                    <dd>{set.tiles.length} ({set.cols} × {set.rows})</dd>
                    <dt>{t('tiles.tileSize')}</dt>
                    <dd>{set.tileSize} px</dd>
                    <SeamLine label={t('tiles.seam.a')} score={run.seamA} />
                    <SeamLine label={t('tiles.seam.b')} score={run.seamB} />
                  </dl>
                  <small className="hint">{t('tiles.seam.hint')}</small>
                  <div>
                    <span className="field-label">{t('diag.warnings')}</span>
                    {set.warnings.length ? (
                      <ul className="warnings">{set.warnings.map((w, i) => <li key={i}>{tw(w)}</li>)}</ul>
                    ) : (
                      <p className="ok">{t('diag.noWarnings')}</p>
                    )}
                  </div>
                </section>
                <section>
                  <h3>{t('tiles.terrain.tilesUsed')}</h3>
                  <div className="row wrap">
                    {run.tileA && (
                      <figure className="tile-fig">
                        <TiledPreview image={run.tileA} pixelated={pixelated} label={t('tiles.seam.a')} />
                        <figcaption>{t('tiles.seam.a')}</figcaption>
                      </figure>
                    )}
                    {run.tileB && (
                      <figure className="tile-fig">
                        <TiledPreview image={run.tileB} pixelated={pixelated} label={t('tiles.seam.b')} />
                        <figcaption>{t('tiles.seam.b')}</figcaption>
                      </figure>
                    )}
                  </div>
                  <small className="hint">{t('tiles.terrain.tilesUsedHint')}</small>
                </section>
              </div>
              <div className="export">
                <h3>{t('export.title')}</h3>
                <Field label={t('tiles.exportName')}>
                  <input type="text" value={exportName} onChange={(e) => setName(e.target.value)} />
                </Field>
                <div className="row wrap">
                  <button type="button" className="btn btn-primary" disabled={busy || running} onClick={() => void downloadZip()}>
                    {busy ? t('export.working') : t('export.zip')}
                  </button>
                  <button type="button" className="btn" disabled={running} onClick={async () => downloadBlob(await rgbaToPngBlob(set.atlas), `${exportName}.png`)}>
                    {t('export.png')}
                  </button>
                </div>
                <small className="hint">{t('tiles.terrain.exportHint')}</small>
                {exportError && <p className="alert" role="alert">{exportError}</p>}
              </div>
            </div>
          )}
        </>
      )}
    </Step>
  );
}
