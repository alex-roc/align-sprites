import { useI18n } from '../../../i18n/index.ts';
import { parseFrames } from '../../lib/frames.ts';
import { newId } from '../../state/defaults.ts';
import type { AnimDraft } from '../../state/types.ts';
import { Check, NumberInput } from '../common/Field.tsx';

/** Editable animation list: name, frame range ("0-5", "0,2,4-6", blank = all), fps, loop. */
export function AnimationsEditor({ anims, frameCount, onChange }: { anims: AnimDraft[]; frameCount?: number; onChange: (a: AnimDraft[]) => void }) {
  const { t } = useI18n();
  const update = (id: string, patch: Partial<AnimDraft>) => onChange(anims.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const add = () => onChange([...anims, { id: newId('a'), name: `anim${anims.length + 1}`, frames: '', fps: 8, loop: true }]);
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
              <label className="field field-narrow">
                <span className="field-label">{t('anims.fps')}</span>
                <NumberInput value={a.fps} min={1} max={60} onChange={(fps) => update(a.id, { fps })} />
              </label>
              <Check checked={a.loop} onChange={(loop) => update(a.id, { loop })} label={t('anims.loop')} />
              <button type="button" className="btn btn-ghost" disabled={anims.length === 1} onClick={() => onChange(anims.filter((x) => x.id !== a.id))} aria-label={`${t('anims.remove')} ${a.name}`}>
                {t('anims.remove')}
              </button>
              {!ok && <small className="alert-text">{t('anims.invalid')}</small>}
            </li>
          );
        })}
      </ul>
      <button type="button" className="btn" onClick={add}>{t('anims.add')}</button>
      <small className="hint">{t('anims.help')}</small>
    </div>
  );
}
