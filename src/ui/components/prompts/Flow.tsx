import type { ReactNode } from 'react';

/** Numbered step of the prompt flow (it IS a sequence). */
export function FlowStep({ n, title, children }: { n: number; title: string; children?: ReactNode }) {
  return (
    <li className="flow-step">
      <span className="flow-n" aria-hidden="true">{n}</span>
      <div className="flow-body">
        <h3>{title}</h3>
        {children}
      </div>
    </li>
  );
}
