import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { FrameRegion, Rect, SpriteResult } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { cx } from '../../cx.ts';
import { dragRect, type Handle } from '../../lib/rects.ts';
import { useApp } from '../../state/context.ts';
import type { Asset } from '../../state/types.ts';
import { RgbaCanvas } from '../common/RgbaCanvas.tsx';

const HANDLES: Handle[] = ['nw', 'ne', 'sw', 'se'];

interface Drag {
  index: number;
  handle: Handle;
  /** Pointer position (CSS px) and the rect (image px) when the drag started. */
  x: number;
  y: number;
  rect: Rect;
}

/**
 * Original image with the detected frames boxed in magenta (numbers = frame numbers, reading order). "Edit boxes"
 * turns them into draggable, resizable boxes: the segmentation becomes manual until you go back to automatic.
 */
export function SourceView({ asset, result, pixelated }: { asset: Asset; result: SpriteResult | undefined; pixelated: boolean }) {
  const { t } = useI18n();
  const { dispatch } = useApp();
  const { width: w, height: h } = asset.image;
  const font = Math.max(10, Math.round(w / 48));
  const [editing, setEditing] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const canEdit = asset.kind === 'sheet';
  const regions: FrameRegion[] = asset.regions ?? result?.diag.regions ?? [];
  const patch = (next: FrameRegion[] | null) => dispatch({ type: 'asset/patch', id: asset.id, patch: { regions: next } });
  const setRect = (i: number, rect: Rect) => patch(regions.map((r, k) => (k === i ? { ...r, rect } : r)));
  const backToAuto = () => {
    patch(null);
    setSel(null);
  };

  const start = (index: number, handle: Handle) => (e: PointerEvent<HTMLElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSel(index);
    drag.current = { index, handle, x: e.clientX, y: e.clientY, rect: regions[index].rect };
  };
  const move = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    const box = wrap.current?.getBoundingClientRect();
    if (!d || !box || !box.width) return;
    const k = w / box.width;
    setRect(d.index, dragRect(d.rect, d.handle, (e.clientX - d.x) * k, (e.clientY - d.y) * k, w, h));
  };
  const end = () => {
    drag.current = null;
  };
  const remove = (i: number) => {
    patch(regions.filter((_, k) => k !== i));
    setSel(null);
  };
  const onBoxKey = (i: number) => (e: KeyboardEvent) => {
    const step = e.shiftKey ? 8 : 1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (d) {
      e.preventDefault();
      setRect(i, dragRect(regions[i].rect, 'move', d[0], d[1], w, h));
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      remove(i);
    }
  };
  // A new box takes the typical size of the existing ones and starts in the middle of the image.
  const add = () => {
    const median = (v: number[], fallback: number) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)] ?? fallback;
    const bw = Math.min(w, Math.max(8, median(regions.map((r) => r.rect.w), Math.round(w / 6))));
    const bh = Math.min(h, Math.max(8, median(regions.map((r) => r.rect.h), Math.round(h / 3))));
    patch([...regions, { rect: { x: Math.round((w - bw) / 2), y: Math.round((h - bh) / 2), w: bw, h: bh }, row: 0, col: regions.length }]);
    setSel(regions.length);
  };

  return (
    <div className="sheetview">
      <div className="stage-body scroll-stage">
        <div ref={wrap} className="sheet-wrap" style={{ maxWidth: w * 4 }} onPointerDown={() => setSel(null)}>
          <RgbaCanvas image={asset.image} pixelated={pixelated} label={asset.fileName} />
          {editing ? (
            regions.map((r, i) => (
              <div
                key={i}
                className={cx('rbox', sel === i && 'is-sel')}
                style={{ left: `${(r.rect.x / w) * 100}%`, top: `${(r.rect.y / h) * 100}%`, width: `${(r.rect.w / w) * 100}%`, height: `${(r.rect.h / h) * 100}%` }}
                tabIndex={0}
                role="button"
                aria-label={t('source.box', { n: i })}
                onPointerDown={start(i, 'move')}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
                onFocus={() => setSel(i)}
                onKeyDown={onBoxKey(i)}
              >
                <span className="rbox-n" aria-hidden="true">{i}</span>
                {sel === i &&
                  HANDLES.map((hd) => (
                    <i key={hd} className={`rh rh-${hd}`} aria-hidden="true" onPointerDown={start(i, hd)} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />
                  ))}
              </div>
            ))
          ) : (
            result && (
              <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" className="overlay">
                {regions.map((r, i) => (
                  <g key={i}>
                    <rect x={r.rect.x} y={r.rect.y} width={r.rect.w} height={r.rect.h} className="frame-rect" vectorEffect="non-scaling-stroke" />
                    <text x={r.rect.x + 2} y={r.rect.y + font} fontSize={font} className="frame-label">{i}</text>
                  </g>
                ))}
              </svg>
            )
          )}
        </div>
      </div>
      {canEdit && (
        <div className="controls">
          {editing ? (
            <>
              <button type="button" className="btn btn-sm" onClick={add}>{t('source.add')}</button>
              <button type="button" className="btn btn-sm" disabled={sel === null} onClick={() => sel !== null && remove(sel)}>{t('source.remove')}</button>
              {asset.regions && <button type="button" className="btn btn-sm" onClick={backToAuto}>{t('seg.backToAuto')}</button>}
              <button type="button" className="btn btn-sm btn-primary" onClick={() => { setEditing(false); setSel(null); }}>{t('source.done')}</button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>{t('source.edit')}</button>
              {asset.regions && <button type="button" className="btn btn-sm" onClick={backToAuto}>{t('seg.backToAuto')}</button>}
            </>
          )}
        </div>
      )}
      <p className="hint">{editing ? t('source.editHint') : asset.regions ? t('source.manualHint') : t('source.hint')}</p>
    </div>
  );
}
