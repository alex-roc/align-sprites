import type { Asset } from '../../state/types.ts';
import type { SpriteResult } from '../../../core/types.ts';
import { RgbaCanvas } from '../common/RgbaCanvas.tsx';

/** Original image with the detected frame rectangles on top (numbers = frame indices, reading order). */
export function SourceView({ asset, result, pixelated }: { asset: Asset; result: SpriteResult | undefined; pixelated: boolean }) {
  const { width: w, height: h } = asset.image;
  const font = Math.max(10, Math.round(w / 48));
  return (
    <div className="stage" style={{ maxWidth: w * 4 }}>
      <RgbaCanvas image={asset.image} pixelated={pixelated} label={asset.fileName} />
      {result && (
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" className="overlay">
          {result.diag.regions.map((r, i) => (
            <g key={i}>
              <rect x={r.rect.x} y={r.rect.y} width={r.rect.w} height={r.rect.h} className="frame-rect" vectorEffect="non-scaling-stroke" />
              <text x={r.rect.x + 2} y={r.rect.y + font} fontSize={font} className="frame-label">{i}</text>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}
