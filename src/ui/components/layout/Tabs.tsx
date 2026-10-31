import { useI18n } from '../../../i18n/index.ts';
import { cx } from '../../cx.ts';
import { useApp } from '../../state/context.ts';
import type { TabId } from '../../state/types.ts';

const TABS: TabId[] = ['sprites', 'prompts', 'tiles'];

export function Tabs() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  return (
    <div className="tabs" role="tablist" aria-label={t('tabs.label')}>
      {TABS.map((id) => (
        <button
          key={id}
          type="button"
          role="tab"
          id={`tab-${id}`}
          aria-selected={state.tab === id}
          aria-controls={`panel-${id}`}
          className={cx('tab', state.tab === id && 'is-on')}
          onClick={() => dispatch({ type: 'tab', tab: id })}
        >
          {t(`tabs.${id}`)}
        </button>
      ))}
    </div>
  );
}
