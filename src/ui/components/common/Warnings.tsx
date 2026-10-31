import type { Warning } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';

export interface Fix {
  label: string;
  onClick?: () => void;
  /** Hash link (for "learn more" fixes that open the guide). */
  href?: string;
}

/** Warnings as plain sentences, each with its fix button when there is one. */
export function Warnings({ warnings, fixFor }: { warnings: Warning[]; fixFor: (w: Warning) => Fix | null }) {
  const { t, tw } = useI18n();
  if (!warnings.length) return <p className="ok" role="status">{t('status.noWarnings')}</p>;
  // Repeated warnings (one per clipped frame, for example) show once, with a count: the fix is the same.
  const groups = new Map<string, { w: Warning; count: number }>();
  for (const w of warnings) {
    const g = groups.get(w.key);
    if (g) g.count++;
    else groups.set(w.key, { w, count: 1 });
  }
  return (
    <ul className="warnings" aria-label={t('status.warnings')}>
      {[...groups.values()].map(({ w, count }) => {
        const fix = fixFor(w);
        return (
          <li key={w.key}>
            <span>
              {tw(w)}
              {count > 1 && <span className="muted"> {t('status.more', { count: count - 1 })}</span>}
            </span>
            {fix &&
              (fix.href ? (
                <a className="btn btn-sm" href={fix.href}>{fix.label}</a>
              ) : (
                <button type="button" className="btn btn-sm" onClick={fix.onClick}>{fix.label}</button>
              ))}
          </li>
        );
      })}
    </ul>
  );
}
