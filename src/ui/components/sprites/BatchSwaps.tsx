import { useState } from 'react';
import { PALETTES, mergeColorMaps, paletteSwapMap, rgbaToHex } from '../../../core/palette/index.ts';
import { useI18n } from '../../../i18n/index.ts';
import { Field } from '../common/Field.tsx';
import { useApp } from '../../state/context.ts';
import { cloneAsset } from '../../state/defaults.ts';
import { fixedPalette } from '../../state/jobs.ts';
import type { Asset } from '../../state/types.ts';

/** '_red' ending of a variant name: letters, digits, '_' and '-' only (names become file names). */
function cleanSuffix(text: string, fallback: string): string {
  return text.trim().replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^[-_]+|[-_]+$/g, '') || fallback;
}

/** `<name>_<suffix>`, with a number when that name is taken. */
function uniqueName(base: string, taken: Set<string>): string {
  let name = base, n = 1;
  while (taken.has(name)) name = `${base}_${++n}`;
  taken.add(name);
  return name;
}

/**
 * The colour swap of the selected image (or a palette-to-palette swap) for the whole batch: apply it to every image,
 * or duplicate every image as a colour variant. Swaps are maps from colours, so an image that lacks a colour is unharmed.
 */
export function BatchSwaps({ asset }: { asset: Asset }) {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const g = state.global;
  const [source, setSource] = useState('swap');
  const [suffix, setSuffix] = useState('');
  const [done, setDone] = useState<string | null>(null);

  // Palette swaps pair colours in order, so only palettes with as many colours as the current one are offered.
  const current = fixedPalette(g)?.map(rgbaToHex);
  const targets: { value: string; name: string; colors: string[] }[] = [];
  if (current) {
    for (const p of PALETTES) {
      if (g.palette.kind === 'preset' && g.palette.id === p.id) continue;
      if (p.colors.length === current.length) targets.push({ value: `preset:${p.id}`, name: p.name, colors: p.colors.map(rgbaToHex) });
    }
    if (g.palette.kind !== 'custom' && g.customColors.length === current.length) {
      targets.push({ value: 'custom', name: t('palette.customShort'), colors: g.customColors });
    }
  }
  const target = targets.find((x) => x.value === source);
  const swap = target && current ? paletteSwapMap(current, target.colors) : asset.colorMap;
  const empty = Object.keys(swap).length === 0;
  const batch = state.assets.length > 1;
  if (!batch && !targets.length) return null;

  const apply = () => {
    for (const a of state.assets) dispatch({ type: 'asset/patch', id: a.id, patch: { colorMap: mergeColorMaps(a.colorMap, swap) } });
    setDone(t('batch.done', { n: state.assets.length }));
  };
  const duplicateAll = () => {
    const word = cleanSuffix(suffix, t('variant.word'));
    const taken = new Set(state.assets.map((a) => a.name));
    const copies = state.assets.map((a) => {
      const copy = cloneAsset(a, uniqueName(`${a.name}_${word}`, taken));
      return { ...copy, colorMap: mergeColorMaps(a.colorMap, swap) };
    });
    dispatch({ type: 'asset/add', assets: copies });
    // The swap moves to the copies: the originals keep their colours.
    if (!target) dispatch({ type: 'asset/patch', id: asset.id, patch: { colorMap: {} } });
    setDone(t('batch.done', { n: copies.length }));
  };

  return (
    <div className="sub batch-swaps">
      <p className="field-label">{t('batch.title')}</p>
      <p className="hint">{t('batch.hint')}</p>
      {targets.length > 0 && (
        <Field label={t('batch.source')} hint={t('batch.sourceHint')}>
          <select value={target ? source : 'swap'} onChange={(e) => { setSource(e.target.value); setDone(null); }}>
            <option value="swap">{t('batch.sourceSwap')}</option>
            {targets.map((x) => (
              <option key={x.value} value={x.value}>{t('batch.sourcePalette', { name: x.name })}</option>
            ))}
          </select>
        </Field>
      )}
      <Field label={t('batch.suffix')} hint={t('batch.suffixHint', { word: cleanSuffix(suffix, t('variant.word')) })}>
        <input type="text" value={suffix} placeholder={t('variant.word')} maxLength={24} onChange={(e) => setSuffix(e.target.value)} />
      </Field>
      <div className="row wrap">
        <button type="button" className="btn btn-sm" disabled={empty || (!batch && !target)} onClick={apply}>{t('batch.apply')}</button>
        <button type="button" className="btn btn-sm" disabled={empty} onClick={duplicateAll}>{t('batch.duplicate')}</button>
      </div>
      {empty && <p className="hint">{t('batch.empty')}</p>}
      {done && <p className="hint" role="status">{done}</p>}
    </div>
  );
}
