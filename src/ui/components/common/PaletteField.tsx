import { useRef, useState } from 'react';
import { PALETTES, rgbaToHex } from '../../../core/palette/index.ts';
import type { RGBA8 } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { paletteFromImage } from '../../../worker/client.ts';
import { blobToRGBA } from '../../lib/image.ts';
import { useApp } from '../../state/context.ts';
import { fixedPalette } from '../../state/jobs.ts';
import type { PaletteChoice } from '../../state/types.ts';
import { usePaletteSummary } from '../../state/usePaletteSummary.ts';
import { Field, NumberInput } from './Field.tsx';

/** Colours the "from an image" palette keeps (a palette strip of up to 32 colours comes back exactly). */
const FROM_IMAGE_COLORS = 32;

export function Swatches({ colors, label }: { colors: RGBA8[]; label: string }) {
  return (
    <ul className="pal" aria-label={label}>
      {colors.map((c, i) => (
        <li key={i} title={rgbaToHex(c)} style={{ background: rgbaToHex(c) }} />
      ))}
    </ul>
  );
}

const valueOf = (p: PaletteChoice): string => (p.kind === 'preset' ? `preset:${p.id}` : p.kind);

/** Shared palette picker: used in the Colours fold of Sprites and in the Kit tab (the same setting). */
export function PaletteField() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const g = state.global;
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (palette: PaletteChoice, maxColors?: number) => dispatch({ type: 'global/patch', patch: { palette, ...(maxColors ? { maxColors } : {}) } });

  if (g.mode === 'cartoon') return <p className="hint">{t('palette.cartoonHint')}</p>;

  const colors = fixedPalette(g);
  const onSelect = (v: string) => {
    setError(null);
    if (v === 'original') set({ kind: 'original' });
    else if (v === 'reduce') set({ kind: 'reduce' });
    else if (v === 'image') input.current?.click();
    else set({ kind: 'preset', id: v.replace(/^preset:/, '') });
  };
  const fromFile = async (file: File) => {
    try {
      const palette = await paletteFromImage(await blobToRGBA(file), FROM_IMAGE_COLORS);
      if (!palette.length) throw new Error('empty');
      set({ kind: 'image', colors: palette, from: file.name });
    } catch {
      setError(t('palette.imageError', { name: file.name }));
    }
  };

  return (
    <div className="sub">
      <Field label={t('palette.label')}>
        <select value={valueOf(g.palette)} onChange={(e) => onSelect(e.target.value)}>
          <option value="original">{t('palette.original')}</option>
          <option value="reduce">{t('palette.reduce')}</option>
          {PALETTES.map((p) => (
            <option key={p.id} value={`preset:${p.id}`}>{p.name} ({p.colors.length})</option>
          ))}
          <option value="image">{t('palette.fromImage')}</option>
        </select>
      </Field>
      {g.palette.kind === 'reduce' && (
        <Field label={t('palette.reduceCount')} hint={t('palette.reduceHint')}>
          <NumberInput value={g.maxColors} min={2} max={64} onChange={(n) => set({ kind: 'reduce' }, n)} className="num-sm" />
        </Field>
      )}
      {colors && <Swatches colors={colors} label={t('palette.swatches')} />}
      {g.palette.kind === 'image' && (
        <p className="hint">
          {t('palette.fromImageNote', { name: g.palette.from || '…' })}{' '}
          <button type="button" className="link-btn" onClick={() => input.current?.click()}>{t('palette.pickAnother')}</button>
        </p>
      )}
      {g.palette.kind === 'original' && <p className="hint">{t('palette.originalHint')}</p>}
      {(g.palette.kind === 'preset' || g.palette.kind === 'image') && <p className="hint">{t('palette.fixedHint')}</p>}
      {error && <p className="alert" role="alert">{error}</p>}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void fromFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}

/** Note on the Tiles panels when the kit's fixed palette is also applied to them. */
export function PaletteNote({ mode }: { mode: 'pixel' | 'cartoon' }) {
  const { t } = useI18n();
  const { state } = useApp();
  const summary = usePaletteSummary();
  if (!fixedPalette(state.global, mode)) return null;
  return (
    <p className="hint">
      {t('palette.tilesNote', { name: summary(state.global) })} <a href="#/kit">{t('palette.change')}</a>
    </p>
  );
}
