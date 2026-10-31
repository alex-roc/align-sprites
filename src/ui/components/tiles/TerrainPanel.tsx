import { slug } from '../../../core/export/common.ts';
import { useState } from 'react';
import type { ArtMode, TileLayout, Warning } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { buildTerrainZip } from '../../../worker/client.ts';
import { fetchPublicImage } from '../../dev/examples.ts';
import { downloadBlob, rgbaToPngBlob } from '../../lib/image.ts';
import { useDropPaste } from '../../lib/useDropPaste.ts';
import { hrefFor } from '../../route.ts';
import { useApp } from '../../state/context.ts';
import { edgeStyleForm } from '../../state/defaults.ts';
import { useTerrainProcessor } from '../../state/useTileProcessors.ts';
import type { EdgeStyleForm, LoadedImage, TerrainState } from '../../state/types.ts';
import { useLoadImage } from '../../state/useLoadImage.ts';
import { DropOverlay } from '../common/DropOverlay.tsx';
import { EmptyStage } from '../common/EmptyStage.tsx';
import { ExportCard } from '../common/ExportCard.tsx';
import { Check, Field, NumberInput, Segmented } from '../common/Field.tsx';
import { RgbaCanvas } from '../common/RgbaCanvas.tsx';
import { PaletteNote } from '../common/PaletteField.tsx';
import { Fold, Section } from '../common/Section.tsx';
import { StatusLine } from '../common/StatusLine.tsx';
import { Warnings, type Fix } from '../common/Warnings.tsx';
import { TileAtlasView } from './TileAtlasView.tsx';
import { TileSizeField } from './TileSizeField.tsx';
import { TiledPreview } from './TiledPreview.tsx';

/** Core threshold for warn.notSeamless. */
const SEAM_WARN = 1.8;

export function TerrainPanel() {
  useTerrainProcessor();
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const s = state.tiles.terrain;
  const { load, error, busy } = useLoadImage();
  const patch = (p: Partial<TerrainState>) => dispatch({ type: 'tiles/terrain', patch: p });
  const ready = !!s.a && (s.bTransparent || !!s.b);

  // Dropped/pasted/loaded images fill A first, then B.
  const addImage = async (blob: Blob, name: string) => {
    const img = await load(blob, name);
    if (!img) return;
    if (!s.a) patch({ a: img });
    else if (!s.b && !s.bTransparent) patch({ b: img });
    else patch({ a: img });
  };
  const { dragging } = useDropPaste((files) => void (async () => { for (const f of files.slice(0, 2)) await addImage(f, f.name); })());
  const loadPair = async () => {
    try {
      const [ga, gb] = await Promise.all([fetchPublicImage('grass.png'), fetchPublicImage('dirt.png')]);
      const [a, b] = [await load(ga, 'grass.png'), await load(gb, 'dirt.png')];
      if (a && b) patch({ a, b, bTransparent: false });
    } catch {
      /* missing example files: nothing to show */
    }
  };

  return (
    <div className="workbench-page">
      <DropOverlay show={dragging} />
      {!s.a && !s.b ? (
        <EmptyStage
          title={t('tiles.terrain.drop')}
          hint={t('tiles.terrain.dropHint')}
          multiple
          onFiles={(files) => void (async () => { for (const f of files.slice(0, 2)) await addImage(f, f.name); })()}
          busy={busy}
          error={error}
          examples={[{ key: 'pair', label: t('tiles.terrain.examplePair'), onClick: () => void loadPair() }]}
          steps={['terrain.how.s1', 'terrain.how.s2', 'terrain.how.s3']}
        />
      ) : (
        <div className="workbench">
          <aside className="settings" aria-label={t('set.label')}>
            <TerrainSettings onImage={(b, n) => void addImage(b, n)} />
          </aside>
          <div className="main-col">
            {error && <p className="alert" role="alert">{error}</p>}
            {ready ? (
              <>
                <TerrainStage />
                <TerrainExport />
              </>
            ) : (
              <section className="stage-card"><div className="stage-body waiting"><p className="on-stage-soft">{t('tiles.terrain.needB')}</p></div></section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TextureSlot({ title, image, onClear, onFile }: { title: string; image: LoadedImage | null; onClear: () => void; onFile: (f: File) => void }) {
  const { t } = useI18n();
  return (
    <div className="slot">
      <span className="field-label">{title}</span>
      {image ? (
        <div className="slot-row">
          <div className="asset-thumb"><RgbaCanvas image={image.image} pixelated label={image.name} /></div>
          <div className="asset-meta">
            <span>{image.name}</span>
            <span className="muted">{image.image.width}×{image.image.height}</span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>{t('tiles.terrain.removeTexture')}</button>
        </div>
      ) : (
        <label className="slot-drop">
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
          {t('tiles.terrain.chooseFile')}
        </label>
      )}
    </div>
  );
}

function TerrainSettings({ onImage }: { onImage: (b: Blob, name: string) => void }) {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const s = state.tiles.terrain;
  const patch = (p: Partial<TerrainState>) => dispatch({ type: 'tiles/terrain', patch: p });
  const setStyle = (p: Partial<EdgeStyleForm>) => patch({ style: { ...s.style, ...p } });
  return (
    <div className="settings-in">
      <Section title={t('tiles.terrain.textures')} hint={t('tiles.terrain.intro')}>
        <TextureSlot title={t('tiles.terrain.textureA')} image={s.a} onClear={() => patch({ a: null })} onFile={(f) => onImage(f, f.name)} />
        {!s.bTransparent && <TextureSlot title={t('tiles.terrain.textureB')} image={s.b} onClear={() => patch({ b: null })} onFile={(f) => onImage(f, f.name)} />}
        <Check checked={s.bTransparent} onChange={(bTransparent) => patch({ bTransparent })} label={t('tiles.terrain.bTransparent')} />
        {s.bTransparent && <p className="hint">{t('tiles.terrain.bTransparentHint')}</p>}
      </Section>

      <Section title={t('set.style')}>
        <Segmented<ArtMode>
          name="terrain-mode"
          label={t('set.style')}
          value={s.mode}
          onChange={(mode) => patch({ mode })}
          options={[
            { value: 'pixel', label: t('mode.pixel') },
            { value: 'cartoon', label: t('mode.cartoon') },
          ]}
        />
        <PaletteNote mode={s.mode} />
      </Section>

      <Section title={t('tiles.tileSize')}>
        {/* A new tile size restarts the edge style from its defaults for that size. */}
        <TileSizeField value={s.tileSize} onChange={(tileSize) => patch({ tileSize, style: edgeStyleForm(tileSize, s.style.seed) })} />
      </Section>

      <Section title={t('tiles.layout')}>
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
        <p className="hint">{t(s.layout === 'blob47' ? 'tiles.layout.blob47Hint' : 'tiles.layout.dual16Hint')}</p>
      </Section>

      <Fold title={t('tiles.edge.title')}>
        <p className="hint">{t('tiles.edge.hint')}</p>
        <div className="row">
          <Field label={t('tiles.edge.margin')}>
            <NumberInput value={s.style.margin} min={0} max={64} onChange={(margin) => setStyle({ margin })} />
          </Field>
          <Field label={t('tiles.edge.blur')}>
            <NumberInput value={s.style.blur} min={1} max={64} onChange={(blur) => setStyle({ blur })} />
          </Field>
        </div>
        <div className="row">
          <Field label={t('tiles.edge.noiseAmp')}>
            <NumberInput value={s.style.noiseAmp} min={0} max={64} onChange={(noiseAmp) => setStyle({ noiseAmp })} />
          </Field>
          <Field label={t('tiles.edge.noiseCells')}>
            <NumberInput value={s.style.noiseCells} min={1} max={32} onChange={(noiseCells) => setStyle({ noiseCells })} />
          </Field>
        </div>
        <div className="row">
          <Field label={t('tiles.edge.seed')}>
            <NumberInput value={s.style.seed} min={0} max={999999} onChange={(seed) => setStyle({ seed })} />
          </Field>
          <button type="button" className="btn btn-sm" onClick={() => setStyle({ seed: Math.floor(Math.random() * 100000) })}>{t('tiles.edge.randomSeed')}</button>
        </div>
        <Field label={t('tiles.edge.outline')} hint={s.mode === 'pixel' ? t('tiles.edge.outlineHint') : t('tiles.edge.outlinePixelOnly')}>
          <select value={s.style.outline} disabled={s.mode !== 'pixel'} onChange={(e) => setStyle({ outline: e.target.value as EdgeStyleForm['outline'] })}>
            <option value="none">{t('tiles.edge.outline.none')}</option>
            <option value="auto">{t('tiles.edge.outline.auto')}</option>
          </select>
        </Field>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => patch({ style: edgeStyleForm(s.tileSize, s.style.seed) })}>{t('tiles.edge.reset')}</button>
      </Fold>
    </div>
  );
}

function TerrainStage() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const s = state.tiles.terrain;
  const { run } = s;
  const set = run.set;
  const running = run.status === 'running';
  const pixelated = s.mode === 'pixel';
  const friendlyError = run.error ? (/not implemented/i.test(run.error) ? t('error.notImplemented') : t('error.processing', { message: run.error })) : null;
  const patch = (p: Partial<TerrainState>) => dispatch({ type: 'tiles/terrain', patch: p });

  const fixFor = (w: Warning): Fix | null => {
    switch (w.key) {
      case 'warn.edgeStyleClamped':
        return { label: t('tiles.edge.reset'), onClick: () => patch({ style: edgeStyleForm(s.tileSize, s.style.seed) }) };
      case 'warn.dualOddTile':
        return { label: t('fix.tileSize', { px: s.tileSize + 1 }), onClick: () => patch({ tileSize: s.tileSize + 1, style: edgeStyleForm(s.tileSize + 1, s.style.seed) }) };
      case 'warn.notSeamless':
        return { label: t('fix.learnMore'), href: hrefFor('guide', 'tiles') };
      default:
        return null;
    }
  };

  return (
    <section className="stage-card" aria-label={t('stage.label')}>
      <div className="stage-head">
        <Segmented<'map' | 'atlas'>
          name="terrain-view"
          label={t('stage.views')}
          value={s.view}
          onChange={(view) => patch({ view })}
          options={[
            { value: 'map', label: t('stage.testMap') },
            { value: 'atlas', label: t('stage.tileSet') },
          ]}
        />
        {s.view === 'map' && (
          <button type="button" className="btn btn-sm" onClick={() => patch({ mapSeed: Math.floor(Math.random() * 1_000_000) })}>{t('tiles.terrain.shuffle')}</button>
        )}
        {running && <span className="spinner-label" role="status"><i className="spinner" aria-hidden="true" />{t('stage.processing')}</span>}
      </div>
      {friendlyError && <p className="alert" role="alert">{friendlyError}</p>}
      <div className={running ? 'is-stale' : undefined}>
        {!set ? (
          <div className="stage-body waiting"><p className="on-stage-soft">{t('stage.waiting')}</p></div>
        ) : s.view === 'atlas' ? (
          <TileAtlasView image={set.atlas} tileSize={set.tileSize} cols={set.cols} rows={set.rows} pixelated={pixelated} />
        ) : (
          <div className="sheetview">
            <div className="stage-body scroll-stage">
              {s.preview && (
                <div className="sheet-wrap">
                  <RgbaCanvas image={s.preview} pixelated={pixelated} label={t('stage.testMap')} />
                </div>
              )}
            </div>
            <p className="hint">{t('tiles.terrain.testMapHint')}</p>
          </div>
        )}
      </div>
      {set && (
        <>
          <StatusLine
            items={[
              { label: t('tiles.terrain.tiles'), value: `${set.tiles.length}` },
              { label: t('tiles.tileSize'), value: `${set.tileSize} px` },
              ...(run.seamA !== null ? [{ label: t('tiles.seam.a'), value: `${run.seamA.toFixed(2)} ${run.seamA > SEAM_WARN ? t('tiles.seam.bad') : t('tiles.seam.ok')}`, tone: run.seamA > SEAM_WARN ? ('bad' as const) : ('ok' as const) }] : []),
              ...(run.seamB !== null ? [{ label: t('tiles.seam.b'), value: `${run.seamB.toFixed(2)} ${run.seamB > SEAM_WARN ? t('tiles.seam.bad') : t('tiles.seam.ok')}`, tone: run.seamB > SEAM_WARN ? ('bad' as const) : ('ok' as const) }] : []),
            ]}
          />
          <Warnings warnings={set.warnings} fixFor={fixFor} />
          <details className="fold-inline">
            <summary>{t('tiles.terrain.tilesUsed')}</summary>
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
            <p className="hint">{t('tiles.terrain.tilesUsedHint')}</p>
          </details>
        </>
      )}
    </section>
  );
}

type TerrainTarget = 'godot' | 'gdevelop';

function TerrainExport() {
  const { t } = useI18n();
  const { state } = useApp();
  const s = state.tiles.terrain;
  const set = s.run.set;
  const running = s.run.status === 'running';
  const [target, setTarget] = useState<TerrainTarget>('godot');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = s.a ? (s.bTransparent || !s.b ? s.a.name : `${s.a.name}-${s.b.name}`) : 'terrain';

  const zip = async () => {
    if (!set) return;
    setBusy(true);
    setError(null);
    try {
      const names: [string, string] = [s.a?.name ?? 'base', s.bTransparent ? 'overlay' : (s.b?.name ?? 'overlay')];
      const bytes = await buildTerrainZip(set, name, names);
      downloadBlob(new Blob([bytes as BlobPart], { type: 'application/zip' }), `${name}-terrain.zip`);
    } catch (e) {
      setError(t('error.export', { message: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ExportCard<TerrainTarget>
      name="terrain-target"
      options={[
        { value: 'godot', label: t('engine.godot') },
        { value: 'gdevelop', label: t('terrain.otherEngines') },
      ]}
      value={target}
      onChange={setTarget}
      steps={[1, 2, 3].map((n) => t(`terrain.${target}.s${n}` as 'terrain.godot.s1', { name: slug(name) }))}
      guideHref={hrefFor('guide', 'tiles')}
      primaryLabel={t('terrain.downloadZip')}
      onPrimary={() => void zip()}
      secondaryLabel={t('export.pngOnly')}
      onSecondary={() => void (async () => set && downloadBlob(await rgbaToPngBlob(set.atlas), `${name}.png`))()}
      busy={busy}
      disabled={running || !set}
      error={error}
    />
  );
}
