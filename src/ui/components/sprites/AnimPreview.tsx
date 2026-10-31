import { useEffect, useMemo, useRef, useState } from 'react';
import type { SpriteResult } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { rgbaToCanvas } from '../../lib/image.ts';
import { Check, NumberInput } from '../common/Field.tsx';

const FEET_COLOR = '#ff4d6d';
const ORIGIN_COLOR = '#38bdf8';

/** Animated preview of one animation row: play/pause, fps, zoom, onion skin, feet line and origin cross. */
export function AnimPreview({ result }: { result: SpriteResult }) {
  const { t } = useI18n();
  const { sheet } = result;
  const { cell, anims, padBottom, mode } = sheet;
  const sheetCanvas = useMemo(() => rgbaToCanvas(sheet.image), [sheet.image]);

  const [animIdx, setAnimIdx] = useState(0);
  const anim = anims[Math.min(animIdx, anims.length - 1)];
  const [playing, setPlaying] = useState(true);
  // null = use the animation's own fps (so edits in step 2 show up here); set when the user changes it here.
  const [fpsOverride, setFpsOverride] = useState<number | null>(null);
  const fps = fpsOverride ?? anim?.fps ?? 8;
  // Fit ~256 px until the user picks a zoom; re-fits when the cell size changes (e.g. a batch grows the cell).
  const fitZoom = Math.min(8, Math.max(1, Math.floor(256 / Math.max(cell.w, cell.h))));
  const [userZoom, setZoom] = useState<number | null>(null);
  const zoom = userZoom ?? fitZoom;
  const [onion, setOnion] = useState(false);
  const [showFeet, setShowFeet] = useState(true);
  const [showOrigin, setShowOrigin] = useState(true);
  const [frame, setFrame] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const count = anim?.count ?? 0;

  useEffect(() => {
    if (!playing || count < 2) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % count), 1000 / Math.max(1, fps));
    return () => clearInterval(id);
  }, [playing, fps, count]);

  const cur = count ? frame % count : 0;

  useEffect(() => {
    const c = canvas.current;
    if (!c || !anim) return;
    c.width = cell.w * zoom;
    c.height = cell.h * zoom;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = mode === 'cartoon';
    const draw = (i: number, alpha: number) => {
      ctx.globalAlpha = alpha;
      ctx.drawImage(sheetCanvas, i * cell.w, anim.row * cell.h, cell.w, cell.h, 0, 0, c.width, c.height);
    };
    if (onion && count > 1) {
      draw((cur + count - 1) % count, 0.3);
      draw((cur + 1) % count, 0.3);
    }
    draw(cur, 1);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    if (showFeet) {
      const y = Math.round((cell.h - 1 - padBottom + 0.5) * zoom) + 0.5;
      ctx.strokeStyle = FEET_COLOR;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(c.width, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (showOrigin) {
      const x = Math.round((Math.floor(cell.w / 2) + 0.5) * zoom) + 0.5;
      const y = Math.round((cell.h - 1 - padBottom + 0.5) * zoom) + 0.5;
      const r = 6;
      ctx.strokeStyle = ORIGIN_COLOR;
      ctx.beginPath();
      ctx.moveTo(x - r, y);
      ctx.lineTo(x + r, y);
      ctx.moveTo(x, y - r);
      ctx.lineTo(x, y + r);
      ctx.stroke();
    }
  }, [sheetCanvas, anim, cell.w, cell.h, padBottom, mode, zoom, onion, showFeet, showOrigin, cur, count]);

  if (!anim) return null;
  return (
    <div className="preview">
      <div className="row wrap toolbar">
        {anims.length > 1 && (
          <label className="field field-inline">
            <span className="field-label">{t('preview.animation')}</span>
            <select value={animIdx} onChange={(e) => {
                setAnimIdx(Number(e.target.value));
                setFpsOverride(null);
                setFrame(0);
              }}>
              {anims.map((a, i) => (
                <option key={a.name + a.row} value={i}>{a.name}</option>
              ))}
            </select>
          </label>
        )}
        <button type="button" className="btn btn-primary" onClick={() => setPlaying((p) => !p)}>
          {playing ? t('preview.pause') : t('preview.play')}
        </button>
        <label className="field field-inline">
          <span className="field-label">{t('preview.fps')}</span>
          <NumberInput value={fps} min={1} max={60} onChange={setFpsOverride} className="num-sm" />
        </label>
        <label className="field field-inline">
          <span className="field-label">{t('view.zoom')}</span>
          <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((z) => (
              <option key={z} value={z}>{z}×</option>
            ))}
          </select>
        </label>
      </div>
      <div className="row wrap toolbar">
        <Check checked={onion} onChange={setOnion} label={t('preview.onion')} />
        <Check checked={showFeet} onChange={setShowFeet} label={t('preview.feet')} />
        <Check checked={showOrigin} onChange={setShowOrigin} label={t('preview.origin')} />
      </div>
      <div className="scroll">
        <canvas ref={canvas} className="checker preview-canvas" role="img" aria-label={t('preview.label')} />
      </div>
      {count > 1 && (
        <label className="field field-inline">
          <span className="field-label">{t('preview.frame', { n: cur + 1, count })}</span>
          <input
            type="range"
            min={0}
            max={count - 1}
            value={cur}
            onChange={(e) => {
              setPlaying(false);
              setFrame(Number(e.target.value));
            }}
          />
        </label>
      )}
    </div>
  );
}
