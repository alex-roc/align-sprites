import { useMemo } from 'react';
import { buildTilePrompt } from '../../../core/prompts/index.ts';
import type { ArtMode } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { hrefFor } from '../../route.ts';
import { useApp } from '../../state/context.ts';
import { Field, NumberInput, Segmented } from '../common/Field.tsx';
import { Section } from '../common/Section.tsx';
import { CopyBox } from './CopyBox.tsx';
import { FlowStep } from './Flow.tsx';

export function TilePromptPanel() {
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
    <div className="workbench">
      <aside className="settings" aria-label={t('set.label')}>
        <div className="settings-in">
          <Section title={t('prompt.describeTexture')}>
            <Field label={t('prompt.material')} hint={t('prompt.materialHint')}>
              <input type="text" value={p.material} placeholder={t('prompt.materialPlaceholder')} onChange={(e) => patch({ material: e.target.value })} />
            </Field>
            <Field label={t('prompt.view')}>
              <select value={p.view} onChange={(e) => patch({ view: e.target.value as typeof p.view })}>
                <option value="top-down">{t('prompt.view.top-down')}</option>
                <option value="side">{t('prompt.view.side')}</option>
              </select>
            </Field>
          </Section>
          <Section title={t('set.style')}>
            <Segmented<ArtMode>
              name="tile-mode"
              label={t('set.style')}
              value={p.mode}
              onChange={(mode) => patch({ mode })}
              options={[
                { value: 'pixel', label: t('mode.pixel') },
                { value: 'cartoon', label: t('mode.cartoon') },
              ]}
            />
            {p.mode === 'pixel' && (
              <Field label={t('prompt.tileSize')} hint={t('prompt.tileSizeHint')}>
                <NumberInput value={p.tileSize} min={8} max={256} onChange={(tileSize) => patch({ tileSize })} />
              </Field>
            )}
          </Section>
        </div>
      </aside>
      <ol className="flow">
        <FlowStep n={1} title={t('prompt.step.copy')}>
          {prompt.error ? <p className="alert" role="alert">{t('error.promptUnavailable', { message: prompt.error })}</p> : <CopyBox text={prompt.value ?? ''} label={t('prompt.output')} />}
        </FlowStep>
        <FlowStep n={2} title={t('prompt.step.chat')}>
          <p>{t('prompt.step.chatTile')}</p>
        </FlowStep>
        <FlowStep n={3} title={t('prompt.step.next')}>
          <p>{t('prompt.step.nextTile')}</p>
          <div className="row wrap">
            <a className="btn btn-primary" href={hrefFor('world', 'terrain')}>{t('prompt.openTiles')}</a>
          </div>
        </FlowStep>
      </ol>
    </div>
  );
}
