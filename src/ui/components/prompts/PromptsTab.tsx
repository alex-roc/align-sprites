import { useI18n } from '../../../i18n/index.ts';
import { useApp } from '../../state/context.ts';
import type { PromptKind } from '../../state/types.ts';
import { Segmented } from '../common/Field.tsx';
import {
  AtlasPromptPanel,
  DirectionsPromptPanel,
  EffectsPromptPanel,
  ItemsPromptPanel,
  ParallaxPromptPanel,
  VideoPromptPanel,
} from './AssetPromptPanels.tsx';
import { SpritePromptPanel } from './SpritePromptForm.tsx';
import { TilePromptPanel } from './TilePromptForm.tsx';

/** The prompt kinds, grouped by the tab their result goes to (same names as the tabs). */
const GROUPS: { id: 'sprites' | 'world' | 'items'; kinds: PromptKind[] }[] = [
  { id: 'sprites', kinds: ['sprite', 'directions', 'effects', 'video'] },
  { id: 'world', kinds: ['tile', 'atlas', 'parallax'] },
  { id: 'items', kinds: ['items'] },
];

/** Make with AI: build the prompt and the guide image for Gemini / ChatGPT (or a video model), then bring the result back. */
export function PromptsTab() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const kind = state.promptKind;
  return (
    <div className="workbench-page">
      <div className="subnav">
        <div className="kind-groups">
          {GROUPS.map((g) => (
            <div key={g.id} className="kind-group">
              <span className="kind-group-title">{t(`nav.${g.id}`)}</span>
              <Segmented<PromptKind>
                name="prompt-kind"
                label={t(`nav.${g.id}`)}
                value={kind}
                onChange={(k) => dispatch({ type: 'promptKind', kind: k })}
                options={g.kinds.map((k) => ({ value: k, label: t(`prompt.kind.${k}`) }))}
              />
            </div>
          ))}
        </div>
        <p className="hint">{t(kind === 'sprite' || kind === 'tile' ? 'prompt.intro' : `prompt.intro.${kind}`)}</p>
      </div>
      {kind === 'sprite' && <SpritePromptPanel />}
      {kind === 'tile' && <TilePromptPanel />}
      {kind === 'atlas' && <AtlasPromptPanel />}
      {kind === 'directions' && <DirectionsPromptPanel />}
      {kind === 'effects' && <EffectsPromptPanel />}
      {kind === 'items' && <ItemsPromptPanel />}
      {kind === 'parallax' && <ParallaxPromptPanel />}
      {kind === 'video' && <VideoPromptPanel />}
    </div>
  );
}
