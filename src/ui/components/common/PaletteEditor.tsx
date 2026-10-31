import { useRef, useState } from 'react';
import { MAX_PALETTE_COLORS, PALETTES, imageColors, parsePalette, rgbaToHex, serializeGpl, serializeHex } from '../../../core/palette/index.ts';
import { useI18n } from '../../../i18n/index.ts';
import { paletteFromImage } from '../../../worker/client.ts';
import { blobToRGBA, downloadBlob } from '../../lib/image.ts';
import { useApp } from '../../state/context.ts';
import { Field } from './Field.tsx';

/** Colours a palette taken from an image keeps (same as the "From an image" choice). */
const FROM_IMAGE_COLORS = 32;
/** Suggestions for the "+" button: the first one the palette does not have yet. */
const NEW_COLORS = ['#ff0000', '#00c000', '#0040ff', '#ffe000', '#ff00ff', '#00e0e0', '#ffffff', '#000000'];

/** The colours of the finished images, or null when there are more than the editor can hold. */
export function usedColors(images: { width: number; height: number; data: Uint8ClampedArray }[]): string[] | null {
  const counts = new Map<string, number>();
  for (const img of images) {
    const found = imageColors(img, MAX_PALETTE_COLORS + 1);
    if (found.length > MAX_PALETTE_COLORS) return null;
    for (const { color, count } of found) {
      const hex = rgbaToHex(color);
      counts.set(hex, (counts.get(hex) ?? 0) + count);
    }
  }
  if (counts.size > MAX_PALETTE_COLORS) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([hex]) => hex);
}

/**
 * Editor of the user's own palette (`GlobalSettings.customColors`): swatches you click to change, add and remove,
 * a starting point to copy from, pasted codes, and .hex / .gpl / .txt files in and out.
 */
export function PaletteEditor() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const colors = state.global.customColors;
  const imageInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [pasting, setPasting] = useState(false);
  const [text, setText] = useState('');
  const [note, setNote] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  const setColors = (next: string[]) => dispatch({ type: 'global/patch', patch: { customColors: next.slice(0, MAX_PALETTE_COLORS) } });
  /** Replace the palette with imported colours and say what was left out. */
  const replace = (parsed: { colors: string[]; skipped: number }, emptyMessage: string) => {
    if (!parsed.colors.length) return setNote({ kind: 'error', text: emptyMessage });
    setColors(parsed.colors);
    setNote(parsed.skipped ? { kind: 'info', text: t('palette.skipped', { n: parsed.skipped }) } : null);
  };

  const startFrom = async (v: string) => {
    setNote(null);
    if (v === 'image') return imageInput.current?.click();
    if (v === 'images') {
      const images = Object.values(state.run.results).map((r) => r.sheet.image);
      if (!images.length) return setNote({ kind: 'error', text: t('palette.imagesNone') });
      const used = usedColors(images);
      if (!used) return setNote({ kind: 'error', text: t('palette.imagesTooMany') });
      return setColors(used);
    }
    const preset = PALETTES.find((p) => `preset:${p.id}` === v);
    if (preset) setColors(preset.colors.map(rgbaToHex));
  };
  const fromImage = async (file: File) => {
    try {
      const palette = await paletteFromImage(await blobToRGBA(file), FROM_IMAGE_COLORS);
      if (!palette.length) throw new Error('empty');
      setColors(palette.map(rgbaToHex));
      setNote(null);
    } catch {
      setNote({ kind: 'error', text: t('palette.imageError', { name: file.name }) });
    }
  };
  const fromFile = async (file: File) => replace(parsePalette(await file.text(), file.name), t('palette.importError', { name: file.name }));
  const exportAs = (ext: 'hex' | 'gpl') => {
    const body = ext === 'hex' ? serializeHex(colors) : serializeGpl(colors, 'align-sprites');
    downloadBlob(new Blob([body], { type: 'text/plain' }), `palette.${ext}`);
  };

  const full = colors.length >= MAX_PALETTE_COLORS;
  return (
    <div className="sub">
      <ul className="pal pal-edit pal-custom" aria-label={t('palette.swatches')}>
        {colors.map((hex, i) => (
          <li key={i}>
            <input
              type="color"
              value={hex}
              aria-label={t('palette.edit', { color: hex })}
              title={hex}
              onChange={(e) => setColors(colors.map((c, j) => (j === i ? e.target.value : c)))}
            />
            <button type="button" className="pal-x" aria-label={t('palette.remove', { color: hex })} title={t('palette.remove', { color: hex })} onClick={() => setColors(colors.filter((_, j) => j !== i))}>×</button>
          </li>
        ))}
        <li>
          <button
            type="button"
            className="btn btn-icon pal-add"
            aria-label={t('palette.add')}
            title={t('palette.add')}
            disabled={full}
            onClick={() => setColors([...colors, NEW_COLORS.find((c) => !colors.includes(c)) ?? '#808080'])}
          >
            +
          </button>
        </li>
      </ul>
      <p className="hint">{colors.length ? t('palette.customHint') : t('palette.customEmpty')} {t('palette.count', { n: colors.length, max: MAX_PALETTE_COLORS })}</p>
      <Field label={t('palette.startFrom')}>
        <select value="" onChange={(e) => void startFrom(e.target.value)}>
          <option value="" disabled>…</option>
          {PALETTES.map((p) => (
            <option key={p.id} value={`preset:${p.id}`}>{p.name} ({p.colors.length})</option>
          ))}
          <option value="images">{t('palette.startImages')}</option>
          <option value="image">{t('palette.fromImage')}</option>
        </select>
      </Field>
      <div className="row wrap">
        <button type="button" className="btn btn-sm" aria-expanded={pasting} onClick={() => setPasting(!pasting)}>{t('palette.paste')}</button>
        <button type="button" className="btn btn-sm" onClick={() => fileInput.current?.click()}>{t('palette.import')}</button>
        <button type="button" className="btn btn-sm" disabled={!colors.length} onClick={() => exportAs('hex')}>{t('palette.exportHex')}</button>
        <button type="button" className="btn btn-sm" disabled={!colors.length} onClick={() => exportAs('gpl')}>{t('palette.exportGpl')}</button>
      </div>
      {pasting && (
        <div className="sub">
          <Field label={t('palette.pasteLabel')}>
            <textarea rows={4} value={text} spellCheck={false} placeholder={'#1a1c2c\n#5d275d\n#b13e53'} onChange={(e) => setText(e.target.value)} />
          </Field>
          <div className="row wrap">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={!text.trim()}
              onClick={() => {
                const parsed = parsePalette(text);
                replace(parsed, t('palette.pasteEmpty'));
                if (parsed.colors.length) {
                  setText('');
                  setPasting(false);
                }
              }}
            >
              {t('palette.pasteUse')}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPasting(false)}>{t('palette.cancel')}</button>
          </div>
        </div>
      )}
      {note && <p className={note.kind === 'error' ? 'alert' : 'hint'} role={note.kind === 'error' ? 'alert' : 'status'}>{note.text}</p>}
      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void fromImage(f);
          e.target.value = '';
        }}
      />
      <input
        ref={fileInput}
        type="file"
        accept=".hex,.gpl,.txt,text/plain"
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
