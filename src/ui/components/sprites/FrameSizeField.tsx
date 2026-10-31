import { useEffect, useMemo } from 'react';
import { suggestCell } from '../../../core/pack/index.ts';
import type { RGBAImage } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { useApp } from '../../state/context.ts';
import { Field, NumberInput, Segmented, Slider } from '../common/Field.tsx';

const STEP = 8;
const MAX = 512;
const TICKS = Array.from({ length: MAX / 32 }, (_, i) => (i + 1) * 32);
const NO_PIXELS: RGBAImage = { width: 0, height: 0, data: new Uint8ClampedArray(0) };
const up = (n: number) => Math.ceil(n / STEP) * STEP;

/** Frame size: automatic, or sliders for width and height (never below what fits), plus the space under the feet. */
export function FrameSizeField() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const g = state.global;
  const patch = (p: Partial<typeof g>) => dispatch({ type: 'global/patch', patch: p });
  const results = Object.values(state.run.results);

  // The smallest frame (steps of 8) where every frame of every image fits.
  const fit = useMemo(() => {
    let w = STEP, h = STEP;
    for (const r of results) {
      // Centred sprites need their bbox on each side of the centre; the others their feet and anchor column.
      const centred = r.sheet.anchor === 'center';
      const ms = centred
        ? r.diag.metrics.map((m) => ({ ...m, bbox: { x: -Math.floor(m.bbox.w / 2), y: -Math.floor(m.bbox.h / 2), w: m.bbox.w, h: m.bbox.h } }))
        : r.diag.metrics;
      const c = suggestCell(r.diag.metrics.map(() => NO_PIXELS), ms, g.padBottom, STEP, centred ? 'center' : 'feet');
      w = Math.max(w, c.w);
      h = Math.max(h, c.h);
    }
    return { w: Math.min(MAX, up(w)), h: Math.min(MAX, up(h)) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.run.results, g.padBottom]);

  // A custom frame never goes below what fits (the sprite size may have grown since it was set).
  const tooSmall = !g.cellAuto && results.length > 0 && (g.cellW < fit.w || g.cellH < fit.h);
  useEffect(() => {
    if (tooSmall) dispatch({ type: 'global/patch', patch: { cellW: Math.max(g.cellW, fit.w), cellH: Math.max(g.cellH, fit.h) } });
  }, [tooSmall, g.cellW, g.cellH, fit.w, fit.h, dispatch]);

  const current = results[0]?.sheet.cell;
  return (
    <div className="sub">
      <Segmented<'auto' | 'custom'>
        name="frame-size"
        label={t('frame.size')}
        value={g.cellAuto ? 'auto' : 'custom'}
        onChange={(v) => patch(v === 'auto' ? { cellAuto: true } : { cellAuto: false, ...(current ? { cellW: current.w, cellH: current.h } : {}) })}
        options={[
          { value: 'auto', label: t('frame.auto') },
          { value: 'custom', label: t('frame.custom') },
        ]}
      />
      {g.cellAuto ? (
        <p className="hint">{current ? t('frame.autoNow', { w: current.w, h: current.h }) : null} {t('frame.autoHint')}</p>
      ) : (
        <>
          <Slider label={t('frame.width')} value={g.cellW} min={fit.w} max={MAX} step={STEP} ticks={TICKS} onChange={(cellW) => patch({ cellW })} />
          <Slider label={t('frame.height')} value={g.cellH} min={fit.h} max={MAX} step={STEP} ticks={TICKS} onChange={(cellH) => patch({ cellH })} />
          <Field label={t('frame.padBottom')} hint={t('frame.padBottomHint')}>
            <NumberInput value={g.padBottom} min={0} max={256} onChange={(padBottom) => patch({ padBottom })} className="num-sm" />
          </Field>
          <p className="hint">{t('frame.customHint', { w: fit.w, h: fit.h })}</p>
        </>
      )}
    </div>
  );
}
