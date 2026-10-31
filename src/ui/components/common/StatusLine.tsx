/** One-line summary under the stage: small label, tabular value. */
export function StatusLine({ items }: { items: { label: string; value: string; tone?: 'ok' | 'bad' }[] }) {
  return (
    <dl className="status">
      {items.map((it) => (
        <div key={it.label} className="status-item">
          <dt>{it.label}</dt>
          <dd className={it.tone ? `is-${it.tone}` : undefined}>{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
