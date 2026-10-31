import { useMemo } from 'react';
import { buildTilePrompt } from '../../../core/prompts/index.ts';
import type { ArtMode } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { useApp } from '../../state/context.ts';
import { Field, NumberInput, Segmented } from '../common/Field.tsx';
import { CopyBox } from './CopyBox.tsx';

export function TilePromptForm() {
  const { t, lang } = useI18n();
  const { state, dispatch } = useApp();
  const p = state.tilePrompt;
  const patch = (x: Partial<typeof p>) => dispatch({ type: 'tilePrompt/patch', patch: x });

  const prompt = useMemo(() => {
    try {
      return { value: buildTilePrompt({ ...p, lang, material: p.material.trim() || t('prompt.materialFallback') }), error: null };
    } catch (e) {
      return { value: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [p, lang, t]);

  return (
    <div className="prompt-grid">
      <div className="settings-block">
        <Field label={t('prompt.material')} hint={t('prompt.materialHint')}>
          <input type="text" value={p.material} placeholder={t('prompt.materialPlaceholder')} onChange={(e) => patch({ material: e.target.value })} />
        </Field>
        <Segmented<ArtMode>
          name="tile-mode"
          label={t('settings.mode')}
          value={p.mode}
          onChange={(mode) => patch({ mode })}
          options={[
            { value: 'pixel', label: t('settings.mode.pixel') },
            { value: 'cartoon', label: t('settings.mode.cartoon') },
          ]}
        />
        {p.mode === 'pixel' && (
          <Field label={t('prompt.tileSize')} hint={t('prompt.tileSizeHint')}>
            <NumberInput value={p.tileSize} min={8} max={256} onChange={(tileSize) => patch({ tileSize })} />
          </Field>
        )}
        <Field label={t('prompt.view')}>
          <select value={p.view} onChange={(e) => patch({ view: e.target.value as typeof p.view })}>
            <option value="top-down">{t('prompt.view.top-down')}</option>
            <option value="side">{t('prompt.view.side')}</option>
          </select>
        </Field>
      </div>
      <div className="prompt-out">
        {prompt.error ? <p className="alert" role="alert">{t('error.promptUnavailable', { message: prompt.error })}</p> : <CopyBox text={prompt.value ?? ''} label={t('prompt.output')} />}
      </div>
    </div>
  );
}
