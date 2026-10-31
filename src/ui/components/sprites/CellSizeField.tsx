import { CELL_PRESETS } from '../../../core/pack/index.ts';
import { useI18n } from '../../../i18n/index.ts';
import { cx } from '../../cx.ts';
import { NumberInput } from '../common/Field.tsx';

/** One cell axis: preset chips (multiples of 32 highlighted) plus a free number. */
export function CellSizeField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const { t } = useI18n();
  return (
    <div className="cell-axis">
      <span className="field-label">{label}</span>
      <div className="chips" role="group" aria-label={label}>
        {CELL_PRESETS.map((p) => (
          <button key={p} type="button" className={cx('chip', 'chip-sm', p % 32 === 0 && 'is-32', p === value && 'is-on')} aria-pressed={p === value} title={p % 32 === 0 ? t('cell.multiple32') : undefined} onClick={() => onChange(p)}>
            {p}
          </button>
        ))}
        <NumberInput value={value} min={8} max={1024} onChange={onChange} aria-label={`${label} (${t('cell.custom')})`} className="num-sm" />
        <span className="muted">px</span>
      </div>
    </div>
  );
}
