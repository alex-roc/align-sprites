import { useMemo } from 'react';
import { buildSpritePrompt, makeGuideImage, type KeyColor, type PromptOptions } from '../../../core/prompts/index.ts';
import type { ArtMode } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { downloadBlob, rgbaToPngBlob } from '../../lib/image.ts';
import { useApp } from '../../state/context.ts';
import { Check, Field, NumberInput, Segmented } from '../common/Field.tsx';
import { RgbaCanvas } from '../common/RgbaCanvas.tsx';
import { CopyBox } from './CopyBox.tsx';

const VIEWS: PromptOptions['view'][] = ['side', 'top-down', 'front', 'three-quarter'];
const GUIDE_CELL = 256;

function tryRun<T>(fn: () => T): { value: T | null; error: string | null } {
  try {
    return { value: fn(), error: null };
  } catch (e) {
    return { value: null, error: e instanceof Error ? e.message : String(e) };
  }
}

export function SpritePromptForm() {
  const { t, lang } = useI18n();
  const { state, dispatch } = useApp();
  const p = state.prompt;
  const patch = (x: Partial<typeof p>) => dispatch({ type: 'prompt/patch', patch: x });
  const rows = Math.max(1, Math.ceil(p.frames / Math.max(1, p.cols)));
  const promptLang = p.promptLang === 'ui' ? lang : p.promptLang;

  const prompt = useMemo(
    () => tryRun(() => buildSpritePrompt({ ...p, lang: promptLang, subject: p.subject.trim() || t('prompt.subjectFallback') })),
    [p, promptLang, t],
  );
  const guide = useMemo(
    () => tryRun(() => makeGuideImage({ cols: p.cols, rows, cell: GUIDE_CELL, key: p.key, baseline: 0.9 })),
    [p.cols, rows, p.key],
  );

  const downloadGuide = async () => {
    if (guide.value) downloadBlob(await rgbaToPngBlob(guide.value), `guide-${p.cols}x${rows}-${p.key}.png`);
  };

  return (
    <div className="prompt-grid">
      <div className="settings-block">
        <Field label={t('prompt.subject')} hint={t('prompt.subjectHint')}>
          <input type="text" value={p.subject} placeholder={t('prompt.subjectPlaceholder')} onChange={(e) => patch({ subject: e.target.value })} />
        </Field>
        <Field label={t('prompt.action')} hint={t('prompt.actionHint')}>
          <input type="text" value={p.action} onChange={(e) => patch({ action: e.target.value })} />
        </Field>
        <div className="row">
          <Field label={t('prompt.frames')}>
            <NumberInput value={p.frames} min={1} max={64} onChange={(frames) => patch({ frames })} />
          </Field>
          <Field label={t('prompt.cols')}>
            <NumberInput value={p.cols} min={1} max={16} onChange={(cols) => patch({ cols })} />
          </Field>
        </div>
        <Segmented<ArtMode>
          name="prompt-mode"
          label={t('settings.mode')}
          value={p.mode}
          onChange={(mode) => patch({ mode })}
          options={[
            { value: 'pixel', label: t('settings.mode.pixel') },
            { value: 'cartoon', label: t('settings.mode.cartoon') },
          ]}
        />
        {p.mode === 'pixel' && (
          <Field label={t('prompt.artHeight')} hint={t('prompt.artHeightHint')}>
            <NumberInput value={p.artHeight} min={8} max={256} onChange={(artHeight) => patch({ artHeight })} />
          </Field>
        )}
        <Field label={t('prompt.view')}>
          <select value={p.view} onChange={(e) => patch({ view: e.target.value as PromptOptions['view'] })}>
            {VIEWS.map((v) => (
              <option key={v} value={v}>{t(`prompt.view.${v}`)}</option>
            ))}
          </select>
        </Field>
        <Field label={t('prompt.key')} hint={t('prompt.keyHint')}>
          <select value={p.key} onChange={(e) => patch({ key: e.target.value as KeyColor })}>
            <option value="magenta">{t('prompt.key.magenta')}</option>
            <option value="green">{t('prompt.key.green')}</option>
          </select>
        </Field>
        <Check checked={p.withReference} onChange={(withReference) => patch({ withReference })} label={t('prompt.withReference')} />
        <Field label={t('prompt.lang')}>
          <select value={p.promptLang} onChange={(e) => patch({ promptLang: e.target.value as typeof p.promptLang })}>
            <option value="ui">{t('prompt.lang.ui')}</option>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </Field>
      </div>

      <div className="prompt-out">
        {prompt.error ? (
          <p className="alert" role="alert">{t('error.promptUnavailable', { message: prompt.error })}</p>
        ) : (
          <CopyBox text={prompt.value ?? ''} label={t('prompt.output')} />
        )}
        <div className="guide-box">
          <span className="field-label">{t('prompt.guide')}</span>
          {guide.value ? (
            <RgbaCanvas image={guide.value} className="guide-canvas" label={t('prompt.guide')} />
          ) : (
            guide.error && <p className="alert" role="alert">{t('error.promptUnavailable', { message: guide.error })}</p>
          )}
          <button type="button" className="btn" disabled={!guide.value} onClick={() => void downloadGuide()}>
            {t('prompt.downloadGuide')}
          </button>
          <small className="hint">{t('prompt.guideHint', { cols: p.cols, rows })}</small>
        </div>
      </div>
    </div>
  );
}
