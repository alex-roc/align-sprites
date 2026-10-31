import { useEffect, useRef, useState } from 'react';
import type { RGBAImage } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { fmtNum } from '../../lib/format.ts';
import { drawRGBA } from '../../lib/image.ts';
import { useApp } from '../../state/context.ts';
import { exportNames } from '../../state/jobs.ts';

function CellCanvas({ image, pixelated, w, h, label }: { image: RGBAImage; pixelated: boolean; w: number; h: number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawRGBA(ref.current, image);
  }, [image]);
  return <canvas ref={ref} className={pixelated ? 'pixelated' : undefined} style={{ width: w, height: h }} role="img" aria-label={label} />;
}

/**
 * Every processed image side by side on ONE yellow ground line, at the same zoom, with its name and height in px
 * underneath: the visual proof that the batch shares a scale. Sheets show their current frame (all in step).
 */
export function AllTogether() {
  const { t } = useI18n();
  const { state } = useApp();
  const names = exportNames(state.assets);
  const items = state.assets.flatMap((a) => {
    const result = state.run.results[a.id];
    return result && result.frames.length ? [{ asset: a, result }] : [];
  });
  const pixelated = state.global.mode === 'pixel';
  const [playing, setPlaying] = useState(true);
  const [frame, setFrame] = useState(0);
  const [userZoom, setUserZoom] = useState<number | null>(null);
  // Width of the stage, so the default zoom fits the screen (a phone gets a smaller zoom than a laptop).
  const hasItems = items.length > 0;
  const stage = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(880);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAvail(Math.max(200, el.clientWidth - 24)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasItems]);

  const sheets = items.filter((i) => i.asset.kind === 'sheet' && i.result.sheet.anims[0]?.count > 1);
  const fps = sheets[0]?.result.sheet.anims[0]?.fps ?? 8;
  useEffect(() => {
    if (!playing || !sheets.length) return;
    const id = setInterval(() => setFrame((f) => f + 1), 1000 / Math.max(1, fps));
    return () => clearInterval(id);
  }, [playing, fps, sheets.length]);

  if (!items.length) return <div className="stage-body waiting"><p className="on-stage-soft">{t('stage.waiting')}</p></div>;
  const totalW = items.reduce((n, i) => n + i.result.sheet.cell.w, 0);
  const tallest = Math.max(...items.map((i) => i.result.sheet.cell.h));
  // Fit the stage width and 400 px tall until the user picks a zoom.
  const zoom = userZoom ?? Math.min(6, Math.max(1, Math.floor(Math.min(avail / totalW, 400 / tallest))));

  return (
    <div className="together">
      <div className="stage-body together-stage" ref={stage}>
        <div className="together-row">
          {items.map(({ asset, result }) => {
            const { cell, padBottom } = result.sheet;
            const first = result.sheet.anims[0];
            const shownFrame = asset.kind === 'sheet' && first && first.count > 1 ? frame % first.count : 0;
            return (
              <figure key={asset.id} className="together-item">
                <div className="together-canvas">
                  <div className="ground" style={{ top: 'auto', bottom: ((result.sheet.anchor === 'center' ? cell.h / 2 : padBottom + 0.5)) * zoom }} aria-hidden="true" />
                  <CellCanvas image={result.frames[shownFrame] ?? result.frames[0]} pixelated={pixelated} w={cell.w * zoom} h={cell.h * zoom} label={names.get(asset.id) ?? asset.name} />
                </div>
                <figcaption>
                  <strong>{asset.name}</strong>
                  <span>{fmtNum(result.diag.refHeight, 0)} px</span>
                </figcaption>
              </figure>
            );
          })}
        </div>
        <p className="together-key">
          <span className="swatch-ground" aria-hidden="true" />
          {t('together.ground')}
        </p>
      </div>
      <div className="controls">
        {sheets.length > 0 && (
          <button type="button" className="btn btn-primary play" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
            {playing ? t('anim.pause') : t('anim.play')}
          </button>
        )}
        <label className="field field-inline">
          <span className="field-label">{t('anim.zoom')}</span>
          <select value={zoom} onChange={(e) => setUserZoom(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 8].map((z) => (
              <option key={z} value={z}>{z}×</option>
            ))}
          </select>
        </label>
        <span className="muted">{t('together.hint')}</span>
      </div>
    </div>
  );
}
