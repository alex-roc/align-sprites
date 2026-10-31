import { useMemo, useState } from 'react';
import type { ExportTarget, RGBAImage } from '../../../core/types.ts';
import { useI18n, type MessageKey } from '../../../i18n/index.ts';
import { buildKitZip } from '../../../worker/client.ts';
import { cx } from '../../cx.ts';
import { downloadBlob } from '../../lib/image.ts';
import { atlasTiles } from '../../lib/kit.ts';
import { GAME_TILES } from '../../persist.ts';
import { hrefFor } from '../../route.ts';
import { useApp } from '../../state/context.ts';
import { exportNames } from '../../state/jobs.ts';
import { ExportCard } from '../common/ExportCard.tsx';
import { PaletteField, Swatches } from '../common/PaletteField.tsx';
import { usePaletteSummary } from '../../state/usePaletteSummary.ts';
import { Section } from '../common/Section.tsx';
import { fixedPalette } from '../../state/jobs.ts';
import { resolutionByWidth } from '../../../core/kit/level.ts';
import { KitPreview } from './KitPreview.tsx';
import { ResolutionField } from './ResolutionField.tsx';
import { TestLevel, type LevelTile } from './TestLevel.tsx';

const ENGINES: ExportTarget[] = ['godot', 'gdevelop', 'kaplay', 'generic'];
const GUIDE_SECTION: Record<ExportTarget, string> = { godot: 'godot', gdevelop: 'gdevelop', kaplay: 'kaplay', generic: 'other' };

/**
 * Kit: everything produced in this session in one place. Shared settings on the left (the tile size of the game and
 * the palette), a summary, a "do they fit" preview and one download for an engine on the right.
 */
export function KitTab() {
  const { t, lang } = useI18n();
  const { state, dispatch } = useApp();
  const paletteSummary = usePaletteSummary();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const g = state.global;
  const tileSize = g.gameTile;
  const names = exportNames(state.assets);
  const sprites = state.assets.flatMap((a) => (state.run.results[a.id] ? [{ asset: a, result: { ...state.run.results[a.id], name: names.get(a.id) ?? a.name } }] : []));
  const sheet = state.tiles.sheet;
  const atlas = sheet.run.result;
  const atlasName = sheet.source?.name ?? 'tiles';
  const terrain = state.tiles.terrain;
  const set = terrain.run.set;
  const terrainName = terrain.a ? (terrain.bTransparent || !terrain.b ? terrain.a.name : `${terrain.a.name}-${terrain.b.name}`) : 'terrain';
  const running = state.run.status === 'running';
  const engine = state.exportEngine;
  const fmt = (n: number) => Number(n.toFixed(2)).toLocaleString(lang);
  const palette = fixedPalette(g);

  // Tiles for the preview: the atlas if there is one, else the two terrain textures.
  const previewTiles = useMemo<RGBAImage[]>(() => {
    if (atlas) return atlasTiles(atlas.atlas, atlas.tileSize, atlas.tiles);
    return [terrain.run.tileA, terrain.run.tileB].filter((x): x is RGBAImage => !!x);
  }, [atlas, terrain.run.tileA, terrain.run.tileB]);
  // Ground choices of the test level: every tile with content of the atlas, plus the terrain's two base textures.
  const levelTiles = useMemo<LevelTile[]>(() => {
    const out: LevelTile[] = atlas ? atlasTiles(atlas.atlas, atlas.tileSize, atlas.tiles, Infinity).map((image, i) => ({ key: `atlas${i}`, image })) : [];
    [terrain.run.tileA, terrain.run.tileB].forEach((image, i) => image && out.push({ key: `terrain${i}`, image }));
    return out;
  }, [atlas, terrain.run.tileA, terrain.run.tileB]);
  const previewTile = atlas?.tileSize ?? terrain.run.tileA?.width ?? tileSize;

  const mismatch = [atlas ? { name: atlasName, size: atlas.tileSize } : null, set ? { name: terrainName, size: set.tileSize } : null].find((m) => m && m.size !== tileSize);

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      const bytes = await buildKitZip(
        {
          sprites: sprites.map((s) => s.result),
          ...(atlas ? { atlas: { result: atlas, name: atlasName } } : {}),
          ...(set ? { terrain: { result: set, name: terrainName, names: [terrain.a?.name ?? 'base', terrain.bTransparent ? 'overlay' : (terrain.b?.name ?? 'overlay')] as [string, string] } } : {}),
        },
        engine,
      );
      downloadBlob(new Blob([bytes as BlobPart], { type: 'application/zip' }), `game-kit-${engine}.zip`);
    } catch (e) {
      setError(t('error.export', { message: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(false);
    }
  };

  const empty = !sprites.length && !atlas && !set;
  return (
    <div className="workbench-page">
      <div className="workbench">
        <aside className="settings" aria-label={t('set.label')}>
          <div className="settings-in">
            <Section title={t('kit.tileTitle')} hint={t('kit.tileHint')}>
              <div className="chips" role="group" aria-label={t('kit.tileTitle')}>
                {GAME_TILES.map((p) => (
                  <button key={p} type="button" className={cx('chip', 'is-32', p === tileSize && 'is-on')} aria-pressed={p === tileSize} onClick={() => dispatch({ type: 'global/patch', patch: { gameTile: p } })}>
                    {p} px
                  </button>
                ))}
              </div>
            </Section>
            <Section title={t('kit.resTitle')} hint={t('kit.resHint')}>
              <ResolutionField />
            </Section>
            <Section title={t('kit.paletteTitle')} hint={t('kit.paletteHint')}>
              <PaletteField />
            </Section>
          </div>
        </aside>
        <div className="main-col">
          <section className="stage-card" aria-label={t('kit.summary')}>
            <h2 className="card-title">{t('kit.summary')}</h2>
            {empty && <p className="muted">{t('kit.empty')}</p>}
            <div className="kit-summary">
              <div className="kit-block">
                <h3>{t('kit.sprites')}</h3>
                {sprites.length ? (
                  <ul>
                    {sprites.map(({ asset, result }) => (
                      <li key={asset.id}>
                        <strong>{asset.name}</strong>
                        <span>{t('kit.spriteLine', { height: Math.round(result.diag.refHeight), tiles: fmt(result.diag.refHeight / tileSize), w: result.sheet.cell.w, h: result.sheet.cell.h })}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">{t('kit.noSprites')} <a href={hrefFor('sprites')}>{t('kit.openSprites')}</a></p>
                )}
              </div>
              <div className="kit-block">
                <h3>{t('kit.tiles')}</h3>
                {atlas || set ? (
                  <ul>
                    {atlas && (
                      <li>
                        <strong>{atlasName}</strong>
                        <span>{t('kit.atlasLine', { size: atlas.tileSize, count: atlas.tiles.filter((x) => !x.empty).length })}</span>
                      </li>
                    )}
                    {set && (
                      <li>
                        <strong>{terrainName}</strong>
                        <span>{t('kit.terrainLine', { size: set.tileSize, layout: set.layout === 'blob47' ? 'Blob 47' : 'Dual 16', count: set.tiles.length })}</span>
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="muted">{t('kit.noTiles')} <a href={hrefFor('tiles')}>{t('kit.openTiles')}</a></p>
                )}
              </div>
              <div className="kit-block">
                <h3>{t('kit.palette')}</h3>
                <p>{paletteSummary(g)}</p>
                {palette && <Swatches colors={palette} label={t('palette.swatches')} />}
              </div>
            </div>
            {mismatch && (
              <div className="notice" role="status">
                <span>{t('kit.mismatch', { name: mismatch.name, size: mismatch.size, tile: tileSize })}</span>
                <button type="button" className="btn btn-sm" onClick={() => dispatch({ type: 'global/patch', patch: { gameTile: GAME_TILES.includes(mismatch.size) ? mismatch.size : tileSize } })} disabled={!GAME_TILES.includes(mismatch.size)}>
                  {t('kit.mismatchFix', { size: mismatch.size })}
                </button>
              </div>
            )}
          </section>
          {(sprites.length > 0 || previewTiles.length > 0) && (
            <section className="stage-card" aria-label={t('kit.preview')}>
              <h2 className="card-title">{t('kit.preview')}</h2>
              <KitPreview sprites={sprites.map((s) => s.result)} tiles={previewTiles} tileSize={previewTile} pixelated={g.mode === 'pixel'} />
            </section>
          )}
          {sprites.length > 0 && (
            <TestLevel sprites={sprites.map((s) => ({ id: s.asset.id, name: s.asset.name, result: s.result }))} tiles={levelTiles} gameTile={tileSize} res={resolutionByWidth(g.gameRes)} pixelated={g.mode === 'pixel'} />
          )}
          <ExportCard<ExportTarget>
            name="kit-engine"
            options={ENGINES.map((e) => ({ value: e, label: t(`engine.${e}`) }))}
            value={engine}
            onChange={(exportEngine) => dispatch({ type: 'export', patch: { exportEngine } })}
            steps={[1, 2, 3].map((n) => t(`kit.step${n}` as MessageKey, { tile: tileSize }))}
            guideHref={hrefFor('guide', GUIDE_SECTION[engine])}
            primaryLabel={t('kit.download', { engine: t(`engine.${engine}`) })}
            onPrimary={() => void download()}
            busy={busy}
            disabled={running || empty}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}
