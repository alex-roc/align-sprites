import { useState } from 'react';
import type { SpriteResult } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { RgbaCanvas } from '../common/RgbaCanvas.tsx';

type Zoom = 'fit' | number;

/** Resulting sheet with the cell grid and the feet line of every row. */
export function SheetView({ result }: { result: SpriteResult }) {
  const { t } = useI18n();
  const [zoom, setZoom] = useState<Zoom>('fit');
  const { image, cell, cols, rows, padBottom, anims, mode } = result.sheet;
  const W = image.width;
  const H = image.height;
  const feet = cell.h - 1 - padBottom + 0.5;
  return (
    <div>
      <div className="row wrap toolbar">
        <label className="field field-inline">
          <span className="field-label">{t('view.zoom')}</span>
          <select value={String(zoom)} onChange={(e) => setZoom(e.target.value === 'fit' ? 'fit' : Number(e.target.value))}>
            <option value="fit">{t('view.fit')}</option>
            {[1, 2, 3, 4, 6, 8].map((z) => (
              <option key={z} value={z}>{z}×</option>
            ))}
          </select>
        </label>
        <span className="muted">{t('sheet.info', { w: W, h: H, cw: cell.w, ch: cell.h, cols, rows })}</span>
      </div>
      <div className="scroll">
        <div className="stage" style={zoom === 'fit' ? { maxWidth: W * 4 } : { width: W * zoom }}>
          <RgbaCanvas image={image} pixelated={mode === 'pixel'} label={t('sheet.label')} />
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" className="overlay">
            {Array.from({ length: cols + 1 }, (_, c) => (
              <line key={`c${c}`} x1={c * cell.w} x2={c * cell.w} y1={0} y2={H} className="grid-line" vectorEffect="non-scaling-stroke" />
            ))}
            {Array.from({ length: rows + 1 }, (_, r) => (
              <line key={`r${r}`} x1={0} x2={W} y1={r * cell.h} y2={r * cell.h} className="grid-line" vectorEffect="non-scaling-stroke" />
            ))}
            {Array.from({ length: rows }, (_, r) => (
              <line key={`f${r}`} x1={0} x2={W} y1={r * cell.h + feet} y2={r * cell.h + feet} className="feet-line" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
        </div>
      </div>
      <ul className="legend">
        {anims.map((a) => (
          <li key={a.name + a.row}>{t('sheet.row', { row: a.row, name: a.name, count: a.count, fps: a.fps })}</li>
        ))}
      </ul>
    </div>
  );
}
