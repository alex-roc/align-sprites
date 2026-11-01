import { useCallback, useState } from 'react';
import { autoBgOptions } from '../../core/bg/index.ts';
import { useI18n } from '../../i18n/index.ts';
import { blobToRGBA, ImageTooLargeError } from '../lib/image.ts';
import { newId } from './defaults.ts';
import type { AutoBg, LoadedImage } from './types.ts';

/** Decode one image for the World and Items tabs; returns null (and sets a friendly `error`) when it cannot be read. */
export function useLoadImage() {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (blob: Blob, name: string): Promise<LoadedImage | null> => {
      setError(null);
      setBusy(true);
      try {
        const image = await blobToRGBA(blob);
        let autoBg: AutoBg | null = null;
        try {
          const o = autoBgOptions(image, 'pixel');
          if (o.color !== 'auto') autoBg = { color: o.color, strategy: o.strategy };
        } catch {
          // only a hint: the core detects the colour itself
        }
        return { id: newId('t'), name: name.replace(/\.[^.]+$/, '') || 'image', image, autoBg };
      } catch (e) {
        setError(e instanceof ImageTooLargeError ? t('error.imageTooLarge', { name }) : t('error.imageDecode', { name }));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [t],
  );

  return { load, error, busy, setError };
}
