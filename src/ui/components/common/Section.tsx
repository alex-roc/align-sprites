import type { ReactNode } from 'react';

/** Settings group with a plain heading. */
export function Section({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="set">
      <header className="set-head">
        <h3>{title}</h3>
      </header>
      {hint && <p className="hint">{hint}</p>}
      {children}
    </section>
  );
}

/** Collapsible settings group (Colours, Background, Advanced). `summary` stays visible when closed. */
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

/** Band that splits the settings column when the batch has several images ("For all images (2)", "Only «Run»"). */
export function ScopeGroup({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="scope-group">
      <h2 className="scope-title">{title}</h2>
      {children}
    </div>
  );
}
