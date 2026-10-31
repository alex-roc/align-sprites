import { createContext, useContext } from 'react';
import type { Warning } from '../core/types.ts';
import type { MessageKey } from './en.ts';
import type { Lang, Params } from './translate.ts';

export interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: MessageKey, params?: Params) => string;
  /** Translate a core Warning ({key, params}). */
  tw: (w: Warning) => string;
}

export const I18nContext = createContext<I18nValue | null>(null);

export function useI18n(): I18nValue {
  const v = useContext(I18nContext);
  if (!v) throw new Error('useI18n outside <I18nProvider>');
  return v;
}
