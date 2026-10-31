import { useEffect, useRef, type CSSProperties } from 'react';
import type { RGBAImage } from '../../../core/types.ts';
import { cx } from '../../cx.ts';
import { drawRGBA } from '../../lib/image.ts';

/** Displays an RGBAImage; `pixelated` keeps hard edges when scaled (pixel art). Checkerboard comes from CSS. */
export function RgbaCanvas({ image, pixelated, className, style, label }: { image: RGBAImage; pixelated?: boolean; className?: string; style?: CSSProperties; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawRGBA(ref.current, image);
  }, [image]);
  return <canvas ref={ref} className={cx('rgba-canvas', 'checker', pixelated && 'pixelated', className)} style={style} role="img" aria-label={label} />;
}
