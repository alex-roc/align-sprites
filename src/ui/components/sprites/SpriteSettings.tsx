import type { ReactNode } from 'react';
import { useI18n } from '../../../i18n/index.ts';
import type { AnchorXMethod, ArtMode } from '../../../core/types.ts';
import { hexToRgb, rgbToHex } from '../../lib/image.ts';
import { useApp } from '../../state/context.ts';
import type { Asset, AssetKind, BgStrategy, GlobalSettings, SegMode } from '../../state/types.ts';
import { Check, Field, NumberInput, Segmented } from '../common/Field.tsx';
import { PaletteField } from '../common/PaletteField.tsx';
import { usePaletteSummary } from '../../state/usePaletteSummary.ts';
import { Fold, ScopeGroup, Section } from '../common/Section.tsx';
import { AnimationsEditor } from './AnimationsEditor.tsx';
import { ColorVariants } from './ColorVariants.tsx';
import { FrameSizeField } from './FrameSizeField.tsx';
import { SpriteSizeField } from './SpriteSizeField.tsx';

const ANCHORS: AnchorXMethod[] = ['medianColumn', 'centroid', 'bboxCenter'];

interface Item {
  /** 'all' = applies to every image; 'one' = only the active one. */
  scope: 'all' | 'one';
  key: string;
  node: ReactNode;
}

/**
 * Settings column, in the order you think: art style (header), sprite size, frame size, then the image itself (type,
 * frames, animations), then the folded finishing touches. With 2+ images the column splits in "for all images" and
 * "only this image"; with one image no scope is shown at all.
 */
export function SpriteSettings({ asset }: { asset: Asset }) {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const paletteSummary = usePaletteSummary();
  const g = state.global;
  const batch = state.assets.length > 1;
  const sheet = asset.kind === 'sheet';
  const patchG = (p: Partial<GlobalSettings>) => dispatch({ type: 'global/patch', patch: p });
  const patchA = (p: Partial<Asset>) => dispatch({ type: 'asset/patch', id: asset.id, patch: p });
  const bg = asset.bg;
  const setBg = (p: Partial<typeof bg>) => patchA({ bg: { ...bg, ...p } });
  const seg = asset.seg;
  // Picking auto or grid drops any hand-drawn boxes: the choice is explicit.
  const setSeg = (p: Partial<typeof seg>) => patchA({ seg: { ...seg, ...p }, regions: null });

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

  const items: Item[] = [
    { scope: 'all', key: 'size', node: <Section title={t('set.spriteSize')}><SpriteSizeField /></Section> },
    { scope: 'all', key: 'frame', node: <Section title={t('set.frameSize')}><FrameSizeField /></Section> },
    {
      scope: 'one',
      key: 'type',
      node: (
        <Section title={t('set.type')}>
          <Segmented<AssetKind>
            name={`kind-${asset.id}`}
            label={t('set.type')}
            value={asset.kind}
            onChange={(kind) => patchA({ kind })}
            options={[
              { value: 'sheet', label: t('kind.sheet') },
              { value: 'single', label: t('kind.single') },
            ]}
          />
          {asset.detected && (
            <p className="hint">{asset.detected.kind === 'single' ? t('kind.detectedSingle') : t('kind.detectedSheet', { count: asset.detected.frameCount })}</p>
          )}
        </Section>
      ),
    },
  ];
  if (sheet) {
    items.push({
      scope: 'one',
      key: 'frames',
      node: (
        <Section title={t('set.frames')}>
          <Segmented<SegMode>
            name={`seg-${asset.id}`}
            label={t('set.frames')}
            value={seg.mode}
            onChange={(mode) => setSeg({ mode })}
            options={[
              { value: 'auto', label: t('seg.auto') },
              { value: 'grid', label: t('seg.grid') },
            ]}
          />
          {seg.mode === 'grid' && !asset.regions && (
            <div className="row">
              <Field label={t('seg.rows')}>
                <NumberInput value={seg.rows} min={1} max={64} onChange={(rows) => setSeg({ rows })} />
              </Field>
              <Field label={t('seg.cols')}>
                <NumberInput value={seg.cols} min={1} max={64} onChange={(cols) => setSeg({ cols })} />
              </Field>
            </div>
          )}
          {asset.regions ? (
            <div className="notice">
              <span>{t('seg.manualNote', { count: asset.regions.length })}</span>
              <button type="button" className="btn btn-sm" onClick={() => patchA({ regions: null })}>{t('seg.backToAuto')}</button>
            </div>
          ) : (
            <p className="hint">{t(`seg.${seg.mode}Hint`)}</p>
          )}
        </Section>
      ),
    });
    items.push({
      scope: 'one',
      key: 'anims',
      node: (
        <Section title={t('set.animations')}>
          <AnimationsEditor anims={asset.anims} frameCount={state.run.frameCounts[asset.id]} onChange={(anims) => patchA({ anims })} />
        </Section>
      ),
    });
  }
  items.push({
    scope: 'all',
    key: 'colours',
    node: (
      <Fold title={t('set.colours')} summary={paletteSummary(g)}>
        <PaletteField />
      </Fold>
    ),
  });
  items.push({
    scope: 'one',
    key: 'bg',
    node: (
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
    ),
  });
  // How this image is sized against the common height: which frames measure the character, and a multiplier.
  const showRef = asset.kind === 'sheet';
  if (g.targetHeight !== null && (batch || showRef)) {
    items.push({
      scope: 'one',
      key: 'relative',
      node: (
        <Section title={t('size.relative')}>
          {showRef && (
            <Field label={t('size.heightRef')} hint={t('size.heightRefHint')}>
              <Segmented<Asset['heightRef']>
                name={`heightref-${asset.id}`}
                label={t('size.heightRef')}
                value={asset.heightRef}
                onChange={(heightRef) => patchA({ heightRef })}
                options={[
                  { value: 'median', label: t('size.heightRef.median') },
                  { value: 'tallest', label: t('size.heightRef.tallest') },
                ]}
              />
            </Field>
          )}
          {batch && (
            <Field label={t('size.relativeLabel')} hint={t('size.relativeHint')}>
              <NumberInput value={asset.relative} min={0.1} max={5} step={0.05} onChange={(relative) => patchA({ relative })} />
            </Field>
          )}
        </Section>
      ),
    });
  }
  items.push({
    scope: 'one',
    key: 'variants',
    node: (
      <Section title={t('set.variants')}>
        <ColorVariants asset={asset} key={asset.id} />
      </Section>
    ),
  });
  items.push({
    scope: 'all',
    key: 'adv',
    node: (
      <Fold title={t('set.advanced')}>
        <Field label={t('adv.anchor')} hint={t('adv.anchorHint')}>
          <select value={g.anchorX} onChange={(e) => patchG({ anchorX: e.target.value as AnchorXMethod })}>
            {ANCHORS.map((a) => (
              <option key={a} value={a}>{t(`adv.anchor.${a}`)}</option>
            ))}
          </select>
        </Field>
      </Fold>
    ),
  });

  const style = (
    <div className="settings-top">
      <div className="settings-top-row">
        <span className="field-label">{t('set.style')}</span>
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
      </div>
      <p className="hint">{g.mode === 'pixel' ? t('mode.pixelHint') : t('mode.cartoonHint')}</p>
    </div>
  );

  const render = (list: Item[]) => list.map((it) => <div key={it.key} className="set-item">{it.node}</div>);
  return (
    <div className="settings-in">
      {batch ? (
        <>
          <ScopeGroup title={t('scope.allTitle', { count: state.assets.length })}>
            {style}
            {render(items.filter((i) => i.scope === 'all'))}
          </ScopeGroup>
          <ScopeGroup title={t('scope.oneTitle', { name: asset.name })}>{render(items.filter((i) => i.scope === 'one'))}</ScopeGroup>
        </>
      ) : (
        <>
          {style}
          {render(items)}
        </>
      )}
    </div>
  );
}
