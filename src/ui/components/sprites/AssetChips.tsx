import { useI18n } from '../../../i18n/index.ts';
import { cx } from '../../cx.ts';
import { useApp } from '../../state/context.ts';

/** Quick asset switcher shown above the per-asset settings and the results (only with 2+ assets). */
export function AssetChips() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  if (state.assets.length < 2) return null;
  return (
    <div className="chips" role="group" aria-label={t('assets.label')}>
      {state.assets.map((a) => (
        <button key={a.id} type="button" className={cx('chip', a.id === state.selectedId && 'is-on')} aria-pressed={a.id === state.selectedId} onClick={() => dispatch({ type: 'asset/select', id: a.id })}>
          {a.name || a.fileName}
        </button>
      ))}
    </div>
  );
}
