import { useState } from 'react';
import type { RGBAImage } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { RgbaCanvas } from '../common/RgbaCanvas.tsx';

type Zoom = 'fit' | number;

/** Atlas image with the tile grid on top; empty tiles (nothing in them) are crossed out. */
export function TileAtlasView({ image, tileSize, cols, rows, empty, pixelated }: {
  image: RGBAImage;
  tileSize: number;
  cols: number;
  rows: number;
  /** Set of "col:row" keys of empty tiles. */
  empty?: ReadonlySet<string>;
  pixelated: boolean;
}) {
  const { t } = useI18n();
  const [zoom, setZoom] = useState<Zoom>('fit');
  const W = image.width;
  const H = image.height;
  const T = tileSize;
  const emptyTiles = [...(empty ?? [])].map((k) => k.split(':').map(Number) as [number, number]);
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
        <span className="muted">{t('tiles.atlasInfo', { w: W, h: H, t: T, cols, rows })}</span>
      </div>
      <div className="scroll">
        <div className="stage" style={zoom === 'fit' ? { maxWidth: W * 4 } : { width: W * zoom }}>
          <RgbaCanvas image={image} pixelated={pixelated} label={t('tiles.atlasLabel')} />
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" className="overlay">
            {Array.from({ length: cols + 1 }, (_, c) => (
              <line key={`c${c}`} x1={c * T} x2={c * T} y1={0} y2={H} className="grid-line" vectorEffect="non-scaling-stroke" />
            ))}
            {Array.from({ length: rows + 1 }, (_, r) => (
              <line key={`r${r}`} x1={0} x2={W} y1={r * T} y2={r * T} className="grid-line" vectorEffect="non-scaling-stroke" />
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
    </div>
  );
}
