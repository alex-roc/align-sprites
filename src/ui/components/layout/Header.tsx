import { useEffect, useState } from 'react';
import { LANGS } from '../../../i18n/translate.ts';
import { useI18n } from '../../../i18n/index.ts';
import { cx } from '../../cx.ts';
import { hrefFor, TABS, useRoute } from '../../route.ts';
import { applyTheme, loadTheme, saveTheme, type ThemeChoice } from '../../theme.ts';

export const REPO_URL = 'https://github.com/alex-roc/align-sprites';

const NEXT_THEME: Record<ThemeChoice, ThemeChoice> = { system: 'light', light: 'dark', dark: 'system' };

function ThemeIcon({ theme }: { theme: ThemeChoice }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;
  if (theme === 'light')
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  if (theme === 'dark')
    return (
      <svg {...common}>
        <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor" />
    </svg>
  );
}

function ThemeToggle() {
  const { t } = useI18n();
  const [theme, setTheme] = useState<ThemeChoice>(loadTheme);
  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);
  const label = `${t('theme.label')}: ${t(`theme.${theme}`)}`;
  return (
    <button type="button" className="icon-btn" onClick={() => setTheme(NEXT_THEME[theme])} title={label} aria-label={label}>
      <ThemeIcon theme={theme} />
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
  const { t } = useI18n();
  const { tab } = useRoute();
  return (
    <header className="topbar">
      <div className="topbar-in">
        <a className="wordmark" href={hrefFor('sprites')} aria-label="align-sprites">
          <span className="logo" aria-hidden="true">
            <i /><i /><i />
          </span>
          <span className="wordmark-text">align-sprites</span>
        </a>
        <nav className="nav" aria-label={t('nav.label')}>
          {TABS.map((id) => (
            <a key={id} href={hrefFor(id)} className={cx('nav-link', id === tab && 'is-on')} aria-current={id === tab ? 'page' : undefined}>
              {t(`nav.${id}`)}
            </a>
          ))}
        </nav>
        <div className="topbar-tools">
          <LangSwitch />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
