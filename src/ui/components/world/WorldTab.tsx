import { useI18n } from '../../../i18n/index.ts';
import { navigate, worldTool, WORLD_TOOLS, type WorldTool } from '../../route.ts';
import { Segmented } from '../common/Field.tsx';
import { ParallaxPanel } from './ParallaxPanel.tsx';
import { TerrainPanel } from './TerrainPanel.tsx';
import { TileSheetPanel } from './TileSheetPanel.tsx';

/** World: what the level is built from. The open tool lives in the route (`#/world/<tool>`), so it can be linked. */
export function WorldTab({ section }: { section?: string }) {
  const { t } = useI18n();
  const tool = worldTool(section);
  return (
    <div className="world">
      <div className="subnav">
        <Segmented<WorldTool>
          name="world-tool"
          label={t('nav.world')}
          value={tool}
          onChange={(next) => navigate('world', next)}
          options={WORLD_TOOLS.map((value) => ({ value, label: t(`world.tool.${value}`) }))}
        />
        <p className="hint">{t(`world.tool.${tool}Hint`)}</p>
      </div>
      {tool === 'sheet' && <TileSheetPanel />}
      {tool === 'terrain' && <TerrainPanel />}
      {tool === 'parallax' && <ParallaxPanel />}
    </div>
  );
}
