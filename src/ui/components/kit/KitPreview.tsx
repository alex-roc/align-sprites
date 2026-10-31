import { useEffect, useRef, useState } from 'react';
import type { RGBAImage, SpriteResult } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { rgbaToCanvas } from '../../lib/image.ts';

const GROUND = '#FFC531';

/**
 * Sprites standing on a row of the kit's tiles, drawn at real scale (1 sprite px = 1 tile px) and shown with an
 * integer zoom: if the sprites look the right size next to the tiles, they will in the game.
 */
export function KitPreview({ sprites, tiles, tileSize, pixelated }: { sprites: SpriteResult[]; tiles: RGBAImage[]; tileSize: number; pixelated: boolean }) {
  const { t } = useI18n();
  const ref = useRef<HTMLCanvasElement>(null);
  const [userZoom, setUserZoom] = useState<number | null>(null);

  const cells = sprites.filter((s) => s.frames[0]).map((s) => ({ img: s.frames[0], foot: s.sheet.cell.h - s.sheet.padBottom }));
  const gap = tileSize;
  const spritesW = cells.reduce((n, c) => n + c.img.width + gap, gap);
  const T = tileSize;
  const cols = Math.max(10, Math.ceil(spritesW / T) + 1);
  const W = cols * T;
  const above = Math.max(T * 2, ...cells.map((c) => c.foot));
  const H = above + T * 2;
  const zoom = userZoom ?? Math.min(6, Math.max(1, Math.floor(640 / W)));

  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    c.width = W;
    c.height = H;
    ctx.clearRect(0, 0, W, H);
    if (tiles.length) {
      const canv = tiles.map(rgbaToCanvas);
      for (let k = 0; k < cols; k++) for (let row = 0; row < 2; row++) ctx.drawImage(canv[(k + row) % canv.length], k * T, above + row * T, T, T);
    } else {
      ctx.fillStyle = GROUND;
      ctx.fillRect(0, above, W, 2);
    }
    let x = gap;
    for (const cell of cells) {
      ctx.drawImage(rgbaToCanvas(cell.img), x, above - cell.foot);
      x += cell.img.width + gap;
    }
  });

  return (
    <div className="kit-preview">
      <div className="stage-body scroll-stage kit-stage">
        <canvas ref={ref} className={pixelated ? 'pixelated' : undefined} style={{ width: W * zoom, height: H * zoom }} role="img" aria-label={t('kit.previewLabel')} />
      </div>
      <div className="controls">
        <label className="field field-inline">
          <span className="field-label">{t('anim.zoom')}</span>
          <select value={zoom} onChange={(e) => setUserZoom(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 8].map((z) => (
              <option key={z} value={z}>{z}×</option>
            ))}
          </select>
        </label>
        <span className="muted">{tiles.length ? t('kit.previewHint', { tile: T }) : t('kit.previewNoTiles')}</span>
      </div>
    </div>
  );
}
