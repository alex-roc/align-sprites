import { useI18n } from '../../../i18n/index.ts';
import { useApp } from '../../state/context.ts';
import type { TileKind } from '../../state/types.ts';
import { Segmented } from '../common/Field.tsx';
import { ItemsPanel } from './ItemsPanel.tsx';
import { ParallaxPanel } from './ParallaxPanel.tsx';
import { TerrainPanel } from './TerrainPanel.tsx';
import { TileSheetPanel } from './TileSheetPanel.tsx';

/** Tiles: normalize an AI tile atlas, or compose terrain transition tiles from two textures. */
export function TilesTab() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  return (
    <div className="tiles">
      <div className="subnav">
        <Segmented<TileKind>
          name="tile-kind"
          label={t('nav.tiles')}
          value={state.tiles.kind}
          onChange={(kind) => dispatch({ type: 'tiles/kind', kind })}
          options={[
            { value: 'sheet', label: t('tiles.kind.sheet') },
            { value: 'terrain', label: t('tiles.kind.terrain') },
            { value: 'items', label: t('tiles.kind.items') },
            { value: 'parallax', label: t('tiles.kind.parallax') },
          ]}
        />
        <p className="hint">{t(`tiles.kind.${state.tiles.kind}Hint`)}</p>
      </div>
      {state.tiles.kind === 'sheet' ? <TileSheetPanel /> : state.tiles.kind === 'items' ? <ItemsPanel /> : state.tiles.kind === 'parallax' ? <ParallaxPanel /> : <TerrainPanel />}
    </div>
  );
}
