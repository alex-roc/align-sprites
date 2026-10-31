import { useCallback, useState } from 'react';
import { autoBgOptions } from '../../core/bg/index.ts';
import type { AutoBg } from './types.ts';
import { useI18n } from '../../i18n/index.ts';
import { blobToRGBA, ImageTooLargeError } from '../lib/image.ts';
import { useApp } from './context.ts';
import { makeAsset } from './defaults.ts';
import type { Asset, AssetKind } from './types.ts';

export interface IncomingImage {
  name: string;
  blob: Blob;
  kind?: AssetKind;
}

/** Decode images on the main thread and add them as assets; collects a friendly error message. */
export function useAddAssets() {
  const { dispatch } = useApp();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const add = useCallback(
    async (items: IncomingImage[]) => {
      setError(null);
      setBusy(true);
      const assets: Asset[] = [];
      const failed: string[] = [];
      for (const it of items) {
        try {
          const image = await blobToRGBA(it.blob);
          let autoBg: AutoBg | null = null;
          try {
            const o = autoBgOptions(image, 'pixel');
            if (o.color !== 'auto') autoBg = { color: o.color, strategy: o.strategy };
          } catch {
            // detection is only a hint for the swatch; the core still detects the colour itself
          }
          assets.push(makeAsset(it.name, image, it.kind ?? 'sheet', autoBg));
        } catch (e) {
          failed.push(e instanceof ImageTooLargeError ? t('error.imageTooLarge', { name: it.name }) : t('error.imageDecode', { name: it.name }));
        }
      }
      if (assets.length) dispatch({ type: 'asset/add', assets });
      if (failed.length) setError(failed.join(' '));
      setBusy(false);
    },
    [dispatch, t],
  );

  return { add, error, busy };
}
