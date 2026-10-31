import { useRef } from 'react';
import { useI18n } from '../../../i18n/index.ts';
import { cx } from '../../cx.ts';
import { useApp } from '../../state/context.ts';
import type { AssetKind } from '../../state/types.ts';
import { RgbaCanvas } from '../common/RgbaCanvas.tsx';

/** Strip of the loaded images: pick one to edit, rename it inline, set its type, remove it, add more. */
export function AssetBar({ onFiles }: { onFiles: (files: File[]) => void }) {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="assetbar" role="group" aria-label={t('assets.label')}>
      <ul>
        {state.assets.map((a) => {
          const selected = a.id === state.selectedId;
          return (
            <li key={a.id} className={cx('asset', selected && 'is-selected')}>
              <button type="button" className="asset-thumb" aria-pressed={selected} aria-label={t('assets.select', { name: a.name })} onClick={() => dispatch({ type: 'asset/select', id: a.id })}>
                <RgbaCanvas image={a.image} pixelated={state.global.mode === 'pixel'} />
              </button>
              <div className="asset-meta">
                <input
                  className="asset-name"
                  type="text"
                  value={a.name}
                  aria-label={t('assets.name')}
                  onFocus={() => dispatch({ type: 'asset/select', id: a.id })}
                  onChange={(e) => dispatch({ type: 'asset/patch', id: a.id, patch: { name: e.target.value } })}
                />
                <select
                  className="asset-kind"
                  value={a.kind}
                  aria-label={t('assets.kind')}
                  onChange={(e) => dispatch({ type: 'asset/patch', id: a.id, patch: { kind: e.target.value as AssetKind } })}
                >
                  <option value="sheet">{t('assets.kind.sheet')}</option>
                  <option value="single">{t('assets.kind.single')}</option>
                </select>
              </div>
              <button type="button" className="icon-btn icon-btn-sm" onClick={() => dispatch({ type: 'asset/remove', id: a.id })} aria-label={t('assets.remove', { name: a.name })} title={t('assets.removeTitle')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="btn" onClick={() => input.current?.click()}>{t('assets.add')}</button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          onFiles([...(e.target.files ?? [])]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
