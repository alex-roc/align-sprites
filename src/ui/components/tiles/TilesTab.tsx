import { useI18n } from '../../../i18n/index.ts';

/** Placeholder: the tile atlas / terrain transition tools arrive in phase 2. */
export function TilesTab() {
  const { t } = useI18n();
  return (
    <section className="step">
      <header className="step-head">
        <h2>{t('tiles.title')} <span className="badge">{t('tiles.soon')}</span></h2>
      </header>
      <div className="step-body">
        <p>{t('tiles.description')}</p>
      </div>
    </section>
  );
}
