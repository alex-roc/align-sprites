import { useI18n } from '../../../i18n/index.ts';
import { useApp } from '../../state/context.ts';
import type { PromptKind } from '../../state/types.ts';
import { Segmented } from '../common/Field.tsx';
import { SpritePromptPanel } from './SpritePromptForm.tsx';
import { TilePromptPanel } from './TilePromptForm.tsx';

/** Make with AI: build the prompt and the guide image for Gemini / ChatGPT, then bring the result back. */
export function PromptsTab() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  return (
    <div className="workbench-page">
      <div className="subnav">
        <Segmented<PromptKind>
          name="prompt-kind"
          label={t('nav.ai')}
          value={state.promptKind}
          onChange={(kind) => dispatch({ type: 'promptKind', kind })}
          options={[
            { value: 'sprite', label: t('prompt.kind.sprite') },
            { value: 'tile', label: t('prompt.kind.tile') },
          ]}
        />
        <p className="hint">{t('prompt.intro')}</p>
      </div>
      {state.promptKind === 'sprite' ? <SpritePromptPanel /> : <TilePromptPanel />}
    </div>
  );
}
