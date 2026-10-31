import { useRef, type ReactNode } from 'react';
import { useI18n, type MessageKey } from '../../../i18n/index.ts';
import { hrefFor } from '../../route.ts';

export interface ExampleBtn {
  key: string;
  label: string;
  onClick: () => void;
}

/** Empty state of the stage: the stage itself is the drop zone, with examples and a three-step "how it works" line. */
export function EmptyStage({ title, hint, multiple, onFiles, examples, steps, error, busy, extra }: {
  title: string;
  hint: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  examples: ExampleBtn[];
  steps: [MessageKey, MessageKey, MessageKey];
  error?: string | null;
  busy?: boolean;
  extra?: ReactNode;
}) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="stage-card empty">
      <div className="stage-body empty-body">
        <button type="button" className="empty-drop" onClick={() => input.current?.click()}>
          <strong>{busy ? t('drop.loading') : title}</strong>
          <span>{hint}</span>
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple={multiple}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            onFiles([...(e.target.files ?? [])]);
            e.target.value = '';
          }}
        />
        <div className="row wrap center">
          <span className="on-stage-soft">{t('drop.tryExample')}</span>
          {examples.map((ex) => (
            <button key={ex.key} type="button" className="btn btn-stage" onClick={ex.onClick}>
              {ex.label}
            </button>
          ))}
        </div>
        {extra}
        {error && <p className="alert" role="alert">{error}</p>}
      </div>
      <ol className="how">
        {steps.map((k, i) => (
          <li key={k}>
            <span className="how-n" aria-hidden="true">{i + 1}</span>
            {t(k)}
          </li>
        ))}
        <li className="how-link"><a href={hrefFor('guide')}>{t('how.guide')}</a></li>
      </ol>
    </div>
  );
}
