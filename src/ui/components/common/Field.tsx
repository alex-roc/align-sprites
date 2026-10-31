import { useId, useState, type ReactNode } from 'react';
import { cx } from '../../cx.ts';

/** Labelled control: the label wraps the control, so it is associated without ids. */
export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('field', className)}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <small className="hint">{hint}</small>}
    </label>
  );
}

/** Group of related controls (radio sets, rows of inputs). */
export function Group({ legend, hint, children, className }: { legend: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <fieldset className={cx('group', className)}>
      <legend>{legend}</legend>
      {children}
      {hint && <small className="hint">{hint}</small>}
    </fieldset>
  );
}

interface NumberInputProps {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

/** Number input that lets you clear and retype; the value is clamped on blur. */
export function NumberInput({ value, onChange, min = -Infinity, max = Infinity, step = 1, disabled, className, ...rest }: NumberInputProps) {
  // While typing we show the raw text (so the field can be cleared); otherwise the committed value.
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      type="number"
      className={cx('num', className)}
      value={draft ?? String(value)}
      min={Number.isFinite(min) ? min : undefined}
      max={Number.isFinite(max) ? max : undefined}
      step={step}
      disabled={disabled}
      aria-label={rest['aria-label']}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = parseFloat(e.target.value);
        if (Number.isFinite(n) && n >= min && n <= max) onChange(n);
      }}
      onBlur={() => {
        const n = parseFloat(draft ?? '');
        if (draft !== null && Number.isFinite(n)) {
          const c = Math.min(max, Math.max(min, n));
          if (c !== value) onChange(c);
        }
        setDraft(null);
      }}
    />
  );
}

export function Check({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; disabled?: boolean }) {
  return (
    <label className={cx('check', disabled && 'is-disabled')}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export interface SegOption<T extends string> {
  value: T;
  label: ReactNode;
}

/** Segmented control (radio group styled as buttons). */
export function Segmented<T extends string>({ name, value, options, onChange, label }: { name: string; value: T; options: SegOption<T>[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label key={o.value} className={cx('seg-opt', o.value === value && 'is-on')}>
          <input type="radio" name={name} value={o.value} checked={o.value === value} onChange={() => onChange(o.value)} />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

/** Range slider with a value readout and optional tick marks (browsers that support `list` draw them). */
export function Slider({ label, value, min, max, step, ticks, unit = 'px', onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Values that get a tick mark (for example every multiple of 32). */
  ticks?: number[];
  unit?: string;
  onChange: (n: number) => void;
}) {
  const id = useId();
  return (
    <div className="field slider">
      <label className="field-label slider-head" htmlFor={id}>
        <span>{label}</span>
        <output htmlFor={id}>{value} {unit}</output>
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={Math.min(max, Math.max(min, value))} list={ticks ? `${id}-ticks` : undefined} onChange={(e) => onChange(Number(e.target.value))} />
      {ticks && (
        <datalist id={`${id}-ticks`}>
          {ticks.filter((v) => v >= min && v <= max).map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      )}
    </div>
  );
}
