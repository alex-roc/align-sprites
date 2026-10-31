import { useMemo, useRef, useState } from 'react';
import { slug } from '../../../core/export/common.ts';
import { crop } from '../../../core/image.ts';
import type { ArtMode, ExportTarget, Warning } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { buildItemsZip } from '../../../worker/client.ts';
import { fetchPublicImage } from '../../dev/examples.ts';
import { downloadBlob, rgbaToPngBlob } from '../../lib/image.ts';
import { TILE_PRESETS } from '../../lib/tilePresets.ts';
import { useDropPaste } from '../../lib/useDropPaste.ts';
import { hrefFor } from '../../route.ts';
import { useApp } from '../../state/context.ts';
import type { ItemsState } from '../../state/types.ts';
import { useItemsProcessor } from '../../state/useItemsProcessor.ts';
import { useLoadImage } from '../../state/useLoadImage.ts';
import { DropOverlay } from '../common/DropOverlay.tsx';
import { EmptyStage } from '../common/EmptyStage.tsx';
import { ExportCard } from '../common/ExportCard.tsx';
import { Check, Field, NumberInput, Segmented } from '../common/Field.tsx';
import { PaletteNote } from '../common/PaletteField.tsx';
import { RgbaCanvas } from '../common/RgbaCanvas.tsx';
import { Section } from '../common/Section.tsx';
import { StatusLine } from '../common/StatusLine.tsx';
import { Warnings, type Fix } from '../common/Warnings.tsx';
import { TileAtlasView } from './TileAtlasView.tsx';
import { TileBgFold } from './TileBgFold.tsx';
import { TileSizeField } from './TileSizeField.tsx';

const TARGETS: ExportTarget[] = ['godot', 'gdevelop', 'kaplay', 'generic'];
const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Items and icons: an AI image of separate objects becomes an atlas of exact square cells. */
export function ItemsPanel() {
  useItemsProcessor();
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const s = state.tiles.items;
  const { load, error, busy } = useLoadImage();

  const setSource = async (blob: Blob, name: string) => {
    const img = await load(blob, name);
    if (img) dispatch({ type: 'tiles/items', patch: { source: img, excluded: [], names: {}, run: { ...s.run, sig: null, result: null, error: null } } });
  };
  const { dragging } = useDropPaste((files) => void setSource(files[0], files[0].name));
  const example = async () => {
    try {
      await setSource(await fetchPublicImage('items.png'), 'items.png');
    } catch {
      /* missing example file: nothing to show */
    }
  };

  return (
    <div className="workbench-page">
      <DropOverlay show={dragging} />
      {!s.source ? (
        <EmptyStage
          title={t('items.drop')}
          hint={t('items.dropHint')}
          onFiles={(files) => files[0] && void setSource(files[0], files[0].name)}
          busy={busy}
          error={error}
          examples={[{ key: 'items', label: t('items.example'), onClick: () => void example() }]}
          steps={['items.how.s1', 'items.how.s2', 'items.how.s3']}
        />
      ) : (
        <div className="workbench">
          <aside className="settings" aria-label={t('set.label')}>
            <ItemsSettings onReplace={(f) => void setSource(f, f.name)} />
          </aside>
          <div className="main-col">
            {error && <p className="alert" role="alert">{error}</p>}
            <ItemsStage />
            <ItemsExport />
          </div>
        </div>
      )}
    </div>
  );
}

function ItemsSettings({ onReplace }: { onReplace: (f: File) => void }) {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const s = state.tiles.items;
  const input = useRef<HTMLInputElement>(null);
  const patch = (p: Partial<ItemsState>) => dispatch({ type: 'tiles/items', patch: p });
  const src = s.source!;

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
          name="items-mode"
          label={t('set.style')}
          value={s.mode}
          onChange={(mode) => patch({ mode })}
          options={[
            { value: 'pixel', label: t('mode.pixel') },
            { value: 'cartoon', label: t('mode.cartoon') },
          ]}
        />
      </Section>

      <Section title={t('items.cellSize')}>
        <TileSizeField value={s.cellSize} onChange={(cellSize) => patch({ cellSize })} label={t('items.cellSize')} hint={t('items.cellSizeHint')} />
      </Section>

      <Section title={t('items.fill')} hint={t(`items.fill.${s.fill}Hint`)}>
        <Segmented<ItemsState['fill']>
          name="items-fill"
          label={t('items.fill')}
          value={s.fill}
          onChange={(fill) => patch({ fill })}
          options={[
            { value: 'common', label: t('items.fill.common') },
            { value: 'each', label: t('items.fill.each') },
          ]}
        />
        <Field label={t('items.margin')} hint={t('items.marginHint')}>
          <NumberInput value={s.margin} min={0} max={16} onChange={(margin) => patch({ margin })} className="num-sm" />
        </Field>
      </Section>

      <Section title={t('items.detect')} hint={t('items.detectHint')}>
        <Check checked={s.detectAuto} onChange={(detectAuto) => patch({ detectAuto, excluded: [] })} label={t('items.detectAuto')} />
        {!s.detectAuto && (
          <div className="row">
            <Field label={t('seg.cols')}>
              <NumberInput value={s.cols} min={1} max={64} onChange={(cols) => patch({ cols, excluded: [] })} />
            </Field>
            <Field label={t('seg.rows')}>
              <NumberInput value={s.rows} min={1} max={64} onChange={(rows) => patch({ rows, excluded: [] })} />
            </Field>
          </div>
        )}
        <Field label={t('items.atlasCols')} hint={t('items.atlasColsHint')}>
          <NumberInput value={s.atlasCols} min={0} max={64} onChange={(atlasCols) => patch({ atlasCols })} className="num-sm" />
        </Field>
      </Section>

      {s.mode === 'pixel' && (
        <Section title={t('set.colours')}>
          <Field label={t('colours.max')} hint={t('colours.maxHint')}>
            <NumberInput value={s.maxColors} min={0} max={256} onChange={(maxColors) => patch({ maxColors })} />
          </Field>
          <PaletteNote mode={s.mode} />
        </Section>
      )}

      <TileBgFold src={src} removeBg={s.removeBg} bg={s.bg} onRemoveBg={(removeBg) => patch({ removeBg })} onBg={(p) => patch({ bg: { ...s.bg, ...p } })} />
    </div>
  );
}

function ItemsStage() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const s = state.tiles.items;
  const { run } = s;
  const result = run.result;
  const running = run.status === 'running';
  const src = s.source!;
  const friendlyError = run.error ? (/not implemented/i.test(run.error) ? t('error.notImplemented') : t('error.processing', { message: run.error })) : null;
  const patch = (p: Partial<ItemsState>) => dispatch({ type: 'tiles/items', patch: p });
  const toggle = (index: number) => patch({ excluded: s.excluded.includes(index) ? s.excluded.filter((i) => i !== index) : [...s.excluded, index] });

  const fixFor = (w: Warning): Fix | null => {
    switch (w.key) {
      case 'warn.itemsSmall': {
        const largest = Number(w.params?.largest ?? 0);
        const smaller = TILE_PRESETS.find((p) => p < s.cellSize && p - 2 * s.margin >= largest * 0.85);
        return smaller ? { label: t('fix.itemsCell', { px: smaller }), onClick: () => patch({ cellSize: smaller }) } : null;
      }
      case 'warn.itemsTiny':
        return { label: t('fix.itemsEach'), onClick: () => patch({ fill: 'each' }) };
      default:
        return null;
    }
  };

  const showSource = s.view === 'source' || (result !== null && result.items.length === 0);
  const kept = result?.items.length ?? 0;
  return (
    <section className="stage-card" aria-label={t('stage.label')}>
      <div className="stage-head">
        <Segmented<'atlas' | 'source'>
          name="items-view"
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
        {!result ? (
          <div className="stage-body waiting"><p className="on-stage-soft">{t('stage.waiting')}</p></div>
        ) : showSource ? (
          <div className="sheetview">
            <div className="stage-body scroll-stage">
              <div className="sheet-wrap" style={{ maxWidth: src.image.width * 4 }}>
                <RgbaCanvas image={src.image} pixelated={s.mode === 'pixel'} label={src.name} />
                <svg viewBox={`0 0 ${src.image.width} ${src.image.height}`} preserveAspectRatio="none" className="overlay">
                  {result.detected.map((d) => {
                    const { x, y, w, h } = d.source;
                    const fs = Math.max(10, Math.min(src.image.width, src.image.height) * 0.03);
                    return (
                      <g
                        key={d.index}
                        className="item-hit"
                        role="button"
                        tabIndex={0}
                        aria-pressed={d.excluded}
                        aria-label={t('items.include', { n: d.index })}
                        onClick={() => toggle(d.index)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggle(d.index);
                          }
                        }}
                      >
                        <rect x={x} y={y} width={w} height={h} className={d.excluded ? 'empty-tile' : 'frame-rect'} vectorEffect="non-scaling-stroke" />
                        {d.excluded && (
                          <>
                            <line x1={x} y1={y} x2={x + w} y2={y + h} className="empty-x" vectorEffect="non-scaling-stroke" />
                            <line x1={x + w} y1={y} x2={x} y2={y + h} className="empty-x" vectorEffect="non-scaling-stroke" />
                          </>
                        )}
                        <text x={x + fs * 0.2} y={y + fs} fontSize={fs} className="frame-label" vectorEffect="non-scaling-stroke">{d.index}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
            <p className="hint">{kept === 0 ? t('items.noneLeft') : t('items.sourceHint')}</p>
          </div>
        ) : (
          <>
            <TileAtlasView
              image={result.atlas}
              tileSize={result.cellSize}
              cols={result.cols}
              rows={result.rows}
              pixelated={s.mode === 'pixel'}
              label={t('items.atlasLabel')}
              labels={result.items.map((it) => String(it.index))}
              info={t('items.atlasInfo', { w: result.atlas.width, h: result.atlas.height, n: kept, t: result.cellSize, cols: result.cols, rows: result.rows })}
            />
            <ItemList />
          </>
        )}
      </div>
      {result && (
        <>
          <StatusLine
            items={[
              { label: t('items.diag.found'), value: t('items.diag.foundValue', { kept, out: result.detected.length - kept }) },
              { label: t('items.diag.cell'), value: `${result.cellSize} px` },
              { label: t('items.diag.atlas'), value: `${result.atlas.width}×${result.atlas.height}` },
            ]}
          />
          <Warnings warnings={result.warnings} fixFor={fixFor} />
        </>
      )}
    </section>
  );
}

/** Every item found: thumbnail, editable name and an include switch (excluded ones show the original, dimmed). */
function ItemList() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const s = state.tiles.items;
  const result = s.run.result!;
  const src = s.source!;
  const thumbs = useMemo(
    () => result.detected.map((d) => {
      const it = result.items.find((i) => i.index === d.index);
      return it ? crop(result.atlas, it.rect) : crop(src.image, d.source);
    }),
    [result, src.image],
  );
  const patch = (p: Partial<ItemsState>) => dispatch({ type: 'tiles/items', patch: p });
  const setName = (index: number, name: string) => patch({ names: { ...s.names, [index]: name } });
  const toggle = (index: number) => patch({ excluded: s.excluded.includes(index) ? s.excluded.filter((i) => i !== index) : [...s.excluded, index] });

  return (
    <div className="items-list">
      <p className="hint">{t('items.listHint')}</p>
      <ul>
        {result.detected.map((d, i) => (
          <li key={d.index} className={d.excluded ? 'item-card is-out' : 'item-card'}>
            <div className="item-thumb checker"><RgbaCanvas image={thumbs[i]} pixelated={s.mode === 'pixel'} label={`${d.index}`} /></div>
            <div className="item-meta">
              <Check checked={!d.excluded} onChange={() => toggle(d.index)} label={<span className="item-num" aria-label={t('items.include', { n: d.index })}>{d.index}</span>} />
              <input
                type="text"
                value={s.names[d.index] ?? ''}
                placeholder={`item_${pad2(d.index)}`}
                aria-label={t('items.nameLabel', { n: d.index })}
                disabled={d.excluded}
                onChange={(e) => setName(d.index, e.target.value)}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ItemsExport() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const s = state.tiles.items;
  const result = s.run.result;
  const running = s.run.status === 'running';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = s.source?.name ?? 'items';
  const patch = (p: Partial<ItemsState>) => dispatch({ type: 'tiles/items', patch: p });
  const empty = !result || result.items.length === 0;

  const downloadPng = async () => {
    if (result) downloadBlob(await rgbaToPngBlob(result.atlas), `${slug(name)}.png`);
  };
  const primary = async () => {
    if (!result) return;
    setBusy(true);
    setError(null);
    try {
      const names = result.items.map((it) => s.names[it.index]);
      const zip = await buildItemsZip(result, name, names, s.allFormats ? TARGETS : [s.format]);
      downloadBlob(new Blob([zip as BlobPart], { type: 'application/zip' }), `${slug(name)}-items${s.allFormats ? '' : `-${s.format}`}.zip`);
    } catch (e) {
      setError(t('error.export', { message: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(false);
    }
  };

  const label = t(`engine.${s.format}`);
  return (
    <ExportCard<ExportTarget>
      name="items-format"
      options={TARGETS.map((f) => ({ value: f, label: t(`engine.${f}`) }))}
      value={s.format}
      onChange={(format) => patch({ format })}
      steps={[1, 2, 3].map((n) => t(`items.${s.format}.s${n}` as 'items.godot.s1', { name: slug(name) }))}
      guideHref={hrefFor('guide', 'tiles')}
      all={s.allFormats}
      onAll={(allFormats) => patch({ allFormats })}
      allLabel={t('tiles.exportAll')}
      primaryLabel={s.allFormats ? t('tiles.downloadAll') : t('export.downloadFor', { engine: label })}
      onPrimary={() => void primary()}
      secondaryLabel={t('export.pngOnly')}
      onSecondary={() => void downloadPng()}
      busy={busy}
      disabled={running || empty}
      error={error}
    />
  );
}
