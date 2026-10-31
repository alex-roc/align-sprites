import { useI18n } from '../../../i18n/index.ts';
import { useApp } from '../../state/context.ts';
import type { TileKind } from '../../state/types.ts';
import { Segmented } from '../common/Field.tsx';
import { TerrainPanel } from './TerrainPanel.tsx';
import { TileSheetPanel } from './TileSheetPanel.tsx';

/** Tiles tab: normalize an AI tile atlas, or compose terrain transition tiles from two textures. */
export function TilesTab() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  return (
    <div className="tiles">
      <div className="tiles-head">
        <Segmented<TileKind>
          name="tile-kind"
          label={t('tabs.tiles')}
          value={state.tiles.kind}
          onChange={(kind) => dispatch({ type: 'tiles/kind', kind })}
          options={[
            { value: 'sheet', label: t('tiles.kind.sheet') },
            { value: 'terrain', label: t('tiles.kind.terrain') },
          ]}
        />
        <p className="hint">{t(state.tiles.kind === 'sheet' ? 'tiles.kind.sheetHint' : 'tiles.kind.terrainHint')}</p>
      </div>
      {state.tiles.kind === 'sheet' ? <TileSheetPanel /> : <TerrainPanel />}
    </div>
  );
}
