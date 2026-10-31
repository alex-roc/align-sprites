import { useI18n } from '../../../i18n/index.ts';
import { useApp } from '../../state/context.ts';
import { Step } from '../common/Step.tsx';
import { AssetChips } from './AssetChips.tsx';
import { AssetSettings } from './AssetSettings.tsx';
import { GlobalSettings } from './GlobalSettings.tsx';

export function SettingsStep() {
  const { t } = useI18n();
  const { state } = useApp();
  const asset = state.assets.find((a) => a.id === state.selectedId);
  return (
    <Step n={2} title={t('step.settings')} muted={!asset}>
      {asset ? (
        <>
          <GlobalSettings />
          <AssetChips />
          <AssetSettings asset={asset} key={asset.id} />
        </>
      ) : (
        <p className="muted">{t('step.needImage')}</p>
      )}
    </Step>
  );
}
