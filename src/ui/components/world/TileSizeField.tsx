import { useI18n } from '../../../i18n/index.ts';
import { cx } from '../../cx.ts';
import { TILE_PRESETS } from '../../lib/tilePresets.ts';
import { NumberInput } from '../common/Field.tsx';


/** Tile size: preset chips plus a free number. */
export function TileSizeField({ value, onChange, label, hint }: { value: number; onChange: (n: number) => void; label?: string; hint?: string }) {
  const { t } = useI18n();
  const name = label ?? t('tiles.tileSize');
  return (
    <div className="cell-axis">
      <div className="chips" role="group" aria-label={name}>
        {TILE_PRESETS.map((p) => (
          <button key={p} type="button" className={cx('chip', p % 32 === 0 && 'is-32', p === value && 'is-on')} aria-pressed={p === value} onClick={() => onChange(p)}>
            {p}
          </button>
        ))}
        <NumberInput value={value} min={8} max={256} onChange={onChange} aria-label={`${name}, ${t('size.other')}`} className="num-sm" />
      </div>
      <small className="hint">{hint ?? t('tiles.tileSizeHint')}</small>
    </div>
  );
}
