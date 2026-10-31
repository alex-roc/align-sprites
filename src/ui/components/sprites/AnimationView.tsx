import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { SpriteResult } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { cx } from '../../cx.ts';
import { rangesText } from '../../lib/frameOps.ts';
import { rgbaToCanvas } from '../../lib/image.ts';
import type { Asset } from '../../state/types.ts';
import { Check, NumberInput } from '../common/Field.tsx';
import { FrameEditor } from './FrameEditor.tsx';
import { FrameThumb } from './FrameThumb.tsx';
import { useDuplicates, useFrameEditor } from './useFrameEditor.ts';

const GROUND = '#FFC531';
const BOX = '#35D6C4';
const PAD = 28;

/**
 * The hero: the animation (or the sprite) standing on its yellow ground line. A sprite sheet adds playback controls,
 * the frame strip and the frame editor; a single sprite is just the picture with zoom and guides.
 */
export function AnimationView({ asset, result }: { asset: Asset; result: SpriteResult }) {
  const { t } = useI18n();
  const still = asset.kind === 'single';
  const { sheet } = result;
  const { cell, anims, padBottom, mode, collision } = sheet;
  const centre = sheet.anchor === 'center';
  const sheetCanvas = useMemo(() => rgbaToCanvas(sheet.image), [sheet.image]);
  const pixelated = mode === 'pixel';

  const [animIdx, setAnimIdx] = useState(0);
  const animI = Math.min(animIdx, Math.max(0, anims.length - 1));
  const anim = anims[animI];
  const [playing, setPlaying] = useState(!still);
  // null = the animation's own fps (so edits in the settings show up here); set when changed in the controls.
  const [fpsOverride, setFpsOverride] = useState<number | null>(null);
  const fps = fpsOverride ?? anim?.fps ?? 8;
  // Fit about 320 px until the user picks a zoom; re-fits when the frame size changes.
  const fitZoom = Math.min(8, Math.max(1, Math.floor(320 / Math.max(cell.w, cell.h))));
  const [userZoom, setUserZoom] = useState<number | null>(null);
  const zoom = userZoom ?? fitZoom;
  const [onion, setOnion] = useState(false);
  const [guides, setGuides] = useState(true);
  const [showBox, setShowBox] = useState(false);
  const [frame, setFrame] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const strip = useRef<HTMLOListElement>(null);
  const count = anim?.count ?? 0;
  const cur = count ? frame % count : 0;
  const editor = useFrameEditor(asset, result, animI, cur);
  const duplicates = useDuplicates(asset, result);

  useEffect(() => {
    if (!playing || count < 2) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % count), 1000 / Math.max(1, fps));
    return () => clearInterval(id);
  }, [playing, fps, count]);

  // Keep the selected thumbnail in view when the strip scrolls sideways (without moving the page).
  useEffect(() => {
    const ol = strip.current;
    const li = ol?.children[cur] as HTMLElement | undefined;
    if (!ol || !li) return;
    if (li.offsetLeft < ol.scrollLeft || li.offsetLeft + li.offsetWidth > ol.scrollLeft + ol.clientWidth) {
      ol.scrollLeft = li.offsetLeft - (ol.clientWidth - li.offsetWidth) / 2;
    }
  }, [cur]);

  const footRow = cell.h - 1 - padBottom;
  const W = cell.w * zoom;
  const H = cell.h * zoom;

  useEffect(() => {
    const c = canvas.current;
    if (!c || !anim) return;
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = !pixelated;
    const draw = (i: number, alpha: number) => {
      ctx.globalAlpha = alpha;
      ctx.drawImage(sheetCanvas, i * cell.w, anim.row * cell.h, cell.w, cell.h, 0, 0, W, H);
    };
    if (onion && count > 1) {
      draw((cur + count - 1) % count, 0.3);
      draw((cur + 1) % count, 0.3);
    }
    draw(cur, 1);
    ctx.globalAlpha = 1;
    if (showBox && collision) {
      ctx.strokeStyle = BOX;
      ctx.lineWidth = 2;
      ctx.strokeRect(collision.x * zoom + 1, collision.y * zoom + 1, collision.w * zoom - 2, collision.h * zoom - 2);
    }
    if (guides) {
      // Origin cross: where the engine puts the sprite's position (centre of the feet, or of the cell for effects).
      const x = centre ? Math.round((cell.w / 2) * zoom) + 0.5 : Math.round((Math.floor(cell.w / 2) + 0.5) * zoom) + 0.5;
      const y = centre ? Math.round((cell.h / 2) * zoom) + 0.5 : Math.round((footRow + 0.5) * zoom) + 0.5;
      ctx.strokeStyle = GROUND;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 8, y);
      ctx.lineTo(x + 8, y);
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x, y + 8);
      ctx.stroke();
    }
  }, [sheetCanvas, anim, cell.w, cell.h, footRow, pixelated, zoom, onion, guides, centre, showBox, collision, cur, count, W, H]);

  const step = (d: number) => {
    setPlaying(false);
    setFrame((f) => (count ? (((f % count) + d + count) % count) : 0));
  };
  // Editing pauses playback and keeps the cursor on the frame that was acted on.
  const after = (to: number | null) => {
    if (to === null) return;
    setPlaying(false);
    setFrame(to);
  };
  const onKey = (e: KeyboardEvent) => {
    if (still) return;
    const tag = e.target instanceof HTMLElement ? e.target.tagName : '';
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(tag) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === ' ') {
      if (tag === 'BUTTON') return;
      e.preventDefault();
      setPlaying((p) => !p);
    } else if (e.shiftKey && e.key.startsWith('Arrow')) {
      e.preventDefault();
      setPlaying(false);
      editor.push(e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0, e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      step(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      step(1);
    } else if (e.key === '[' || e.key === ']') {
      e.preventDefault();
      after(editor.move(e.key === '[' ? -1 : 1));
    } else if (e.key.toLowerCase() === 'd') {
      e.preventDefault();
      after(editor.duplicate());
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      after(editor.remove());
    } else if (e.key === '0') {
      e.preventDefault();
      editor.resetPush();
    }
  };

  if (!anim) return null;
  const groundTop = PAD + (footRow + 0.5) * zoom;
  const dupFrames = new Set(duplicates.notes.flatMap((n) => n.dups));
  const multi = duplicates.notes.length > 1;
  return (
    <div className="anim" onKeyDown={onKey}>
      {!still && anims.length > 1 && (
        <div className="anim-tabs" role="group" aria-label={t('anim.pick')}>
          {anims.map((a, i) => (
            <button key={a.name + a.row} type="button" className={cx('chip', i === animI && 'is-on')} aria-pressed={i === animI} onClick={() => { setAnimIdx(i); setFpsOverride(null); setFrame(0); }}>
              {a.name}
            </button>
          ))}
        </div>
      )}
      <div className="stage-body anim-stage" tabIndex={0} role="group" aria-label={still ? t('anim.spriteLabel') : t('anim.stageLabel')}>
        <div className="anim-inner" style={{ height: H + PAD * 2, minWidth: W + PAD * 2 }}>
          {guides && !centre && <div className="ground" style={{ top: groundTop }} aria-hidden="true" />}
          {guides && <div className="cellbox" style={{ top: PAD, width: W, height: H }} aria-hidden="true" />}
          <canvas ref={canvas} className="anim-canvas" style={{ top: PAD }} role="img" aria-label={still ? t('anim.spriteCanvas') : t('anim.canvasLabel')} />
        </div>
        {!still && <div className="counter" aria-hidden="true">{cur + 1}<span>/{count}</span></div>}
      </div>
      <div className="controls">
        {!still && (
          <>
            <button type="button" className="btn btn-primary play" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
              {playing ? t('anim.pause') : t('anim.play')}
            </button>
            <label className="field field-inline">
              <span className="field-label">{t('anim.fps')}</span>
              <NumberInput value={fps} min={1} max={60} onChange={setFpsOverride} className="num-sm" />
            </label>
          </>
        )}
        <label className="field field-inline">
          <span className="field-label">{t('anim.zoom')}</span>
          <select value={zoom} onChange={(e) => setUserZoom(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((z) => (
              <option key={z} value={z}>{z}×</option>
            ))}
          </select>
        </label>
        {!still && <Check checked={onion} onChange={setOnion} label={t('anim.onion')} />}
        <Check checked={guides} onChange={setGuides} label={centre ? t('anim.guidesCenter') : t('anim.guides')} />
        {collision && <Check checked={showBox} onChange={setShowBox} label={t('anim.collision')} />}
        {!still && <span className="keys-hint">{t('anim.keys')}</span>}
      </div>
      {!still && (
        <>
          <ol className="strip" ref={strip} aria-label={t('anim.strip')}>
            {Array.from({ length: count }, (_, i) => {
              const n = editor.list[i] ?? i;
              return (
                <li key={i}>
                  <button
                    type="button"
                    className={cx('strip-btn', i === cur && 'is-on', dupFrames.has(n) && 'is-dup')}
                    aria-label={t('anim.frame', { n })}
                    aria-current={i === cur}
                    title={dupFrames.has(n) ? t('dup.thumb') : undefined}
                    onClick={() => { setPlaying(false); setFrame(i); }}
                  >
                    <FrameThumb sheet={sheetCanvas} cell={cell} row={anim.row} index={i} pixelated={pixelated} />
                    <span className="strip-n" aria-hidden="true">{n}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          {duplicates.notes.length > 0 && (
            <div className="notice" role="status">
              <span>
                {duplicates.notes.map((n, i) => (
                  <span key={n.draftId} className="dup-line">
                    {i > 0 && ' '}
                    {multi && `${n.animName}: `}
                    {t(n.dups.length > 1 ? 'dup.notice' : 'dup.noticeOne', { dups: rangesText(n.dups), originals: rangesText(n.originals) })}
                  </span>
                ))}
              </span>
              <button type="button" className="btn btn-sm" onClick={duplicates.removeAll}>{t('dup.remove')}</button>
            </div>
          )}
          <FrameEditor
            editor={editor}
            pos={cur}
            count={count}
            onMove={(d) => after(editor.move(d))}
            onDuplicate={() => after(editor.duplicate())}
            onRemove={() => after(editor.remove())}
          />
        </>
      )}
    </div>
  );
}
