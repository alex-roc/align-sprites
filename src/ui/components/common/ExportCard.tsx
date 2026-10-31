import type { ReactNode } from 'react';
import { useI18n } from '../../../i18n/index.ts';
import { Check, Segmented, type SegOption } from './Field.tsx';

/** Export panel shared by Sprites and Tiles: pick ONE target, read its import steps, download. */
export function ExportCard<T extends string>({ name, options, value, onChange, steps, guideHref, all, onAll, allLabel, primaryLabel, onPrimary, secondaryLabel, onSecondary, busy, disabled, error, note, extra, choices }: {
  name: string;
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  steps: string[];
  guideHref: string;
  /** "All targets" checkbox (omit to hide). */
  all?: boolean;
  onAll?: (v: boolean) => void;
  allLabel?: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  busy?: boolean;
  disabled?: boolean;
  error?: string | null;
  note?: ReactNode;
  /** More action buttons after the secondary one. */
  extra?: ReactNode;
  /** Engine-specific checkboxes shown under the import steps (e.g. GDevelop spritesheets). */
  choices?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <section className="export-card" aria-label={t('export.title')}>
      <div className="export-head">
        <h3>{t('export.title')}</h3>
        <Segmented<T> name={name} label={t('export.target')} value={value} options={options} onChange={onChange} />
      </div>
      <ol className="steps">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      {choices && <div className="export-choices">{choices}</div>}
      <div className="export-actions">
        <button type="button" className="btn btn-primary" disabled={busy || disabled} onClick={onPrimary}>
          {busy ? t('export.working') : primaryLabel}
        </button>
        {secondaryLabel && onSecondary && (
          <button type="button" className="btn" disabled={disabled} onClick={onSecondary}>{secondaryLabel}</button>
        )}
        {extra}
        <a className="link" href={guideHref}>{t('export.fullGuide')}</a>
        {onAll && <Check checked={!!all} onChange={onAll} label={allLabel ?? t('export.all')} />}
      </div>
      {note && <p className="hint">{note}</p>}
      {error && <p className="alert" role="alert">{error}</p>}
    </section>
  );
}
