import { useI18n } from '../../../i18n/index.ts';
import { cx } from '../../cx.ts';
import { NumberInput } from '../common/Field.tsx';

const PRESETS = [16, 32, 48, 64];

/** Tile size: preset chips plus a free number. */
export function TileSizeField({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const { t } = useI18n();
  return (
    <div className="cell-axis">
      <span className="field-label">{t('tiles.tileSize')}</span>
      <div className="chips" role="group" aria-label={t('tiles.tileSize')}>
        {PRESETS.map((p) => (
          <button key={p} type="button" className={cx('chip', 'chip-sm', p % 32 === 0 && 'is-32', p === value && 'is-on')} aria-pressed={p === value} onClick={() => onChange(p)}>
            {p}
          </button>
        ))}
        <NumberInput value={value} min={8} max={256} onChange={onChange} aria-label={`${t('tiles.tileSize')} (${t('cell.custom')})`} className="num-sm" />
        <span className="muted">px</span>
      </div>
      <small className="hint">{t('tiles.tileSizeHint')}</small>
    </div>
  );
}
