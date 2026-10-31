import { useI18n } from '../../../i18n/index.ts';
import { REPO_URL } from './Header.tsx';

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="app-footer">
      <span>{t('footer.license')}</span>
      <span className="footer-links">
        <a href={REPO_URL} target="_blank" rel="noreferrer">GitHub</a>
        <span>
          {t('footer.by')}{' '}
          <a href="https://labtecnosocial.org" target="_blank" rel="noreferrer">Alex Ojeda Copa, Lab TecnoSocial</a>
        </span>
      </span>
    </footer>
  );
}
