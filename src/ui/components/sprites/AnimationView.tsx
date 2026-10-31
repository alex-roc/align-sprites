import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { SpriteResult } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { cx } from '../../cx.ts';
import { rgbaToCanvas } from '../../lib/image.ts';
import { Check, NumberInput } from '../common/Field.tsx';
import { FrameThumb } from './FrameThumb.tsx';

const GROUND = '#FFC531';
const PAD = 28;

/** The hero: the animation standing on its yellow ground line, with controls and a scrubbing frame strip. */
export function AnimationView({ result }: { result: SpriteResult }) {
  const { t } = useI18n();
  const { sheet } = result;
  const { cell, anims, padBottom, mode } = sheet;
  const sheetCanvas = useMemo(() => rgbaToCanvas(sheet.image), [sheet.image]);
  const pixelated = mode === 'pixel';

  const [animIdx, setAnimIdx] = useState(0);
  const animI = Math.min(animIdx, Math.max(0, anims.length - 1));
  const anim = anims[animI];
  const [playing, setPlaying] = useState(true);
  // null = the animation's own fps (so edits in the settings show up here); set when changed in the controls.
  const [fpsOverride, setFpsOverride] = useState<number | null>(null);
  const fps = fpsOverride ?? anim?.fps ?? 8;
  // Fit about 320 px until the user picks a zoom; re-fits when the cell size changes.
  const fitZoom = Math.min(8, Math.max(1, Math.floor(320 / Math.max(cell.w, cell.h))));
  const [userZoom, setUserZoom] = useState<number | null>(null);
  const zoom = userZoom ?? fitZoom;
  const [onion, setOnion] = useState(false);
  const [guides, setGuides] = useState(true);
  const [frame, setFrame] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const count = anim?.count ?? 0;
  const cur = count ? frame % count : 0;

  useEffect(() => {
    if (!playing || count < 2) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % count), 1000 / Math.max(1, fps));
    return () => clearInterval(id);
  }, [playing, fps, count]);

  const footRow = cell.h - 1 - padBottom;
  const W = cell.w * zoom;
  const H = cell.h * zoom;

  useEffect(() => {
    const c = canvas.current;
    if (!c || !anim) return;
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = !pixelated;
    const draw = (i: number, alpha: number) => {
      ctx.globalAlpha = alpha;
      ctx.drawImage(sheetCanvas, i * cell.w, anim.row * cell.h, cell.w, cell.h, 0, 0, W, H);
    };
    if (onion && count > 1) {
      draw((cur + count - 1) % count, 0.3);
      draw((cur + 1) % count, 0.3);
    }
    draw(cur, 1);
    ctx.globalAlpha = 1;
    if (guides) {
      // Origin cross: where the engine puts the sprite's position (centre of the feet).
      const x = Math.round((Math.floor(cell.w / 2) + 0.5) * zoom) + 0.5;
      const y = Math.round((footRow + 0.5) * zoom) + 0.5;
      ctx.strokeStyle = GROUND;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 8, y);
      ctx.lineTo(x + 8, y);
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x, y + 8);
      ctx.stroke();
    }
  }, [sheetCanvas, anim, cell.w, cell.h, footRow, pixelated, zoom, onion, guides, cur, count, W, H]);

  const step = (d: number) => {
    setPlaying(false);
    setFrame((f) => (count ? (((f % count) + d + count) % count) : 0));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.target.tagName) && e.key === ' ') return;
    if (e.key === ' ') {
      e.preventDefault();
      setPlaying((p) => !p);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      step(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      step(1);
    }
  };

  if (!anim) return null;
  const groundTop = PAD + (footRow + 0.5) * zoom;
  return (
    <div className="anim" onKeyDown={onKey}>
      {anims.length > 1 && (
        <div className="anim-tabs" role="group" aria-label={t('anim.pick')}>
          {anims.map((a, i) => (
            <button key={a.name + a.row} type="button" className={cx('chip', i === animI && 'is-on')} aria-pressed={i === animI} onClick={() => { setAnimIdx(i); setFpsOverride(null); setFrame(0); }}>
              {a.name}
            </button>
          ))}
        </div>
      )}
      <div className="stage-body anim-stage" tabIndex={0} role="group" aria-label={t('anim.stageLabel')}>
        <div className="anim-inner" style={{ height: H + PAD * 2, minWidth: W + PAD * 2 }}>
          {guides && <div className="ground" style={{ top: groundTop }} aria-hidden="true" />}
          {guides && <div className="cellbox" style={{ top: PAD, width: W, height: H }} aria-hidden="true" />}
          <canvas ref={canvas} className="anim-canvas" style={{ top: PAD }} role="img" aria-label={t('anim.canvasLabel')} />
        </div>
        <div className="counter" aria-hidden="true">{cur + 1}<span>/{count}</span></div>
      </div>
      <div className="controls">
        <button type="button" className="btn btn-primary play" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
          {playing ? t('anim.pause') : t('anim.play')}
        </button>
        <label className="field field-inline">
          <span className="field-label">{t('anim.fps')}</span>
          <NumberInput value={fps} min={1} max={60} onChange={setFpsOverride} className="num-sm" />
        </label>
        <label className="field field-inline">
          <span className="field-label">{t('anim.zoom')}</span>
          <select value={zoom} onChange={(e) => setUserZoom(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((z) => (
              <option key={z} value={z}>{z}×</option>
            ))}
          </select>
        </label>
        <Check checked={onion} onChange={setOnion} label={t('anim.onion')} />
        <Check checked={guides} onChange={setGuides} label={t('anim.guides')} />
        <span className="keys-hint">{t('anim.keys')}</span>
      </div>
      {count > 1 && (
        <ol className="strip" aria-label={t('anim.strip')}>
          {Array.from({ length: count }, (_, i) => (
            <li key={i}>
              <button type="button" className={cx('strip-btn', i === cur && 'is-on')} aria-label={t('anim.frame', { n: i + 1 })} aria-current={i === cur} onClick={() => { setPlaying(false); setFrame(i); }}>
                <FrameThumb sheet={sheetCanvas} cell={cell} row={anim.row} index={i} pixelated={pixelated} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
