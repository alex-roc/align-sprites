import { useEffect, useState, type DragEvent } from 'react';
import { useI18n } from '../../../i18n/index.ts';
import { cx } from '../../cx.ts';
import { fetchPublicImage } from '../../dev/examples.ts';
import type { MessageKey } from '../../../i18n/index.ts';

export interface DropExample {
  file: string;
  labelKey: MessageKey;
}

let pasteSeq = 0;

/** Single-image drop zone: drag & drop, file picker, optional clipboard paste and example buttons. */
export function ImageDrop({ label, hintKey, examples, paste, busy, error, onImage }: {
  label: string;
  hintKey?: MessageKey;
  examples?: DropExample[];
  /** Listen for clipboard images (only one drop zone at a time should). */
  paste?: boolean;
  busy?: boolean;
  error?: string | null;
  onImage: (blob: Blob, name: string) => void;
}) {
  const { t } = useI18n();
  const [over, setOver] = useState(false);
  const [exampleError, setExampleError] = useState(false);

  useEffect(() => {
    if (!paste) return;
    const onPaste = (e: ClipboardEvent) => {
      const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith('image/'));
      if (f) {
        e.preventDefault();
        onImage(f, `pasted-${++pasteSeq}.png`);
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [paste, onImage]);

  const pick = (files: FileList | null | undefined) => {
    const f = [...(files ?? [])].find((x) => x.type.startsWith('image/'));
    if (f) onImage(f, f.name);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    pick(e.dataTransfer.files);
  };
  const loadExample = async (file: string) => {
    setExampleError(false);
    try {
      onImage(await fetchPublicImage(file), file);
    } catch {
      setExampleError(true);
    }
  };

  return (
    <div className="image-drop">
      <label
        className={cx('dropzone', 'dropzone-sm', over && 'is-over')}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = '';
          }}
        />
        <strong>{busy ? t('upload.loading') : label}</strong>
        {hintKey && <span>{t(hintKey)}</span>}
      </label>
      {examples && examples.length > 0 && (
        <div className="row wrap examples">
          <span className="muted">{t('upload.tryExample')}</span>
          {examples.map((ex) => (
            <button key={ex.file} type="button" className="btn" onClick={() => void loadExample(ex.file)}>
              {t(ex.labelKey)}
            </button>
          ))}
        </div>
      )}
      {(error || exampleError) && <p className="alert" role="alert">{error ?? t('upload.exampleError')}</p>}
    </div>
  );
}
