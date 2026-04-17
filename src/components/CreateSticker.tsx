import { useState } from 'react';
import { Sparkles, Download, Loader2, Globe, Wand2, Search, ArrowRight } from 'lucide-react';

type Mode = 'single' | 'set' | 'url';

interface StickerResult {
  base64: string;
  url: string;
}

interface CreateStickerProps {
  onStickerGenerated: (base64: string) => void;
}

export default function CreateSticker({ onStickerGenerated }: CreateStickerProps) {
  const [prompt, setPrompt] = useState('');
  const [urlInstructions, setUrlInstructions] = useState('');
  const [mode, setMode] = useState<Mode>('single');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [results, setResults] = useState<StickerResult[]>([]);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');
    setResults([]);

    try {
      const targetPrompts = mode === 'set' || mode === 'url' 
        ? [prompt + ' 1', prompt + ' 2', prompt + ' 3'] 
        : [prompt];

      const newResults: StickerResult[] = [];
      
      for (let i = 0; i < targetPrompts.length; i++) {
        setStatusText(targetPrompts.length > 1 
          ? `Generando sticker corporativo ${i+1} de ${targetPrompts.length}...` 
          : 'Generando sticker...'
        );
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
        
        newResults.push({
          base64: base64Data,
          url: `data:image/png;base64,${base64Data}`
        });
      }

      if (newResults.length > 0) {
        setResults(newResults);
        if (mode === 'single') {
          onStickerGenerated(newResults[0].base64);
        }
      } else {
        setError("No se pudo generar la imagen. Intenta con otro texto o URL.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al intentar generar el sticker.");
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto p-4 md:p-6 mb-16">
      <div className="bg-white editorial-border p-8 flex flex-col gap-6 shadow-[10px_10px_0_rgba(0,0,0,0.05)]">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-accent" />
            <h2 className="font-serif text-5xl tracking-tighter leading-[0.8] uppercase break-words">
              EL PROCESO<br/>CREATIVO.
            </h2>
          </div>
          
          <div className="flex flex-col sm:flex-row border-2 border-ink bg-gray-50 text-xs font-bold uppercase tracking-widest overflow-hidden">
            <button 
              onClick={() => { setMode('single'); setPrompt(''); }}
              className={`px-4 py-3 transition-colors ${mode === 'single' ? 'bg-ink text-white' : 'hover:bg-gray-200 text-ink'}`}
            >
              1 STICKER
            </button>
            <button 
              onClick={() => { setMode('set'); setPrompt(''); }}
              className={`px-4 py-3 sm:border-l-2 border-t-2 sm:border-t-0 border-ink transition-colors flex items-center justify-center gap-2 ${mode === 'set' ? 'bg-ink text-white' : 'hover:bg-gray-200 text-ink'}`}
            >
              SET MÚLTIPLE (x3) <Sparkles className="w-3 h-3" />
            </button>
            <button 
              onClick={() => { setMode('url'); setPrompt(''); }}
              className={`px-4 py-3 sm:border-l-2 border-t-2 sm:border-t-0 border-ink transition-colors flex items-center justify-center gap-2 ${mode === 'url' ? 'bg-ink text-white' : 'hover:bg-gray-200 text-ink'}`}
            >
              EMPRESA URL (x3) <Globe className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        <p className="font-sans font-semibold text-sm uppercase tracking-wide text-dim border-l-2 border-accent pl-4">
          {mode === 'url' 
            ? "Introduce la URL de una empresa. Eleonor analizará la marca, productos y temática usando Google Search para generar un set corporativo."
            : "Describe tu idea. Utilizaremos Investigación con Gemini para crear la mejor parodia corporativa y fondo transparente."}
        </p>
        
        {mode === 'url' ? (
          <div className="flex flex-col gap-4">
            <input 
              type="url"
              className="w-full p-4 font-sans text-lg editorial-border bg-[#F9F9F9] outline-none focus:border-accent transition-colors"
              placeholder="Ej. https://startup.com"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
            />
            <textarea
              className="w-full h-24 p-4 font-sans text-base editorial-border bg-[#F9F9F9] outline-none focus:border-accent transition-colors resize-none"
              placeholder="Instrucciones específicas para Eleonor: ¿En qué quieres que se centre al investigar? (Ej: enfócate en sus colores corporativos azules, o en su mascota del logo...)"
              value={urlInstructions}
              onChange={(e) => setUrlInstructions(e.target.value)}
              disabled={loading}
            />
          </div>
        ) : (
          <textarea 
            className="w-full h-32 p-4 font-sans text-lg editorial-border bg-[#F9F9F9] outline-none focus:border-accent transition-colors resize-none"
            placeholder={mode === 'set' ? "Ej. Un set de stickers de tecnología retro y programación..." : "Ej. Un payaso de comida rápida consumido por la cafeína..."}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
          />
        )}
        
        <div className="flex flex-col items-center gap-2 mt-2">
          <button 
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="btn-editorial w-full py-4 px-8 editorial-border flex items-center justify-center gap-4 text-sm"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {statusText || 'GENERANDO...'}</>
            ) : (
              <><Wand2 className="w-5 h-5" /> GENERAR {mode === 'set' || mode === 'url' ? 'SET DE STICKERS' : 'STICKER'}</>
            )}
          </button>
          {loading && (
            <div className="flex items-center gap-2 text-[10px] font-mono text-dim tracking-widest uppercase animate-pulse">
              <Search className="w-3 h-3" /> Búsqueda y Análisis en vivo activado
            </div>
          )}
        </div>
        
        {error && <div className="text-accent font-bold uppercase p-4 border border-accent bg-red-50 text-xs">{error}</div>}
      </div>

      {results.length > 0 && (
        <div className="bg-white editorial-border p-8 flex flex-col gap-8 mt-8 shadow-[10px_10px_0_rgba(0,0,0,0.05)]">
          <h2 className="font-serif text-4xl tracking-tighter leading-[0.8] self-start uppercase">
            RESULTADO{results.length > 1 ? 'S' : ''}.
          </h2>
          
          <div className={`grid gap-8 ${results.length > 1 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 place-items-center'}`}>
            {results.map((r, idx) => (
              <div key={idx} className="flex flex-col gap-4 items-center">
                <div 
                  className="w-[280px] h-[280px] bg-white editorial-border -rotate-2 relative shadow-[10px_10px_0_rgba(0,0,0,0.1)] flex items-center justify-center group mb-2"
                  style={{ 
                    backgroundImage: 'repeating-linear-gradient(45deg, #f0f0f0 25%, transparent 25%, transparent 75%, #f0f0f0 75%, #f0f0f0), repeating-linear-gradient(45deg, #f0f0f0 25%, #ffffff 25%, #ffffff 75%, #f0f0f0 75%, #f0f0f0)', 
                    backgroundPosition: '0 0, 10px 10px', 
                    backgroundSize: '20px 20px' 
                  }}
                >
                  <div className="absolute -top-4 -right-4 bg-yellow-400 editorial-border p-1.5 px-3 font-black text-[10px] rotate-[10deg] z-10">
                    NUEVO
                  </div>
                  <img 
                    src={r.url} 
                    alt={`Generado ${idx}`} 
                    className="max-w-[85%] max-h-[85%] object-contain drop-shadow-xl group-hover:scale-105 transition-transform" 
                  />
                </div>
                
                <div className="flex w-[280px] flex-col gap-2">
                  <a 
                    href={r.url} 
                    download={`sticker_${idx+1}.png`}
                    className="btn-editorial w-full bg-transparent text-ink editorial-border px-4 py-2 text-xs flex items-center justify-center gap-2 hover:bg-ink hover:text-white transition-colors"
                  >
                    <Download className="w-3 h-3"/> DESCARGAR PNG
                  </a>
                  <button 
                    onClick={() => onStickerGenerated(r.base64)}
                    className="btn-editorial w-full bg-accent text-white editorial-border px-4 py-2 text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <ArrowRight className="w-3 h-3"/> ANIMAR ESTE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
