import { useState, useEffect } from 'react';
import { ApiProvider } from './context/ApiContext';
import CreateSticker from './components/CreateSticker';
import Presentations from './components/Presentations';
import Merchandising from './components/Merchandising';
import ImageEditor from './components/ImageEditor';
import MusicGenerator from './components/MusicGenerator';
import VoiceClone from './components/VoiceClone';
import Settings from './components/Settings';
import { Sparkles, Presentation, Shirt, Palette, Music, Mic, KeyRound, CheckCircle2 } from 'lucide-react';

type Tab = 'create' | 'presentations' | 'merchandising' | 'editor' | 'music' | 'voice';

export default function WrappedApp() {
  return (
    <ApiProvider>
      <App />
    </ApiProvider>
  );
}

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('create');
  const [sharedBase64, setSharedBase64] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const tabs = [
    { id: 'create' as Tab, label: 'Crear Sticker', icon: Sparkles },
    { id: 'presentations' as Tab, label: 'Presentaciones', icon: Presentation },
    { id: 'merchandising' as Tab, label: 'Merchandising', icon: Shirt },
    { id: 'editor' as Tab, label: 'Editor', icon: Palette },
    { id: 'music' as Tab, label: 'Música AI', icon: Music },
    { id: 'voice' as Tab, label: 'Voice Clone', icon: Mic },
  ];

  const switchToEditor = () => {
    setActiveTab('editor');
  };

  return (
    <div className="min-h-screen pattern-bg flex flex-col items-center">
      <header className="w-full bg-paper editorial-border-bottom p-6 md:p-8 flex flex-col md:flex-row justify-between items-baseline mb-8">
        <div>
          <div className="font-serif italic text-4xl md:text-5xl font-black tracking-tighter text-ink">
            REBKA
          </div>
          <div className="text-[11px] uppercase tracking-[2px] font-bold text-dim mt-1">
            Creative Suite / 2026
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent"></div>
            <span className="text-[10px] uppercase tracking-[2px] font-bold">
              by Eleonor
            </span>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors border border-ink"
            title="Configurar API Keys"
          >
            <KeyRound className="w-3 h-3 text-ink" />
          </button>
        </div>
      </header>

      <div className="flex w-full max-w-4xl px-4 gap-2 mb-8 flex-wrap md:flex-nowrap">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 text-center font-bold text-sm tracking-[1px] uppercase transition-all editorial-border min-w-[140px] ${
                activeTab === tab.id
                  ? 'bg-ink text-white shadow-[4px_4px_0_#FF6B9D]'
                  : 'bg-white text-ink hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5 mx-auto mb-1" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="w-full flex-grow flex flex-col justify-start">
        {activeTab === 'create' && (
          <CreateSticker onStickerGenerated={(base64) => setSharedBase64(base64)} />
        )}
        {activeTab === 'presentations' && <Presentations />}
        {activeTab === 'merchandising' && <Merchandising />}
        {activeTab === 'editor' && <ImageEditor />}
        {activeTab === 'music' && <MusicGenerator />}
        {activeTab === 'voice' && <VoiceClone />}
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div className="max-h-[90vh] overflow-auto w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <Settings onClose={() => setShowSettings(false)} />
          </div>
        </div>
      )}

      {sharedBase64 && activeTab === 'create' && (
        <button
          onClick={switchToEditor}
          className="btn-editorial fixed bottom-6 right-6 px-6 py-4 flex items-center gap-2 editorial-border shadow-[10px_10px_0_rgba(0,0,0,0.1)] z-50 animate-bounce"
        >
          <CheckCircle2 className="w-5 h-5" /> Sticker listo! Editar imagen
        </button>
      )}

      <footer className="w-full bg-ink text-white p-6 mt-auto">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <p className="font-serif italic text-lg">REBKA</p>
            <p className="text-[10px] uppercase tracking-[2px] opacity-60">
              Transformando ideas en experiencias
            </p>
          </div>
          <div className="text-[10px] uppercase tracking-[1px] opacity-60">
            Creado con 💜 por Eleonor
          </div>
        </div>
      </footer>
    </div>
  );
}