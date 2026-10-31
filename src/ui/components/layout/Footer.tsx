import { useI18n } from '../../../i18n/index.ts';

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="app-footer">
      <span>{t('footer.license')}</span>
      <span>
        {t('footer.by')}{' '}
        <a href="https://labtecnosocial.org" target="_blank" rel="noreferrer">Alex Ojeda Copa · Lab TecnoSocial</a>
      </span>
    </footer>
  );
}
