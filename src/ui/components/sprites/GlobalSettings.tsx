import { useI18n } from '../../../i18n/index.ts';
import { useApp } from '../../state/context.ts';
import type { AnchorXMethod, ArtMode } from '../../../core/types.ts';
import { Check, Field, Group, NumberInput, Segmented } from '../common/Field.tsx';
import { CellSizeField } from './CellSizeField.tsx';

const ANCHORS: AnchorXMethod[] = ['medianColumn', 'centroid', 'bboxCenter'];

/** Settings shared by the whole batch (this is what keeps every character at the same scale and cell). */
export function GlobalSettings() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const g = state.global;
  const patch = (p: Partial<typeof g>) => dispatch({ type: 'global/patch', patch: p });
  return (
    <div className="settings-block">
      <h3>{t('settings.global')} <span className="badge">{t('settings.globalBadge')}</span></h3>
      <p className="hint">{t('settings.globalHint')}</p>

      <Group legend={t('settings.mode')}>
        <Segmented<ArtMode>
          name="mode"
          label={t('settings.mode')}
          value={g.mode}
          onChange={(mode) => patch({ mode })}
          options={[
            { value: 'pixel', label: t('settings.mode.pixel') },
            { value: 'cartoon', label: t('settings.mode.cartoon') },
          ]}
        />
        <small className="hint">{g.mode === 'pixel' ? t('settings.mode.pixelHint') : t('settings.mode.cartoonHint')}</small>
      </Group>

      <Group legend={t('settings.cell')} hint={t('settings.cellHint')}>
        <Check checked={g.cellAuto} onChange={(cellAuto) => patch({ cellAuto })} label={t('settings.cellAuto')} />
        {!g.cellAuto && (
          <>
            <CellSizeField label={t('settings.cellW')} value={g.cellW} onChange={(cellW) => patch({ cellW })} />
            <CellSizeField label={t('settings.cellH')} value={g.cellH} onChange={(cellH) => patch({ cellH })} />
          </>
        )}
        <Field label={t('settings.padBottom')} hint={g.cellAuto ? t('settings.padBottomAuto') : t('settings.padBottomHint')}>
          <NumberInput value={g.padBottom} min={0} max={256} disabled={g.cellAuto} onChange={(padBottom) => patch({ padBottom })} />
        </Field>
      </Group>

      <Group legend={t('settings.height')} hint={t('settings.heightHint')}>
        <Check checked={g.targetHeight !== null} onChange={(on) => patch({ targetHeight: on ? 64 : null })} label={t('settings.heightOn')} />
        {g.targetHeight !== null && (
          <Field label={t('settings.heightPx')}>
            <NumberInput value={g.targetHeight} min={4} max={1024} onChange={(targetHeight) => patch({ targetHeight })} />
          </Field>
        )}
        {g.targetHeight === null && state.assets.length > 1 && <p className="alert alert-soft">{t('settings.heightBatchWarn')}</p>}
      </Group>

      {g.mode === 'pixel' && (
        <Field label={t('settings.colors')} hint={t('settings.colorsHint')}>
          <NumberInput value={g.maxColors} min={0} max={256} onChange={(maxColors) => patch({ maxColors })} />
        </Field>
      )}

      <details className="advanced">
        <summary>{t('settings.advanced')}</summary>
        <Field label={t('settings.anchor')} hint={t('settings.anchorHint')}>
          <select value={g.anchorX} onChange={(e) => patch({ anchorX: e.target.value as AnchorXMethod })}>
            {ANCHORS.map((a) => (
              <option key={a} value={a}>{t(`settings.anchor.${a}`)}</option>
            ))}
          </select>
        </Field>
      </details>
    </div>
  );
}
