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

const parseMultipleItems = (input: string): string[] | null => {
    // Detectar patrones como "3 objetos: manzana, pera, plátano" o "manzana, pera y plátano"
    const numberedMatch = input.match(/(\d+)\s*(?:objetos?|items?|stickers?|cosas?)[:\s]+(.+)/i);
    if (numberedMatch) {
      const count = parseInt(numberedMatch[1]);
      const itemsPart = numberedMatch[2];
      // Separar por comas, "y", o saltos de línea
      const items = itemsPart.split(/[,;]|\by\b|\n/).map(s => s.trim()).filter(s => s.length > 0);
      if (items.length >= 2 && items.length <= 5) {
        return items.slice(0, Math.min(count, 5)); // Máximo 5
      }
    }
    
    // Detectar lista separada por comas o "y"
    const listMatch = input.match(/^([^,]+(?:,\s*[^,]+)*(?:\s+y\s+[^,]+)?)$/);
    if (listMatch && !input.match(/^(un|una|el|la|los|las)\s/i)) {
      const items = input.split(/[,;]|\by\b/).map(s => s.trim()).filter(s => s.length > 2);
      if (items.length >= 2 && items.length <= 5) {
        return items;
      }
    }
    
    return null;
  };

// Configuración de Gemini - reemplazar con tu API key
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export default function CreateSticker({ onStickerGenerated }: CreateStickerProps) {
  const [prompt, setPrompt] = useState('');
  const [urlInstructions, setUrlInstructions] = useState('');
  const [mode, setMode] = useState<Mode>('single');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [results, setResults] = useState<StickerResult[]>([]);
  const [error, setError] = useState('');

  const generateWithGemini = async (targetPrompt: string, index: number, total: number): Promise<string | null> => {
    setStatusText(total > 1 
      ? `Generando sticker con logo y texto (${index + 1}/${total})...` 
      : 'Generando sticker corporativo en español...'
    );

    try {
      const baseInstruction = mode === 'single' 
        ? `Incorporate explicit visual references to real company logos, specific brands, or corporate mascots related to: "${targetPrompt}". The sticker MUST include catchy typography.`
        : `Subject: ${targetPrompt}`;

      const enhancedPrompt = `A die-cut WhatsApp sticker design, perfectly isolated on a completely transparent background layer (pure alpha background), 2D flat vector art style, thick clean white border around the character. NO background scenario or grid. High quality. REQUIREMENT: INTEGRATE ACTUAL REAL BRAND LOGOS, UI, OR EXACT CORPORATE REFERENCES AS INSTRUCTED. MANDATORY RULE: ALL TEXT, LETTERS, TYPOGRAPHY, OR SPEECH BUBBLES IN THE IMAGE ABSOLUTELY MUST BE WRITTEN IN PERFECT SPANISH (CASTELLANO). DO NOT USE ENGLISH TEXT.\n\n${baseInstruction}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: enhancedPrompt }]
          }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"]
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Extraer imagen base64 de la respuesta
      for (const candidate of data.candidates || []) {
        for (const part of candidate.content?.parts || []) {
          if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
            return part.inlineData.data;
          }
        }
      }
      
      return null;
    } catch (err) {
      console.error('Error generando imagen:', err);
      return null;
    }
  };

  const researchWithGemini = async (url: string, instructions: string): Promise<string[]> => {
    setStatusText('Investigando empresa con Eleonor...');
    
    try {
      const researchPrompt = `Visita e investiga profundamente la empresa en la URL: "${url}". Usa Google Search para extraer detalles precisos: formas exactas de su logotipo real, colores corporativos, UI de su producto o mascotas. ${instructions.trim() ? `\n\nATENCIÓN, EL USUARIO REQUIERE QUE TE ENFOQUES ESPECÍFICAMENTE EN ESTO AL INVESTIGAR Y CREAR: "${instructions}"\n\n` : ''}Diseña 3 conceptos creativos para stickers de WhatsApp que INCLUYAN EXPLÍCITAMENTE y de manera visible el logo real de la empresa investigada o sus elementos visuales corporativos. IMPORTANTE: Los stickers deben tener texto o frases divertidas, y TODO EL TEXTO DEBE ESTAR ESCRITO ESTRICTAMENTE EN ESPAÑOL (Castellano). Responde ESTRICTAMENTE un JSON array de 3 strings descriptivos. (Escribe el prompt visual en inglés para la IA de imagen, especificando qué logo dibujar y qué palabras exactas en español generar tipográficamente).`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: researchPrompt }]
          }],
          tools: [{ 
            google_search: {} 
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Research API Error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Intentar extraer JSON array
      try {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          return JSON.parse(match[0]);
        }
      } catch (e) {
        console.error('Error parseando JSON:', e);
      }
      
      // Fallback: dividir por líneas
      return text.split('\n').filter(line => line.trim()).slice(0, 3);
    } catch (err) {
      console.error('Error en research:', err);
      return [url + ' - concepto 1', url + ' - concepto 2', url + ' - concepto 3'];
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    if (!GEMINI_API_KEY) {
      setError("Falta configurar la API key de Gemini. Añade VITE_GEMINI_API_KEY en tu .env");
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      let targetPrompts: string[] = [prompt];

      // Detectar múltiples items en el prompt (ej: "3 objetos: manzana, pera, plátano")
      const multipleItems = parseMultipleItems(prompt);
      if (multipleItems) {
        targetPrompts = multipleItems;
      } else if (mode === 'url') {
        // Si es modo URL, investigar primero
        targetPrompts = await researchWithGemini(prompt, urlInstructions);
      } else if (mode === 'set') {
        // En modo set, expandir el prompt en 3 variaciones
        targetPrompts = [`${prompt} - variación 1`, `${prompt} - variación 2`, `${prompt} - variación 3`];
      }

      const newResults: StickerResult[] = [];
      
      for (let i = 0; i < targetPrompts.length; i++) {
        const base64Data = await generateWithGemini(targetPrompts[i], i, targetPrompts.length);
        
        if (base64Data) {
          newResults.push({
            base64: base64Data,
            url: `data:image/png;base64,${base64Data}`
          });
        }
        
        // Pequeña pausa entre generaciones
        if (i < targetPrompts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (newResults.length > 0) {
        setResults(newResults);
        if (mode === 'single') {
          onStickerGenerated(newResults[0].base64);
        }
      } else {
        setError("No se pudo generar ninguna imagen. Verifica tu API key o intenta con otro prompt.");
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
              onClick={() => { setMode('single'); setPrompt(''); setUrlInstructions(''); }}
              className={`px-4 py-3 transition-colors ${mode === 'single' ? 'bg-ink text-white' : 'hover:bg-gray-200 text-ink'}`}
            >
              1 STICKER
            </button>
            <button 
              onClick={() => { setMode('set'); setPrompt(''); setUrlInstructions(''); }}
              className={`px-4 py-3 sm:border-l-2 border-t-2 sm:border-t-0 border-ink transition-colors flex items-center justify-center gap-2 ${mode === 'set' ? 'bg-ink text-white' : 'hover:bg-gray-200 text-ink'}`}
            >
              SET MÚLTIPLE (x3) <Sparkles className="w-3 h-3" />
            </button>
            <button 
              onClick={() => { setMode('url'); setPrompt(''); setUrlInstructions(''); }}
              className={`px-4 py-3 sm:border-l-2 border-t-2 sm:border-t-0 border-ink transition-colors flex items-center justify-center gap-2 ${mode === 'url' ? 'bg-ink text-white' : 'hover:bg-gray-200 text-ink'}`}
            >
              EMPRESA URL (x3) <Globe className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        <p className="font-sans font-semibold text-sm uppercase tracking-wide text-dim border-l-2 border-accent pl-4">
          {mode === 'url' 
            ? "Introduce la URL de una empresa y en qué quieres que Eleonor se enfoque. Usaremos Google Search para analizarla."
            : "Describe tu idea. Utilizaremos Investigación con Gemini para crear la mejor parodia corporativa y fondo transparente."}
        </p>
        
        {mode === 'url' ? (
          <div className="flex flex-col gap-4">
            <input 
              type="url"
              className="w-full p-4 font-sans text-lg editorial-border bg-[#F9F9F9] outline-none focus:border-accent transition-colors"
              placeholder="URL de la empresa (Ej. https://netflix.com)"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
            />
            <textarea 
              className="w-full h-24 p-4 font-sans text-sm editorial-border bg-[#F9F9F9] outline-none focus:border-accent transition-colors resize-none"
              placeholder="Opcional: ¿Qué quieres destacar? (Ej. Fíjate en su mascota, haz un chiste de sus precios, enfócate en su nuevo producto...)"
              value={urlInstructions}
              onChange={(e) => setUrlInstructions(e.target.value)}
              disabled={loading}
            />
          </div>
        ) : (
          <textarea 
            className="w-full h-32 p-4 font-sans text-lg editorial-border bg-[#F9F9F9] outline-none focus:border-accent transition-colors resize-none"
            placeholder={mode === 'set' ? "Ej. 3 objetos: manzana, pera y plátano / o una temática para variaciones..." : "Ej. Un sticker con el logo real de una cadena de fast food... O escribe varios: manzana, pera, plátano"}
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
