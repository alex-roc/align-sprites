import type { ReactNode } from 'react';
import type { AssetPromptForm, AssetPromptKind } from '../../../core/prompts/assets.ts';
import type { KeyColor } from '../../../core/prompts/index.ts';
import type { ArtMode, RGBAImage } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { downloadBlob, rgbaToPngBlob } from '../../lib/image.ts';
import { hrefFor, type TabId } from '../../route.ts';
import { useApp } from '../../state/context.ts';
import type { Action } from '../../state/types.ts';
import { Field, NumberInput, Segmented } from '../common/Field.tsx';
import { RgbaCanvas } from '../common/RgbaCanvas.tsx';
import { Section } from '../common/Section.tsx';
import { CopyBox } from './CopyBox.tsx';
import { FlowStep } from './Flow.tsx';

export const GUIDE_CELL = 256;

export interface Built<T> {
  value: T | null;
  error: string | null;
}

export function tryRun<T>(fn: () => T): Built<T> {
  try {
    return { value: fn(), error: null };
  } catch (e) {
    return { value: null, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Form state of one prompt kind, the language chosen in the shared selector, and a patch helper. */
export function useAssetForm<K extends AssetPromptKind>(kind: K) {
  const { state, dispatch } = useApp();
  const { lang } = useI18n();
  const p = state.assetPrompts[kind] as AssetPromptForm<K>;
  const patch = (x: Partial<AssetPromptForm<K>>) => dispatch({ type: 'assetPrompt/patch', kind, patch: x } as Action);
  const promptLang = state.prompt.promptLang === 'ui' ? lang : state.prompt.promptLang;
  return { p, patch, promptLang };
}

/** Pixel or cartoon, plus the size field that only matters in pixel mode. */
export function StyleSection({ name, mode, onMode, size }: {
  name: string;
  mode: ArtMode;
  onMode: (m: ArtMode) => void;
  size?: { label: string; hint: string; value: number; min: number; max: number; onChange: (n: number) => void };
}) {
  const { t } = useI18n();
  return (
    <Section title={t('set.style')}>
      <Segmented<ArtMode>
        name={name}
        label={t('set.style')}
        value={mode}
        onChange={onMode}
        options={[
          { value: 'pixel', label: t('mode.pixel') },
          { value: 'cartoon', label: t('mode.cartoon') },
        ]}
      />
      {mode === 'pixel' && size && (
        <Field label={size.label} hint={size.hint}>
          <NumberInput value={size.value} min={size.min} max={size.max} onChange={size.onChange} />
        </Field>
      )}
    </Section>
  );
}

export function KeyField({ value, onChange }: { value: KeyColor; onChange: (k: KeyColor) => void }) {
  const { t } = useI18n();
  return (
    <Field label={t('prompt.key')} hint={t('prompt.keyHint')}>
      <select value={value} onChange={(e) => onChange(e.target.value as KeyColor)}>
        <option value="magenta">{t('prompt.key.magenta')}</option>
        <option value="green">{t('prompt.key.green')}</option>
      </select>
    </Field>
  );
}

/** Prompt language: one selector for every prompt kind (it lives in the sprite form's state). */
export function LangSection() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  return (
    <Section title={t('prompt.lang')}>
      <select
        value={state.prompt.promptLang}
        aria-label={t('prompt.lang')}
        onChange={(e) => dispatch({ type: 'prompt/patch', patch: { promptLang: e.target.value as typeof state.prompt.promptLang } })}
      >
        <option value="ui">{t('prompt.lang.ui')}</option>
        <option value="en">English</option>
        <option value="es">Español</option>
      </select>
    </Section>
  );
}

interface ShellProps {
  /** Sections of the settings column (the language selector goes last). */
  settings: ReactNode;
  prompt: Built<string>;
  /** Guide image to attach, if the kind has one. */
  guide?: { image: Built<RGBAImage>; file: string; hint: string };
  /** What to do in the chat or video tool. */
  chat: string;
  /** Title of that step. Default: paste both (prompt and guide) in Gemini or ChatGPT. */
  chatTitle?: string;
  /** Where the result goes: text, tab and button label. */
  next: { text: string; tab: TabId; label: string };
}

/** Settings column + numbered flow shared by the new prompt kinds: prompt, guide image, chat, bring the result back. */
export function PromptShell({ settings, prompt, guide, chat, chatTitle, next }: ShellProps) {
  const { t } = useI18n();
  const image = guide?.image.value ?? null;
  const download = async () => {
    if (image && guide) downloadBlob(await rgbaToPngBlob(image), guide.file);
  };
  const n = guide ? 3 : 2;
  return (
    <div className="workbench">
      <aside className="settings" aria-label={t('set.label')}>
        <div className="settings-in">{settings}</div>
      </aside>
      <ol className="flow">
        <FlowStep n={1} title={t('prompt.step.copy')}>
          {prompt.error ? <p className="alert" role="alert">{t('error.promptUnavailable', { message: prompt.error })}</p> : <CopyBox text={prompt.value ?? ''} label={t('prompt.output')} />}
        </FlowStep>
        {guide && (
          <FlowStep n={2} title={t('prompt.step.guide')}>
            <p className="hint">{guide.hint}</p>
            {image ? (
              <RgbaCanvas image={image} className="guide-canvas" label={t('prompt.guide')} />
            ) : (
              guide.image.error && <p className="alert" role="alert">{t('error.promptUnavailable', { message: guide.image.error })}</p>
            )}
            <div className="row wrap">
              <button type="button" className="btn btn-primary" disabled={!image} onClick={() => void download()}>{t('prompt.downloadGuide')}</button>
            </div>
          </FlowStep>
        )}
        <FlowStep n={n} title={chatTitle ?? t(guide ? 'prompt.step.chat' : 'prompt.step.chatOne')}>
          <p>{chat}</p>
        </FlowStep>
        <FlowStep n={n + 1} title={t('prompt.step.next')}>
          <p>{next.text}</p>
          <div className="row wrap">
            <a className="btn btn-primary" href={hrefFor(next.tab)}>{next.label}</a>
            <a className="link" href={hrefFor('guide', 'generate')}>{t('export.fullGuide')}</a>
          </div>
        </FlowStep>
      </ol>
    </div>
  );
}
