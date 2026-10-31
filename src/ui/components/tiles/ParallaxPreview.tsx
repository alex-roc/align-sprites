import { useEffect, useMemo, useRef, useState } from 'react';
import type { RGBAImage } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { cx } from '../../cx.ts';
import { rgbaToCanvas } from '../../lib/image.ts';
import { Slider } from '../common/Field.tsx';

/** Shown behind transparent layers (a layer with no sky of its own). */
const BACKDROP = '#7f95ab';
const MAX_ZOOM = 8;
/** Tallest preview in CSS px before the zoom drops. */
const MAX_VIEW_H = 520;

export interface PreviewLayer {
  image: RGBAImage;
  factor: number;
}

const mod = (a: number, n: number): number => ((a % n) + n) % n;

/** Whole-number zoom that fits `boxW` (and the height cap), at least 1. */
function fitZoom(boxW: number, viewW: number, viewH: number, copies = 1): number {
  return Math.max(1, Math.min(MAX_ZOOM, Math.floor(boxW / (viewW * copies)), Math.floor(MAX_VIEW_H / viewH)));
}

function useBoxWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/**
 * Animated parallax at the game resolution: the camera moves right and layer i shifts by camera × factor, drawn as
 * many times as the view needs. The canvas keeps the game size and is enlarged by a whole number (crisp pixels).
 */
export function ParallaxPlayer({ layers, height, speed, onSpeed, pixelated }: {
  layers: PreviewLayer[];
  height: number;
  speed: number;
  onSpeed: (n: number) => void;
  pixelated: boolean;
}) {
  const { t } = useI18n();
  const [box, boxW] = useBoxWidth();
  const canvas = useRef<HTMLCanvasElement>(null);
  const viewW = Math.round((height * 16) / 9);
  const zoom = fitZoom(boxW || viewW, viewW, height);
  // Start paused for people who asked for less motion.
  const [playing, setPlaying] = useState(() => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const sources = useMemo(() => layers.map((l) => rgbaToCanvas(l.image)), [layers]);
  const factors = layers.map((l) => l.factor);
  const factorsRef = useRef(factors);
  const speedRef = useRef(speed);
  const cam = useRef(0);
  useEffect(() => {
    factorsRef.current = factors;
    speedRef.current = speed;
  });

  const draw = useRef<() => void>(() => undefined);
  useEffect(() => {
    draw.current = () => {
      const c = canvas.current;
      const ctx = c?.getContext('2d');
      if (!c || !ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = BACKDROP;
      ctx.fillRect(0, 0, c.width, c.height);
      sources.forEach((src, i) => {
        const w = src.width;
        for (let x = -mod(cam.current * (factorsRef.current[i] ?? 0), w); x < c.width; x += w) ctx.drawImage(src, Math.round(x), 0);
      });
    };
  }, [sources]);

  // Still frame whenever something changes while paused.
  useEffect(() => {
    draw.current();
  }, [sources, viewW, height, zoom, factors.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      cam.current += (speedRef.current * Math.min(100, now - last)) / 1000;
      last = now;
      draw.current();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, sources]);

  return (
    <div className="parallax-player">
      <div ref={box} className="parallax-box">
        <canvas
          ref={canvas}
          width={viewW}
          height={height}
          className={cx(pixelated && 'pixelated')}
          style={{ width: viewW * zoom, height: height * zoom }}
          role="img"
          aria-label={t('parallax.view.scroll')}
        />
      </div>
      <div className="parallax-controls">
        <button type="button" className="btn btn-sm btn-stage" aria-pressed={playing} onClick={() => setPlaying((p) => !p)}>
          {playing ? t('parallax.pause') : t('parallax.play')}
        </button>
        <div className="parallax-speed">
          <Slider label={t('parallax.previewSpeed')} value={speed} min={0} max={240} step={10} unit="px/s" onChange={onSpeed} />
        </div>
      </div>
      <p className="on-stage-soft">{t('parallax.previewHint', { w: viewW, h: height })}</p>
    </div>
  );
}

/** One layer drawn twice side by side, with a line where its right edge meets its left edge. */
export function WrapCheck({ image, pixelated, label }: { image: RGBAImage; pixelated: boolean; label: string }) {
  const { t } = useI18n();
  const [box, boxW] = useBoxWidth();
  const canvas = useRef<HTMLCanvasElement>(null);
  const zoom = fitZoom(boxW || image.width * 2, image.width, image.height, 2);
  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const src = rgbaToCanvas(image);
    c.width = image.width * 2;
    c.height = image.height;
    ctx.drawImage(src, 0, 0);
    ctx.drawImage(src, image.width, 0);
  }, [image]);
  return (
    <div className="parallax-player">
      <div ref={box} className="parallax-box">
        <div className="wrap-canvas" style={{ width: image.width * 2 * zoom, height: image.height * zoom }}>
          <canvas
            ref={canvas}
            className={cx('checker', pixelated && 'pixelated')}
            style={{ width: '100%', height: '100%' }}
            role="img"
            aria-label={`${t('parallax.view.wrap')}: ${label}`}
          />
          <i className="seam-mark" style={{ left: image.width * zoom }} aria-hidden="true" />
        </div>
      </div>
      <p className="on-stage-soft">{t('parallax.wrapHint')}</p>
    </div>
  );
}
