import { useEffect } from 'react';
import { I18nProvider } from './i18n/index.ts';
import { GuideTab } from './ui/components/guide/GuideTab.tsx';
import { ItemsTab } from './ui/components/items/ItemsTab.tsx';
import { Footer } from './ui/components/layout/Footer.tsx';
import { KitTab } from './ui/components/kit/KitTab.tsx';
import { Header } from './ui/components/layout/Header.tsx';
import { PromptsTab } from './ui/components/prompts/PromptsTab.tsx';
import { SpritesTab } from './ui/components/sprites/SpritesTab.tsx';
import { WorldTab } from './ui/components/world/WorldTab.tsx';
import { useRoute } from './ui/route.ts';
import { AppProvider } from './ui/state/AppProvider.tsx';
import { Processor } from './ui/state/Processor.tsx';

function Pages() {
  const { tab, section } = useRoute();

  // Default route, old #/tiles links rewritten to #/world, and each page starts at the top (the guide handles its
  // own section scrolling).
  useEffect(() => {
    if (!location.hash) history.replaceState(null, '', '#/sprites');
    else if (/^#\/?tiles\b/.test(location.hash)) history.replaceState(null, '', location.hash.replace(/^#\/?tiles/, '#/world'));
  }, []);
  useEffect(() => {
    if (tab !== 'guide' || !section) window.scrollTo(0, 0);
  }, [tab, section]);

  return (
    <main className="page" id={`panel-${tab}`}>
      {tab === 'sprites' && <SpritesTab />}
      {tab === 'world' && <WorldTab section={section} />}
      {tab === 'items' && <ItemsTab />}
      {tab === 'kit' && <KitTab />}
      {tab === 'ai' && <PromptsTab />}
      {tab === 'guide' && <GuideTab section={section} />}
    </main>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppProvider>
        <Processor />
        <div className="app">
          <Header />
          <Pages />
          <Footer />
        </div>
      </AppProvider>
    </I18nProvider>
  );
}
