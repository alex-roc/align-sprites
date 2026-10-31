// Theme preference: 'system' follows prefers-color-scheme; light/dark force it via <html data-theme>.
export type ThemeChoice = 'system' | 'light' | 'dark';

const KEY = 'align-sprites.theme';

export function loadTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    // storage may be unavailable (private mode)
  }
  return 'system';
}

export function applyTheme(choice: ThemeChoice): void {
  if (choice === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = choice;
}

export function saveTheme(choice: ThemeChoice): void {
  try {
    if (choice === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // ignore
  }
}
