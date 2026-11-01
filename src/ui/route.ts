// Hash routing on top of the pure parser in lib/routes.ts: the current route as a hook, and navigation.
import { useMemo, useSyncExternalStore } from 'react';
import { hrefFor, parseHash, type Route, type TabId } from './lib/routes.ts';

export { hrefFor, parseHash, TABS, worldTool, WORLD_TOOLS, type Route, type TabId, type WorldTool } from './lib/routes.ts';

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
