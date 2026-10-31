import { useState } from 'react';
import type { RGBAImage } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { RgbaCanvas } from '../common/RgbaCanvas.tsx';

type Zoom = 'fit' | number;

/** Atlas on the stage with the tile grid on top; empty tiles (nothing in them) are crossed out. */
export function TileAtlasView({ image, tileSize, cols, rows, empty, pixelated, labels, info, label }: {
  image: RGBAImage;
  tileSize: number;
  cols: number;
  rows: number;
  /** Set of "col:row" keys of empty tiles. */
  empty?: ReadonlySet<string>;
  pixelated: boolean;
  /** Small text in the corner of each cell, reading order (the items tool numbers its cells). */
  labels?: string[];
  /** Replaces the default size line under the atlas. */
  info?: string;
  /** Accessible name of the picture (default: tile atlas). */
  label?: string;
}) {
  const { t } = useI18n();
  const [zoom, setZoom] = useState<Zoom>('fit');
  const W = image.width;
  const H = image.height;
  const T = tileSize;
  const emptyTiles = [...(empty ?? [])].map((k) => k.split(':').map(Number) as [number, number]);
  return (
    <div className="sheetview">
      <div className="stage-body scroll-stage">
        <div className="sheet-wrap" style={zoom === 'fit' ? { maxWidth: W * 4 } : { width: W * zoom }}>
          <RgbaCanvas image={image} pixelated={pixelated} label={label ?? t('tiles.atlasLabel')} />
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" className="overlay">
            {Array.from({ length: cols + 1 }, (_, c) => (
              <line key={`c${c}`} x1={c * T} x2={c * T} y1={0} y2={H} className="grid-line" vectorEffect="non-scaling-stroke" />
            ))}
            {Array.from({ length: rows + 1 }, (_, r) => (
              <line key={`r${r}`} x1={0} x2={W} y1={r * T} y2={r * T} className="grid-line" vectorEffect="non-scaling-stroke" />
            ))}
            {labels?.map((text, i) => (
              <text key={`l${i}`} x={(i % cols) * T + T * 0.06} y={Math.floor(i / cols) * T + T * 0.2} fontSize={Math.max(3, T * 0.18)} className="frame-label" vectorEffect="non-scaling-stroke">{text}</text>
            ))}
            {emptyTiles.map(([c, r]) => (
              <g key={`e${c}:${r}`}>
                <rect x={c * T} y={r * T} width={T} height={T} className="empty-tile" />
                <line x1={c * T} y1={r * T} x2={(c + 1) * T} y2={(r + 1) * T} className="empty-x" vectorEffect="non-scaling-stroke" />
                <line x1={(c + 1) * T} y1={r * T} x2={c * T} y2={(r + 1) * T} className="empty-x" vectorEffect="non-scaling-stroke" />
              </g>
            ))}
          </svg>
        </div>
      </div>
      <div className="controls">
        <label className="field field-inline">
          <span className="field-label">{t('anim.zoom')}</span>
          <select value={String(zoom)} onChange={(e) => setZoom(e.target.value === 'fit' ? 'fit' : Number(e.target.value))}>
            <option value="fit">{t('view.fit')}</option>
            {[1, 2, 3, 4, 6, 8].map((z) => (
              <option key={z} value={z}>{z}×</option>
            ))}
          </select>
        </label>
        <span className="muted">{info ?? t('tiles.atlasInfo', { w: W, h: H, t: T, cols, rows })}</span>
      </div>
      {empty && empty.size > 0 && <p className="hint">{t('tiles.emptyLegend')}</p>}
    </div>
  );
}
