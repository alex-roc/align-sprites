import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useI18n } from '../../../i18n/index.ts';
import { fetchExample, EXAMPLES } from '../../dev/examples.ts';
import { cx } from '../../cx.ts';
import { useApp } from '../../state/context.ts';
import { useAddAssets, type IncomingImage } from '../../state/useAddAssets.ts';
import { Step } from '../common/Step.tsx';
import { AssetList } from './AssetList.tsx';

let pasteSeq = 0;

function toIncoming(files: Iterable<File>): IncomingImage[] {
  return [...files].filter((f) => f.type.startsWith('image/')).map((f) => ({ name: f.name, blob: f }));
}

export function UploadStep() {
  const { t } = useI18n();
  const { state } = useApp();
  const { add, error, busy } = useAddAssets();
  const [over, setOver] = useState(false);
  const [exampleError, setExampleError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // Paste images from the clipboard anywhere on the Sprites tab.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])];
      const items = toIncoming(files).map((it) => ({ ...it, name: `pasted-${++pasteSeq}.png` }));
      if (items.length) {
        e.preventDefault();
        void add(items);
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [add]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void add(toIncoming(e.dataTransfer.files));
  };

  const loadExample = async (id: string) => {
    const ex = EXAMPLES.find((x) => x.id === id);
    if (!ex) return;
    setExampleError(null);
    try {
      await add([await fetchExample(ex)]);
    } catch {
      setExampleError(t('upload.exampleError'));
    }
  };

  return (
    <Step n={1} title={t('step.upload')}>
      <label
        className={cx('dropzone', over && 'is-over')}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            void add(toIncoming(e.target.files ?? []));
            e.target.value = '';
          }}
        />
        <strong>{busy ? t('upload.loading') : t('upload.drop')}</strong>
        <span>{t('upload.hint')}</span>
      </label>
      <div className="row wrap examples">
        <span className="muted">{t('upload.tryExample')}</span>
        {EXAMPLES.map((ex) => (
          <button key={ex.id} type="button" className="btn" onClick={() => void loadExample(ex.id)}>
            {t(ex.labelKey)}
          </button>
        ))}
      </div>
      {(error || exampleError) && <p className="alert" role="alert">{error ?? exampleError}</p>}
      {state.assets.length > 0 && <AssetList />}
      {state.assets.length > 1 && <p className="note">{t('upload.batchNote')}</p>}
    </Step>
  );
}
