import { useEffect, useRef } from 'react';
import type { RGBAImage } from '../../../core/types.ts';
import { rgbaToCanvas } from '../../lib/image.ts';

/** A tile repeated 3×3: seams (when the texture does not wrap) are obvious here. */
export function TiledPreview({ image, pixelated, label }: { image: RGBAImage; pixelated: boolean; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = image.width * 3;
    c.height = image.height * 3;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const src = rgbaToCanvas(image);
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) ctx.drawImage(src, x * image.width, y * image.height);
  }, [image]);
  return <canvas ref={ref} className={`checker tiled-preview${pixelated ? ' pixelated' : ''}`} role="img" aria-label={label} />;
}
