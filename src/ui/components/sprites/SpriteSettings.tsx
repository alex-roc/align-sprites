import { useI18n } from '../../../i18n/index.ts';
import type { AnchorXMethod, ArtMode } from '../../../core/types.ts';
import { hexToRgb, rgbToHex } from '../../lib/image.ts';
import { useApp } from '../../state/context.ts';
import type { Asset, BgStrategy, GlobalSettings, SegMode } from '../../state/types.ts';
import { Check, Field, NumberInput, Segmented } from '../common/Field.tsx';
import { Fold, Section } from '../common/Section.tsx';
import { AnimationsEditor } from './AnimationsEditor.tsx';
import { CellSizeField } from './CellSizeField.tsx';

const ANCHORS: AnchorXMethod[] = ['medianColumn', 'centroid', 'bboxCenter'];

/** Settings column, in the order you think: style, frames, size, animations, then colours, background, advanced. */
export function SpriteSettings({ asset }: { asset: Asset }) {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const g = state.global;
  const batch = state.assets.length > 1;
  const patchG = (p: Partial<GlobalSettings>) => dispatch({ type: 'global/patch', patch: p });
  const patchA = (p: Partial<Asset>) => dispatch({ type: 'asset/patch', id: asset.id, patch: p });
  const bg = asset.bg;
  const setBg = (p: Partial<typeof bg>) => patchA({ bg: { ...bg, ...p } });
  const seg = asset.seg;
  const setSeg = (p: Partial<typeof seg>) => patchA({ seg: { ...seg, ...p } });

  const detected = asset.autoBg?.color;
  const shown = bg.custom ? bg.color : detected;
  const transparent = !bg.custom && detected !== undefined && detected[3] === 0;
  const autoWorked = !bg.custom && bg.strategy === 'auto' && detected !== undefined;
  const bgSwatch = (
    <span className="bg-summary">
      <span className="swatch checker" aria-hidden="true">{shown && !transparent && <i style={{ background: rgbToHex(shown) }} />}</span>
      {autoWorked ? (transparent ? t('bg.transparentOk') : t('bg.autoOk', { color: rgbToHex(shown ?? [0, 0, 0]) })) : bg.custom ? rgbToHex(bg.color) : t(`bg.strategy.${bg.strategy}`)}
    </span>
  );

  return (
    <div className="settings-in">
      <Section title={t('set.style')} scope="all" showScope={batch}>
        <Segmented<ArtMode>
          name="mode"
          label={t('set.style')}
          value={g.mode}
          onChange={(mode) => patchG({ mode })}
          options={[
            { value: 'pixel', label: t('mode.pixel') },
            { value: 'cartoon', label: t('mode.cartoon') },
          ]}
        />
        <p className="hint">{g.mode === 'pixel' ? t('mode.pixelHint') : t('mode.cartoonHint')}</p>
      </Section>

      <Section title={t('set.frames')} scope="one" showScope={batch}>
        {asset.kind === 'single' ? (
          <p className="hint">{t('seg.singleKindHint')}</p>
        ) : (
          <>
            <Segmented<SegMode>
              name={`seg-${asset.id}`}
              label={t('set.frames')}
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
            <p className="hint">{t(`seg.${seg.mode}Hint`)}</p>
          </>
        )}
      </Section>

      <Section title={t('set.size')} scope="all" showScope={batch}>
        <div className="sub">
          <Check checked={g.targetHeight !== null} onChange={(on) => patchG({ targetHeight: on ? 64 : null })} label={t('size.heightOn')} />
          {g.targetHeight !== null && (
            <Field label={t('size.heightPx')}>
              <NumberInput value={g.targetHeight} min={4} max={1024} onChange={(targetHeight) => patchG({ targetHeight })} />
            </Field>
          )}
          <p className="hint">{g.targetHeight === null && batch ? t('size.heightBatchWarn') : t('size.heightWhy')}</p>
        </div>
        <div className="sub">
          <Check checked={g.cellAuto} onChange={(cellAuto) => patchG({ cellAuto })} label={t('size.cellAuto')} />
          {!g.cellAuto && (
            <>
              <CellSizeField label={t('size.cellW')} value={g.cellW} onChange={(cellW) => patchG({ cellW })} />
              <CellSizeField label={t('size.cellH')} value={g.cellH} onChange={(cellH) => patchG({ cellH })} />
              <Field label={t('size.padBottom')} hint={t('size.padBottomHint')}>
                <NumberInput value={g.padBottom} min={0} max={256} onChange={(padBottom) => patchG({ padBottom })} />
              </Field>
            </>
          )}
          <p className="hint">{t('size.cellHint')}</p>
        </div>
        {batch && g.targetHeight !== null && (
          <Field label={`${t('size.relative')} (${t('scope.one')})`} hint={t('size.relativeHint')}>
            <NumberInput value={asset.relative} min={0.1} max={5} step={0.05} onChange={(relative) => patchA({ relative })} />
          </Field>
        )}
      </Section>

      {asset.kind === 'sheet' && (
        <Section title={t('set.animations')} scope="one" showScope={batch}>
          <AnimationsEditor anims={asset.anims} frameCount={state.run.frameCounts[asset.id]} onChange={(anims) => patchA({ anims })} />
        </Section>
      )}

      {g.mode === 'pixel' && (
        <Section title={t('set.colours')} scope="all" showScope={batch}>
          <Field label={t('colours.max')} hint={t('colours.maxHint')}>
            <NumberInput value={g.maxColors} min={0} max={256} onChange={(maxColors) => patchG({ maxColors })} />
          </Field>
        </Section>
      )}

      <Fold title={t('set.background')} summary={bgSwatch} open={!autoWorked} key={`bg-${asset.id}`}>
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
      </Fold>

      <Fold title={t('set.advanced')}>
        <Field label={t('adv.anchor')} hint={t('adv.anchorHint')}>
          <select value={g.anchorX} onChange={(e) => patchG({ anchorX: e.target.value as AnchorXMethod })}>
            {ANCHORS.map((a) => (
              <option key={a} value={a}>{t(`adv.anchor.${a}`)}</option>
            ))}
          </select>
        </Field>
      </Fold>
    </div>
  );
}
