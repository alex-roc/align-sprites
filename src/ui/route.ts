// Hash routing: #/sprites, #/tiles, #/ai, #/guide, #/guide/<section>. Back/forward work for free.
import { useMemo, useSyncExternalStore } from 'react';

export type TabId = 'sprites' | 'tiles' | 'ai' | 'guide';
export const TABS: readonly TabId[] = ['sprites', 'tiles', 'ai', 'guide'];

export interface Route {
  tab: TabId;
  section?: string;
}

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const tab = TABS.find((t) => t === parts[0]) ?? 'sprites';
  return { tab, section: tab === 'guide' ? parts[1] : undefined };
}

export const hrefFor = (tab: TabId, section?: string): string => `#/${tab}${section ? `/${section}` : ''}`;

export function navigate(tab: TabId, section?: string): void {
  location.hash = hrefFor(tab, section);
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => location.hash);
  return useMemo(() => parseHash(hash), [hash]);
}
