import { useI18n } from '../../../i18n/index.ts';
import { cx } from '../../cx.ts';
import { useApp } from '../../state/context.ts';
import type { AssetKind } from '../../state/types.ts';
import { RgbaCanvas } from '../common/RgbaCanvas.tsx';

export function AssetList() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  return (
    <ul className="assets" aria-label={t('assets.label')}>
      {state.assets.map((a) => {
        const selected = a.id === state.selectedId;
        return (
          <li key={a.id} className={cx('asset', selected && 'is-selected')}>
            <button
              type="button"
              className="asset-thumb"
              aria-pressed={selected}
              title={t('assets.select')}
              onClick={() => dispatch({ type: 'asset/select', id: a.id })}
            >
              <RgbaCanvas image={a.image} pixelated={state.global.mode === 'pixel'} label={a.fileName} />
            </button>
            <div className="asset-fields">
              <label className="field">
                <span className="field-label">{t('assets.name')}</span>
                <input type="text" value={a.name} onChange={(e) => dispatch({ type: 'asset/patch', id: a.id, patch: { name: e.target.value } })} />
              </label>
              <label className="field">
                <span className="field-label">{t('assets.kind')}</span>
                <select value={a.kind} onChange={(e) => dispatch({ type: 'asset/patch', id: a.id, patch: { kind: e.target.value as AssetKind } })}>
                  <option value="sheet">{t('assets.kind.sheet')}</option>
                  <option value="single">{t('assets.kind.single')}</option>
                </select>
              </label>
              <span className="muted asset-dims">{a.image.width}×{a.image.height}</span>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: 'asset/remove', id: a.id })}>
              {t('assets.remove')}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
