import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Warning } from '../core/types.ts';
import { en, type MessageKey } from './en.ts';
import { es } from './es.ts';
import { I18nContext } from './context.ts';
import { interpolate, pickLang, type Lang, type Params } from './translate.ts';

const STORAGE_KEY = 'align-sprites.lang';
const TABLES: Record<Lang, Record<MessageKey, string>> = { en, es };

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'es') return saved;
  } catch {
    // storage may be unavailable (private mode)
  }
  return pickLang(navigator.languages?.length ? navigator.languages : [navigator.language]);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = TABLES[lang]['app.title'];
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(() => {
    const t = (key: MessageKey, params?: Params) => interpolate(TABLES[lang][key], params);
    /** Translate a core warning; unknown keys fall back to the raw key so nothing is hidden. */
    const tw = (w: Warning) => {
      const table = TABLES[lang] as Record<string, string>;
      const msg = table[w.key];
      return msg ? interpolate(msg, w.params) : `${w.key}${w.params ? ` ${JSON.stringify(w.params)}` : ''}`;
    };
    return { lang, setLang, t, tw };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
