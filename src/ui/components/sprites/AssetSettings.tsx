import { useI18n } from '../../../i18n/index.ts';
import { hexToRgb, rgbToHex } from '../../lib/image.ts';
import { useApp } from '../../state/context.ts';
import type { Asset, BgStrategy, SegMode } from '../../state/types.ts';
import { Check, Field, Group, NumberInput, Segmented } from '../common/Field.tsx';
import { AnimationsEditor } from './AnimationsEditor.tsx';

/** Settings of the selected asset only: background, segmentation, animations, relative size. */
export function AssetSettings({ asset }: { asset: Asset }) {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const patch = (p: Partial<Asset>) => dispatch({ type: 'asset/patch', id: asset.id, patch: p });
  const bg = asset.bg;
  const setBg = (p: Partial<typeof bg>) => patch({ bg: { ...bg, ...p } });
  const seg = asset.seg;
  const setSeg = (p: Partial<typeof seg>) => patch({ seg: { ...seg, ...p } });
  const detected = asset.autoBg?.color;
  const shown = bg.custom ? bg.color : detected;
  const transparent = !bg.custom && detected !== undefined && detected[3] === 0;

  return (
    <div className="settings-block">
      <h3>{t('settings.perAsset', { name: asset.name })} <span className="badge badge-alt">{t('settings.assetBadge')}</span></h3>

      <Group legend={t('bg.title')}>
        <div className="row wrap">
          <span className="swatch checker" aria-hidden="true">
            {shown && !transparent && <i style={{ background: rgbToHex(shown) }} />}
          </span>
          <span className="muted">
            {transparent ? t('bg.alreadyTransparent') : shown ? `${bg.custom ? t('bg.custom') : t('bg.detected')}: ${rgbToHex(shown)}` : t('bg.unknown')}
          </span>
        </div>
        <Check checked={bg.custom} onChange={(custom) => setBg({ custom })} label={t('bg.useCustom')} />
        {bg.custom && (
          <Field label={t('bg.color')}>
            <input type="color" value={rgbToHex(bg.color)} onChange={(e) => setBg({ color: hexToRgb(e.target.value) })} />
          </Field>
        )}
        <Field label={t('bg.strategy')} hint={t(`bg.strategy.${bg.strategy}Hint`)}>
          <select value={bg.strategy} onChange={(e) => setBg({ strategy: e.target.value as BgStrategy })}>
            <option value="auto">{t('bg.strategy.auto')}</option>
            <option value="global">{t('bg.strategy.global')}</option>
            <option value="flood">{t('bg.strategy.flood')}</option>
          </select>
        </Field>
        <Field label={`${t('bg.tolerance')}: ${bg.tolerance}`} hint={t('bg.toleranceHint')}>
          <input type="range" min={0} max={60} value={bg.tolerance} onChange={(e) => setBg({ tolerance: Number(e.target.value) })} />
        </Field>
      </Group>

      {asset.kind === 'sheet' ? (
        <>
          <Group legend={t('seg.title')}>
            <Segmented<SegMode>
              name={`seg-${asset.id}`}
              label={t('seg.title')}
              value={seg.mode}
              onChange={(mode) => setSeg({ mode })}
              options={[
                { value: 'auto', label: t('seg.auto') },
                { value: 'grid', label: t('seg.grid') },
                { value: 'single', label: t('seg.single') },
              ]}
            />
            {seg.mode === 'grid' && (
              <div className="row">
                <Field label={t('seg.rows')}>
                  <NumberInput value={seg.rows} min={1} max={64} onChange={(rows) => setSeg({ rows })} />
                </Field>
                <Field label={t('seg.cols')}>
                  <NumberInput value={seg.cols} min={1} max={64} onChange={(cols) => setSeg({ cols })} />
                </Field>
              </div>
            )}
            <small className="hint">{t(`seg.${seg.mode}Hint`)}</small>
          </Group>
          <Group legend={t('anims.title')}>
            <AnimationsEditor anims={asset.anims} frameCount={state.run.frameCounts[asset.id]} onChange={(anims) => patch({ anims })} />
          </Group>
        </>
      ) : (
        <p className="hint">{t('seg.singleKindHint')}</p>
      )}

      <Field label={t('settings.relative')} hint={state.global.targetHeight === null ? t('settings.relativeNeedsHeight') : t('settings.relativeHint')}>
        <NumberInput value={asset.relative} min={0.1} max={5} step={0.05} disabled={state.global.targetHeight === null} onChange={(relative) => patch({ relative })} />
      </Field>
    </div>
  );
}
