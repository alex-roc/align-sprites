import type { ReactNode } from 'react';
import { useI18n } from '../../../i18n/index.ts';

export type Scope = 'all' | 'one';

/** Settings group with a plain heading. The scope tag only shows when the batch has several images. */
export function Section({ title, scope, showScope, hint, children }: { title: string; scope?: Scope; showScope?: boolean; hint?: ReactNode; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="set">
      <header className="set-head">
        <h3>{title}</h3>
        {scope && showScope && <span className="scope">{scope === 'all' ? t('scope.all') : t('scope.one')}</span>}
      </header>
      {hint && <p className="hint">{hint}</p>}
      {children}
    </section>
  );
}

/** Collapsible settings group (Background, Advanced). `summary` stays visible when closed. */
export function Fold({ title, summary, open, children }: { title: string; summary?: ReactNode; open?: boolean; children: ReactNode }) {
  return (
    <details className="set fold" open={open}>
      <summary>
        <span className="fold-title">{title}</span>
        {summary && <span className="fold-summary">{summary}</span>}
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  );
}
