import { useI18n } from '../../../i18n/index.ts';
import { mirrorDraft, rowAnimations } from '../../lib/frameOps.ts';
import { parseFrames } from '../../lib/frames.ts';
import { DEFAULT_FPS, newId } from '../../state/defaults.ts';
import type { AnimDraft } from '../../state/types.ts';
import { Check, NumberInput } from '../common/Field.tsx';

/** Editable animation list: name, frame range ("0-5", "0,2,4-6", blank = all), fps, loop, mirror (flipX). */
export function AnimationsEditor({ anims, frameCount, rows, onChange }: { anims: AnimDraft[]; frameCount?: number; rows?: number[]; onChange: (a: AnimDraft[]) => void }) {
  const { t } = useI18n();
  const update = (id: string, patch: Partial<AnimDraft>) => onChange(anims.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const add = () => onChange([...anims, { id: newId('a'), name: `anim${anims.length + 1}`, frames: '', fps: DEFAULT_FPS, loop: true, flipX: false }]);
  // The mirrored copy goes right after its source.
  const mirror = (a: AnimDraft) => {
    const copy = mirrorDraft(a, newId('a'), anims.map((x) => x.name));
    const at = anims.findIndex((x) => x.id === a.id);
    onChange([...anims.slice(0, at + 1), copy, ...anims.slice(at + 1)]);
  };
  // Sheets with one animation per row (top-down walk cycles in 4 or 3 rows): one click names them all.
  const perRow = () => {
    const next = rows ? rowAnimations(rows, DEFAULT_FPS, () => newId('a')) : null;
    if (next) onChange(next);
  };
  const splittable = !!rows && new Set(rows).size > 1;
  return (
    <div className="anims">
      {frameCount !== undefined && frameCount > 0 && <p className="hint">{t('anims.detected', { count: frameCount, last: frameCount - 1 })}</p>}
      <ul>
        {anims.map((a) => {
          const ok = parseFrames(a.frames).ok;
          return (
            <li key={a.id} className="anim-row">
              <label className="field">
                <span className="field-label">{t('anims.name')}</span>
                <input type="text" value={a.name} onChange={(e) => update(a.id, { name: e.target.value })} />
              </label>
              <label className="field">
                <span className="field-label">{t('anims.frames')}</span>
                <input type="text" value={a.frames} placeholder={t('anims.framesAll')} aria-invalid={!ok} onChange={(e) => update(a.id, { frames: e.target.value })} />
              </label>
              <label className="field">
                <span className="field-label">{t('anims.fps')}</span>
                <NumberInput value={a.fps} min={1} max={60} onChange={(fps) => update(a.id, { fps })} />
              </label>
              <div className="anim-actions">
                <Check checked={a.loop} onChange={(loop) => update(a.id, { loop })} label={t('anims.loop')} />
                <Check checked={a.flipX} onChange={(flipX) => update(a.id, { flipX })} label={t('anims.flip')} />
              </div>
              <div className="anim-actions">
                <button type="button" className="btn btn-sm" onClick={() => mirror(a)} aria-label={t('anims.mirrorNamed', { name: a.name })}>
                  {t('anims.mirror')}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" disabled={anims.length === 1} onClick={() => onChange(anims.filter((x) => x.id !== a.id))} aria-label={t('anims.removeNamed', { name: a.name })}>
                  {t('anims.remove')}
                </button>
              </div>
              {!ok && <small className="alert-text">{t('anims.invalid')}</small>}
            </li>
          );
        })}
      </ul>
      <div className="anim-actions">
        <button type="button" className="btn btn-sm" onClick={add}>{t('anims.add')}</button>
        {splittable && <button type="button" className="btn btn-sm" onClick={perRow}>{t('anims.perRow')}</button>}
      </div>
      <small className="hint">{t('anims.help')}</small>
      {splittable && <small className="hint">{t('anims.perRowHint', { rows: new Set(rows).size })}</small>}
    </div>
  );
}
