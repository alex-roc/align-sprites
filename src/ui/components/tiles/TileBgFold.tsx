import { useI18n } from '../../../i18n/index.ts';
import { hexToRgb, rgbToHex } from '../../lib/image.ts';
import type { LoadedImage, TileBgStrategy, TileSheetState } from '../../state/types.ts';
import { Check, Field } from '../common/Field.tsx';
import { Fold } from '../common/Section.tsx';

const STRATEGIES: { value: TileBgStrategy; key: 'auto' | 'global' | 'flood' | 'floodHoles' }[] = [
  { value: 'auto', key: 'auto' },
  { value: 'global', key: 'global' },
  { value: 'flood', key: 'flood' },
  { value: 'flood+holes', key: 'floodHoles' },
];

/** Background fold of the Tiles tools (tile sheet, items): remove it or not, colour, strategy and tolerance. */
export function TileBgFold({ src, removeBg, bg, onRemoveBg, onBg }: {
  src: LoadedImage;
  removeBg: boolean;
  bg: TileSheetState['bg'];
  onRemoveBg: (v: boolean) => void;
  onBg: (p: Partial<TileSheetState['bg']>) => void;
}) {
  const { t } = useI18n();
  const detected = src.autoBg?.color;
  const shown = bg.custom ? bg.color : detected;
  const transparent = !bg.custom && detected !== undefined && detected[3] === 0;
  const autoWorked = removeBg && !bg.custom && bg.strategy === 'auto' && detected !== undefined;
  const hintKey = bg.strategy === 'flood+holes' ? 'floodHoles' : bg.strategy;

  return (
    <Fold
      title={t('set.background')}
      open={!autoWorked}
      key={`tbg-${src.id}`}
      summary={
        <span className="bg-summary">
          <span className="swatch checker" aria-hidden="true">{shown && !transparent && removeBg && <i style={{ background: rgbToHex(shown) }} />}</span>
          {!removeBg ? t('tiles.bgOff') : autoWorked ? (transparent ? t('bg.transparentOk') : t('bg.autoOk', { color: rgbToHex(shown ?? [0, 0, 0]) })) : t(`bg.strategy.${hintKey}`)}
        </span>
      }
    >
      <Check checked={removeBg} onChange={onRemoveBg} label={t('tiles.removeBg')} />
      {removeBg && (
        <>
          <Check checked={bg.custom} onChange={(custom) => onBg({ custom })} label={t('bg.useCustom')} />
          {bg.custom && (
            <Field label={t('bg.color')}>
              <input type="color" value={rgbToHex(bg.color)} onChange={(e) => onBg({ color: hexToRgb(e.target.value) })} />
            </Field>
          )}
          <Field label={t('bg.strategy')} hint={t(`bg.strategy.${hintKey}Hint`)}>
            <select value={bg.strategy} onChange={(e) => onBg({ strategy: e.target.value as TileBgStrategy })}>
              {STRATEGIES.map((o) => (
                <option key={o.value} value={o.value}>{t(`bg.strategy.${o.key}`)}</option>
              ))}
            </select>
          </Field>
          <Field label={`${t('bg.tolerance')}: ${bg.tolerance}`} hint={t('bg.toleranceHint')}>
            <input type="range" min={0} max={60} value={bg.tolerance} onChange={(e) => onBg({ tolerance: Number(e.target.value) })} />
          </Field>
        </>
      )}
    </Fold>
  );
}
