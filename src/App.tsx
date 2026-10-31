import { useEffect } from 'react';
import { I18nProvider } from './i18n/index.ts';
import { GuideTab } from './ui/components/guide/GuideTab.tsx';
import { Footer } from './ui/components/layout/Footer.tsx';
import { Header } from './ui/components/layout/Header.tsx';
import { PromptsTab } from './ui/components/prompts/PromptsTab.tsx';
import { SpritesTab } from './ui/components/sprites/SpritesTab.tsx';
import { TilesTab } from './ui/components/tiles/TilesTab.tsx';
import { useRoute } from './ui/route.ts';
import { AppProvider } from './ui/state/AppProvider.tsx';
import { Processor } from './ui/state/Processor.tsx';

function Pages() {
  const { tab, section } = useRoute();

  // Default route, and start each page at the top (the guide handles its own section scrolling).
  useEffect(() => {
    if (!location.hash) history.replaceState(null, '', '#/sprites');
  }, []);
  useEffect(() => {
    if (tab !== 'guide' || !section) window.scrollTo(0, 0);
  }, [tab, section]);

  return (
    <main className="page" id={`panel-${tab}`}>
      {tab === 'sprites' && <SpritesTab />}
      {tab === 'tiles' && <TilesTab />}
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
