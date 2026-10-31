import { useEffect, useRef } from 'react';

/** One cell of the sheet as a small pixelated thumbnail (frame strip). */
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
  return <canvas ref={ref} className={pixelated ? 'pixelated' : undefined} aria-hidden="true" />;
}
