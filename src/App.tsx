import { I18nProvider } from './i18n/index.ts';
import { Footer } from './ui/components/layout/Footer.tsx';
import { Header } from './ui/components/layout/Header.tsx';
import { Tabs } from './ui/components/layout/Tabs.tsx';
import { PromptsTab } from './ui/components/prompts/PromptsTab.tsx';
import { SpritesTab } from './ui/components/sprites/SpritesTab.tsx';
import { TilesTab } from './ui/components/tiles/TilesTab.tsx';
import { AppProvider } from './ui/state/AppProvider.tsx';
import { useApp } from './ui/state/context.ts';
import { Processor } from './ui/state/Processor.tsx';

function Panels() {
  const { state } = useApp();
  return (
    <main className="panel" id={`panel-${state.tab}`} role="tabpanel" aria-labelledby={`tab-${state.tab}`}>
      {state.tab === 'sprites' && <SpritesTab />}
      {state.tab === 'prompts' && <PromptsTab />}
      {state.tab === 'tiles' && <TilesTab />}
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
          <Tabs />
          <Panels />
          <Footer />
        </div>
      </AppProvider>
    </I18nProvider>
  );
}
