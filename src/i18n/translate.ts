// Pure i18n helpers (no DOM, no React): shared by the provider and the tests.
export type Lang = 'en' | 'es';
export const LANGS: readonly Lang[] = ['en', 'es'];

export type Params = Record<string, string | number>;

/** Replace `{name}` placeholders; unknown placeholders are left untouched. */
export function interpolate(message: string, params?: Params): string {
  if (!params) return message;
  return message.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

/** Pick the first supported language of a navigator.languages-like list (default 'en'). */
export function pickLang(candidates: readonly string[]): Lang {
  for (const c of candidates) {
    const base = c.toLowerCase().split('-')[0];
    if (base === 'en' || base === 'es') return base;
  }
  return 'en';
}
