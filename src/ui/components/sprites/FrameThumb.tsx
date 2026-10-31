import { useEffect, useRef } from 'react';

/** Height of a strip thumbnail in CSS px; the width follows the cell proportions. */
export const THUMB_H = 72;

/** One WHOLE cell of the sheet (never cropped: scaled to fit, hard edges in pixel art) for the frame strip. */
export function FrameThumb({ sheet, cell, row, index, pixelated }: { sheet: HTMLCanvasElement; cell: { w: number; h: number }; row: number; index: number; pixelated: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = cell.w;
    c.height = cell.h;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(sheet, index * cell.w, row * cell.h, cell.w, cell.h, 0, 0, cell.w, cell.h);
  }, [sheet, cell.w, cell.h, row, index]);
  return (
    <canvas
      ref={ref}
      className={pixelated ? 'pixelated' : undefined}
      style={{ height: THUMB_H, width: Math.max(8, Math.round((THUMB_H * cell.w) / cell.h)), objectFit: 'contain' }}
      aria-hidden="true"
    />
  );
}
