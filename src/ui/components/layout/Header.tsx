import { useEffect, useState } from 'react';
import { LANGS } from '../../../i18n/translate.ts';
import { useI18n } from '../../../i18n/index.ts';
import { cx } from '../../cx.ts';
import { applyTheme, loadTheme, saveTheme, type ThemeChoice } from '../../theme.ts';

export const REPO_URL = 'https://github.com/alex-roc/align-sprites';
export const DOCS_URL = `${REPO_URL}/blob/main/docs/README.md`;
export const DOCS_URL_ES = `${REPO_URL}/blob/main/docs/es.md`;

const NEXT_THEME: Record<ThemeChoice, ThemeChoice> = { system: 'light', light: 'dark', dark: 'system' };

function ThemeToggle() {
  const { t } = useI18n();
  const [theme, setTheme] = useState<ThemeChoice>(loadTheme);
  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);
  const current = t(`theme.${theme}`);
  return (
    <button type="button" className="btn btn-ghost" onClick={() => setTheme(NEXT_THEME[theme])} title={t('theme.title')}>
      {t('theme.label')}: {current}
    </button>
  );
}

function LangSwitch() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="lang" role="group" aria-label={t('lang.label')}>
      {LANGS.map((l) => (
        <button key={l} type="button" className={cx('lang-btn', l === lang && 'is-on')} aria-pressed={l === lang} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function Header() {
  const { t, lang } = useI18n();
  return (
    <header className="app-header">
      <div className="brand">
        <span className="logo" aria-hidden="true">
          <i /><i /><i />
        </span>
        <div>
          <h1>align-sprites</h1>
          <p className="tagline">{t('app.tagline')}</p>
        </div>
      </div>
      <nav className="header-links" aria-label={t('header.links')}>
        <a href={lang === 'es' ? DOCS_URL_ES : DOCS_URL} target="_blank" rel="noreferrer">{t('header.guide')}</a>
        <a href={REPO_URL} target="_blank" rel="noreferrer">GitHub</a>
        <ThemeToggle />
        <LangSwitch />
      </nav>
    </header>
  );
}
