import { useState } from 'react';
import { Sparkles, Image, Shirt, Presentation, Palette } from 'lucide-react';
import Presentations from './components/Presentations';
import Stickers from './components/Stickers';
import Merchandising from './components/Merchandising';
import ImageEditor from './components/ImageEditor';

type Tab = 'presentations' | 'stickers' | 'merchandising' | 'editor';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('presentations');

  const tabs = [
    { id: 'presentations' as Tab, label: 'Presentaciones', icon: Presentation },
    { id: 'stickers' as Tab, label: 'Stickers WhatsApp', icon: Sparkles },
    { id: 'merchandising' as Tab, label: 'Merchandising', icon: Shirt },
    { id: 'editor' as Tab, label: 'Editor', icon: Palette },
  ];

  return (
    <div className="min-h-screen pattern-bg">
      {/* Header */}
      <header className="w-full bg-paper editorial-border-bottom p-6 md:p-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-baseline">
          <div>
            <h1 className="font-serif italic text-4xl md:text-5xl font-black tracking-tighter text-ink">
              REBKA
            </h1>
            <p className="text-xs uppercase tracking-[3px] font-bold text-dim mt-1">
              Creative Suite / 2026
            </p>
          </div>
          <div className="flex items-center gap-2 mt-4 md:mt-0">
            <div className="w-3 h-3 rounded-full bg-accent"></div>
            <span className="text-[10px] uppercase tracking-[2px] font-bold">
              by Rebeca Caparrós
            </span>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex flex-col items-center gap-2 p-4 md:p-6
                  editorial-border transition-all duration-200
                  ${activeTab === tab.id
                    ? 'bg-ink text-white shadow-[6px_6px_0_#FF6B9D]'
                    : 'bg-paper text-ink hover:shadow-[4px_4px_0_rgba(18,18,18,0.2)]'
                  }
                `}
              >
                <Icon className="w-6 h-6" />
                <span className="text-[10px] md:text-xs uppercase tracking-[1px] font-bold text-center">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 pb-16">
        <div className="animate-slide-in">
          {activeTab === 'presentations' && <Presentations />}
          {activeTab === 'stickers' && <Stickers />}
          {activeTab === 'merchandising' && <Merchandising />}
          {activeTab === 'editor' && <ImageEditor />}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-ink text-white p-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <p className="font-serif italic text-lg">REBKA</p>
            <p className="text-[10px] uppercase tracking-[2px] opacity-60">
              Transformando ideas en experiencias
            </p>
          </div>
          <div className="text-[10px] uppercase tracking-[1px] opacity-60">
            Creado con 💜 por Eleonor AI
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;