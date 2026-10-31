import { useEffect, useState } from 'react';
import { useI18n } from '../../../i18n/index.ts';

/** Read-only prompt text with a copy button. */
export function CopyBox({ text, label }: { text: string; label: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(id);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API unavailable (http, old browser): fall back to a temporary textarea.
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
  };

  return (
    <div className="copybox">
      <label className="field">
        <span className="field-label">{label}</span>
        <textarea readOnly value={text} rows={14} />
      </label>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={() => void copy()}>{t('prompt.copy')}</button>
        <span className="muted" role="status">{copied ? t('prompt.copied') : ''}</span>
      </div>
    </div>
  );
}
