import type { ReactNode } from 'react';
import { cx } from '../../cx.ts';

/** Numbered card of the 3-step flow. */
export function Step({ n, title, children, muted, actions }: { n: number; title: string; children: ReactNode; muted?: boolean; actions?: ReactNode }) {
  return (
    <section className={cx('step', muted && 'is-muted')} aria-labelledby={`step-${n}`}>
      <header className="step-head">
        <span className="step-n" aria-hidden="true">{n}</span>
        <h2 id={`step-${n}`}>{title}</h2>
        {actions && <div className="step-actions">{actions}</div>}
      </header>
      <div className="step-body">{children}</div>
    </section>
  );
}
