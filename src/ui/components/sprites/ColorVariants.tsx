import { useMemo, useState } from 'react';
import { imageColors, rgbaToHex } from '../../../core/palette/index.ts';
import type { RGBAImage } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { useApp } from '../../state/context.ts';
import { cloneAsset } from '../../state/defaults.ts';
import type { Asset } from '../../state/types.ts';
import { BatchSwaps } from './BatchSwaps.tsx';

const MAX_SWATCHES = 64;

/** "name-variant-2": the base name (without an earlier variant suffix) plus the next free number. */
function variantName(word: string, assets: Asset[], name: string): string {
  const base = name.replace(new RegExp(`-${word}-\\d+$`), '');
  const used = assets.filter((a) => a.name.startsWith(`${base}-${word}-`)).length;
  return `${base}-${word}-${used + 2}`;
}

/**
 * Colours of the finished sprite as swatches: click one to recolour it (the image's colour map), or duplicate the
 * image as a colour variant (enemies, teams) that carries its own colour map.
 */
export function ColorVariants({ asset }: { asset: Asset }) {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const result = state.run.results[asset.id];
  const image = result?.sheet.image;
  const colors = useMemo(() => (image ? imageColors(image, MAX_SWATCHES + 1) : []), [image]);
  const tooMany = colors.length > MAX_SWATCHES;

  // The swatches show the result, which lags the colour map by a run: while a colour is being dragged, keep what the
  // user picked on screen and remember which ORIGINAL colour each swatch stands for (a swatch is already mapped).
  // Both belong to the result they were made for; a new result starts clean.
  const [pending, setPending] = useState<{ image: RGBAImage | undefined; draft: Record<string, string>; origin: Record<string, string> }>({ image, draft: {}, origin: {} });
  const live = pending.image === image ? pending : { image, draft: {}, origin: {} };

  if (!result) return null;
  const map = asset.colorMap;
  const recolor = (shown: string, to: string) => {
    const from = live.origin[shown] ?? Object.keys(map).find((k) => map[k].toLowerCase() === shown) ?? shown;
    const { [from]: _old, ...rest } = map;
    setPending({ image, draft: { ...live.draft, [shown]: to }, origin: { ...live.origin, [shown]: from } });
    dispatch({ type: 'asset/patch', id: asset.id, patch: { colorMap: to.toLowerCase() === from ? rest : { ...rest, [from]: to } } });
  };
  const duplicate = () => {
    const name = variantName(t('variant.word'), state.assets, asset.name);
    dispatch({ type: 'asset/add', assets: [cloneAsset(asset, name)], select: true });
  };

  return (
    <div className="sub">
      <p className="hint">{tooMany ? t('variant.tooMany') : t('variant.hint')}</p>
      {!tooMany && (
        <ul className="pal pal-edit" aria-label={t('variant.swatches')}>
          {colors.map(({ color }, i) => {
            const hex = rgbaToHex(color);
            return (
              <li key={i}>
                <input type="color" value={live.draft[hex] ?? hex} aria-label={t('variant.recolor', { color: hex })} title={hex} onChange={(e) => recolor(hex, e.target.value)} />
              </li>
            );
          })}
        </ul>
      )}
      <div className="row wrap">
        <button type="button" className="btn btn-sm" onClick={duplicate}>{t('variant.duplicate')}</button>
        {Object.keys(map).length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'asset/patch', id: asset.id, patch: { colorMap: {} } })}>
            {t('variant.reset')}
          </button>
        )}
      </div>
      <BatchSwaps asset={asset} />
    </div>
  );
}
