import { useCallback, useState } from 'react';
import { autoBgOptions } from '../../core/bg/index.ts';
import type { AutoBg, Detected } from './types.ts';
import { useI18n } from '../../i18n/index.ts';
import { inspectImage } from '../../worker/client.ts';
import { blobToRGBA, ImageTooLargeError } from '../lib/image.ts';
import { useApp } from './context.ts';
import { makeAsset } from './defaults.ts';
import type { Asset } from './types.ts';

export interface IncomingImage {
  name: string;
  blob: Blob;
}

/**
 * Decode images on the main thread and add them as assets. The worker inspects each one (background, sprite sheet or
 * single sprite, frame count); when that fails the image is treated as a sheet with the main-thread background hint.
 */
export function useAddAssets() {
  const { state, dispatch } = useApp();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mode = state.global.mode;

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
          let detected: Detected | null = null;
          try {
            const insp = await inspectImage(image, mode);
            detected = { kind: insp.kind, frameCount: insp.frameCount, sourceHeight: insp.sourceHeight };
            if (insp.bg.color !== 'auto') autoBg = { color: insp.bg.color, strategy: insp.bg.strategy };
          } catch {
            // inspection unavailable: sheet by default, and the background hint below
          }
          if (!autoBg) {
            try {
              const o = autoBgOptions(image, mode);
              if (o.color !== 'auto') autoBg = { color: o.color, strategy: o.strategy };
            } catch {
              // detection is only a hint for the swatch; the core still detects the colour itself
            }
          }
          assets.push(makeAsset(it.name, image, detected, autoBg));
        } catch (e) {
          failed.push(e instanceof ImageTooLargeError ? t('error.imageTooLarge', { name: it.name }) : t('error.imageDecode', { name: it.name }));
        }
      }
      if (assets.length) dispatch({ type: 'asset/add', assets });
      if (failed.length) setError(failed.join(' '));
      setBusy(false);
    },
    [dispatch, t, mode],
  );

  return { add, error, busy };
}
