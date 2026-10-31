import { useI18n } from '../../../i18n/index.ts';
import { cx } from '../../cx.ts';
import { TILE_PRESETS } from '../../lib/tilePresets.ts';
import { NumberInput } from '../common/Field.tsx';


/** Tile size: preset chips plus a free number. */
export function TileSizeField({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const { t } = useI18n();
  return (
    <div className="cell-axis">
      <div className="chips" role="group" aria-label={t('tiles.tileSize')}>
        {TILE_PRESETS.map((p) => (
          <button key={p} type="button" className={cx('chip', p % 32 === 0 && 'is-32', p === value && 'is-on')} aria-pressed={p === value} onClick={() => onChange(p)}>
            {p}
          </button>
        ))}
        <NumberInput value={value} min={8} max={256} onChange={onChange} aria-label={`${t('tiles.tileSize')}, ${t('cell.custom')}`} className="num-sm" />
      </div>
      <small className="hint">{t('tiles.tileSizeHint')}</small>
    </div>
  );
}
