import { useI18n } from '../../../i18n/index.ts';
import { useApp } from '../../state/context.ts';
import type { PromptKind } from '../../state/types.ts';
import { Segmented } from '../common/Field.tsx';
import { SpritePromptForm } from './SpritePromptForm.tsx';
import { TilePromptForm } from './TilePromptForm.tsx';

/** "Generate with AI": prompt builder for chat image models (sprite sheets and seamless textures). */
export function PromptsTab() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  return (
    <div className="prompts">
      <section className="step">
        <header className="step-head">
          <h2>{t('prompt.title')}</h2>
        </header>
        <div className="step-body">
          <ol className="howto">
            <li>{t('prompt.how1')}</li>
            <li>{t('prompt.how2')}</li>
            <li>{t('prompt.how3')}</li>
            <li>{t('prompt.how4')}</li>
          </ol>
          <Segmented<PromptKind>
            name="prompt-kind"
            label={t('prompt.title')}
            value={state.promptKind}
            onChange={(kind) => dispatch({ type: 'promptKind', kind })}
            options={[
              { value: 'sprite', label: t('prompt.kind.sprite') },
              { value: 'tile', label: t('prompt.kind.tile') },
            ]}
          />
          {state.promptKind === 'sprite' ? <SpritePromptForm /> : <TilePromptForm />}
        </div>
      </section>
    </div>
  );
}
