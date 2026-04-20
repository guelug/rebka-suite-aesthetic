import { useState, useEffect } from 'react';
import { Sparkles, Download, Loader2, Globe, Wand2, Search, ArrowRight, Upload, Edit } from 'lucide-react';

type Mode = 'single' | 'set' | 'url' | 'modify' | 'variations';

interface StickerResult {
  base64: string;
  url: string;
}

interface CreateStickerProps {
  onStickerGenerated: (base64: string) => void;
}

// Configuración de Gemini - reemplazar con tu API key
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export default function CreateSticker({ onStickerGenerated }: CreateStickerProps) {
  const [prompt, setPrompt] = useState('');
  const [urlInstructions, setUrlInstructions] = useState('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>('single');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [results, setResults] = useState<StickerResult[]>([]);
  const [error, setError] = useState('');

  // Handle paste for reference images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (mode !== 'modify' && mode !== 'variations') return;
      const items = e.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (item.type.indexOf('image') === 0) {
            const blob = item.getAsFile();
            if (blob) {
              const reader = new FileReader();
              reader.onload = (event) => setReferenceImages(prev => [...prev, event.target?.result as string]);
              reader.readAsDataURL(blob);
            }
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [mode]);

  const researchWithGemini = async (url: string, instructions: string): Promise<string[]> => {
    setStatusText('Investigando empresa en profundidad...');
    
    try {
      const researchPrompt = `Visita e investiga profundamente la empresa en la URL: "${url}". Usa Google Search para extraer detalles precisos: formas exactas de su logotipo real, colores corporativos, UI de su producto o mascotas. ${instructions.trim() ? `\n\nATENCIÓN, EL USUARIO REQUIERE QUE TE ENFOQUES ESPECÍFICAMENTE EN ESTO AL INVESTIGAR Y CREAR: "${instructions}". SI SE MENCIONAN VARIOS PRODUCTOS, INVESTIGA CADA UNO EN LA WEB/GOOGLE y dedica preferentemente un sticker a cada producto individual para poder cubrirlos.\n\n` : ''}Diseña 3 conceptos creativos para stickers de WhatsApp que INCLUYAN EXPLÍCITAMENTE y de manera visible el logo real de la empresa investigada o sus productos específicos. IMPORTANTE: Los stickers deben tener texto o frases divertidas, y TODO EL TEXTO DEBE ESTAR ESCRITO ESTRICTAMENTE EN ESPAÑOL (Castellano). Responde ESTRICTAMENTE un JSON array de 3 strings descriptivos. (Escribe el prompt visual en inglés para la IA de imagen, especificando qué logo/producto dibujar y qué palabras exactas en español generar tipográficamente).`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: researchPrompt }] }],
          tools: [{ google_search: {} }]
        })
      });

      if (!response.ok) throw new Error(`Research API Error: ${response.status}`);

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      try {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) return JSON.parse(match[0]);
      } catch (e) {
        console.error('Error parseando JSON:', e);
      }
      
      return text.split('\n').filter(line => line.trim()).slice(0, 3);
    } catch (err) {
      console.error('Error en research:', err);
      return [url + ' - concepto 1', url + ' - concepto 2', url + ' - concepto 3'];
    }
  };

  const generateWithGemini = async (targetPrompt: string, index: number, total: number): Promise<string | null> => {
    const isModify = mode === 'modify';
    const isVariations = mode === 'variations';
    
    setStatusText(
      isModify ? 'Aplicando modificación agresiva en imagen local...' :
      isVariations ? `Generando variación individual (${index+1}/${total})...` :
      total > 1 ? `Generando sticker con logo y texto (${index + 1}/${total})...` :
      'Generando sticker corporativo en español...'
    );

    try {
      let enhancedPrompt: string;
      
      if (isModify) {
        enhancedPrompt = `A die-cut WhatsApp sticker design, perfectly isolated on a completely transparent background layer, 2D flat vector art style, thick clean white border around the character. \n\nCRITICAL MODIFICATION REQUEST: "${targetPrompt}". \n\nMANDATORY: You MUST forcefully transform the provided reference image based on the MODIFICATION REQUEST. Do NOT just copy the source. Add the requested items clearly and obviously in the final image. ALL TEXT OR TYPOGRAPHY IN THE FINAL IMAGE MUST BE IN PERFECT SPANISH.`;
      } else if (isVariations) {
        enhancedPrompt = `A die-cut WhatsApp sticker design, perfectly isolated on a completely transparent background layer, 2D flat vector art style, thick clean white border around the character. \n\nVARIATION REQUEST: "${targetPrompt}". \n\nMANDATORY REQUIREMENT: You MUST keep the physical visual identity, character, or object of the provided reference image(s). Do NOT change the main subject. But you MUST apply this specific variation perfectly. ALL TEXT TYPOGRAPHY MUST BE IN SPANISH STRICTLY.`;
      } else {
        const baseInstruction = mode === 'single' 
          ? `Incorporate explicit visual references to real company logos, specific brands, or corporate mascots related to: "${targetPrompt}". The sticker MUST include catchy typography.`
          : `Subject: ${targetPrompt}`;
        
        enhancedPrompt = `A die-cut WhatsApp sticker design, perfectly isolated on a completely transparent background layer (pure alpha background), 2D flat vector art style, thick clean white border around the object/character. NO background scenario or grid. High quality. REQUIREMENT: INTEGRATE ACTUAL REAL BRAND LOGOS, SPECIFIC PRODUCTS, UI, OR EXACT CORPORATE REFERENCES AS INSTRUCTED. MANDATORY RULE: ALL TEXT, LETTERS, TYPOGRAPHY, OR SPEECH BUBBLES IN THE IMAGE ABSOLUTELY MUST BE WRITTEN IN PERFECT SPANISH (CASTELLANO). DO NOT USE ENGLISH TEXT. \n\n${baseInstruction}`;
      }

      // Build contents payload
      let contentsPayload: any = enhancedPrompt;
      
      // If we have reference images (modify/variations mode), include them
      if ((isModify || isVariations) && referenceImages.length > 0) {
        const inlineDataParts = referenceImages.map(img => {
          const base64Data = img.includes(',') ? img.split(',')[1] : img;
          return { inlineData: { data: base64Data, mimeType: 'image/png' } };
        });
        contentsPayload = [
          { text: enhancedPrompt },
          ...inlineDataParts
        ];
      } else {
        contentsPayload = [{ text: enhancedPrompt }];
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: contentsPayload }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
        })
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const data = await response.json();
      
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

  const handleGenerate = async () => {
    // Validation
    if (mode === 'modify' || mode === 'variations') {
      if (referenceImages.length === 0) {
        setError("Primero sube o pega (Ctrl+V) al menos una imagen de referencia.");
        return;
      }
      if (mode === 'modify' && !prompt.trim()) {
        setError("Describe qué quieres modificar.");
        return;
      }
    } else {
      if (!prompt.trim()) return;
    }

    if (!GEMINI_API_KEY) {
      setError("Falta configurar la API key de Gemini. Añade VITE_GEMINI_API_KEY en tu .env");
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      let targetPrompts: string[] = [prompt];

      // Research phase for set/url/modify/variations modes
      if (mode === 'set' || mode === 'url' || mode === 'modify' || mode === 'variations') {
        setStatusText(
          mode === 'modify' ? 'Investigando tu modificación y referencias...' :
          mode === 'variations' ? 'Ideando 4 variaciones del producto...' :
          mode === 'url' ? 'Investigando empresa en profundidad...' :
          'Buscando marcas y conceptos reales...'
        );

        let systemInstruction: string;
        
        if (mode === 'modify') {
          systemInstruction = `El usuario quiere modificar un sticker existente con esta instrucción: "${prompt}". Usa Google Search para investigar rápidamente cualquier marca, producto o personaje que se mencione y extraer detalles visuales clave. Tu tarea es generar 1 instrucción en INGLÉS EXTREMADAMENTE DESCRIPTIVA que se pasará a un modelo de IA de imágenes. La instrucción debe indicar que se mantenga el estilo visual de la imagen base (flat vector art, white border) PERO se aplique LA MODIFICACIÓN de forma EVIDENTE, AGRESIVA y CLARA. IMPORTANTE: Cualquier texto que se añada debe estar EN ESPAÑOL. Responde ESTRICTAMENTE en un JSON array con 1 solo string descriptivo.`;
        } else if (mode === 'variations') {
          systemInstruction = `El usuario ha proporcionado una imagen y quiere generar un set de 4 versiones SIMILARES pero DISTINTAS con el mismo producto/personaje base. ${prompt ? `Instrucción del usuario para las variaciones: "${prompt}"` : 'Usa tu creatividad para proponer 4 posturas, oficios, situaciones o expresiones diferentes del mismo elemento central'}. Usa Google Search si es necesario. Crea 4 conceptos altamente descriptivos en INGLÉS. Cada prompt debe indicar que se MANTENGA estrictamente la identidad visual central del producto/personaje de referencia, pero aplicando una de tus 4 variaciones. IMPORTANTE: Los textos deben ser frases super creativas en ESPAÑOL. Responde SOLAMENTE con un JSON array puro estricto de 4 strings descriptivos.`;
        } else if (mode === 'url') {
          systemInstruction = `Visita e investiga profundamente la empresa en la URL: "${prompt}". Usa Google Search para extraer detalles precisos: formas exactas de su logotipo real, colores corporativos, UI de su producto o mascotas. ${urlInstructions.trim() ? `\n\nATENCIÓN, EL USUARIO REQUIERE QUE TE ENFOQUES ESPECÍFICAMENTE EN ESTO AL INVESTIGAR Y CREAR: "${urlInstructions}". SI SE MENCIONAN VARIOS PRODUCTOS, INVESTIGA CADA UNO EN LA WEB/GOOGLE y dedica preferentemente un sticker a cada producto individual para poder cubrirlos.\n\n` : ''}Diseña 3 conceptos creativos para stickers de WhatsApp que INCLUYAN EXPLÍCITAMENTE y de manera visible el logo real de la empresa investigada o sus productos específicos. IMPORTANTE: Los stickers deben tener texto o frases divertidas, y TODO EL TEXTO DEBE ESTAR ESCRITO ESTRICTAMENTE EN ESPAÑOL (Castellano). Responde ESTRICTAMENTE un JSON array de 3 strings descriptivos. (Escribe el prompt visual en inglés para la IA de imagen, especificando qué logo/producto dibujar y qué palabras exactas en español generar tipográficamente).`;
        } else {
          // set mode
          systemInstruction = `Usa Google Search para investigar marcas reales, logos de empresas o personajes corporativos relacionados con: "${prompt}". ATENCIÓN: Si se mencionan VARIOS PRODUCTOS, investiga CADA UNO en Google Search y dedica preferentemente un sticker a cada producto individual. Diseña 3 ideas para un set de stickers de WhatsApp que INCLUYAN DIRECTAMENTE LOS LOGOS, PRODUCTOS O MARCAS REALES investigadas. IMPORTANTE: Los stickers deben incluir texto/frases geniales, y ese texto DEBE ESTAR ESCRITO ESTRICTAMENTE EN ESPAÑOL (Castellano). Responde ESTRICTAMENTE un JSON array de 3 strings descriptivos. (Escribe el prompt visual de imagen en inglés, indicando el logo/producto a incluir y qué frase exacta en español colocar en el diseño).`;
        }

        const textResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemInstruction }] }],
            tools: [{ google_search: {} }]
          })
        });

        if (textResponse.ok) {
          const data = await textResponse.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          try {
            const match = text.match(/\[[\s\S]*\]/);
            if (match) {
              const parsed = JSON.parse(match[0]);
              if (Array.isArray(parsed) && parsed.length > 0) {
                targetPrompts = parsed;
              }
            }
          } catch(e) {
            console.error("Failed to parse JSON array from Gemini", e);
          }
        }
      }

      // Generate images
      const newResults: StickerResult[] = [];
      
      for (let i = 0; i < targetPrompts.length; i++) {
        const base64Data = await generateWithGemini(targetPrompts[i], i, targetPrompts.length);
        
        if (base64Data) {
          newResults.push({
            base64: base64Data,
            url: `data:image/png;base64,${base64Data}`
          });
        }
        
        if (i < targetPrompts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (newResults.length > 0) {
        setResults(newResults);
        if (mode === 'single') {
          onStickerGenerated(newResults[0].base64);
        }
        setTimeout(() => {
          document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        setError("No se pudo generar la imagen. Intenta modificar la petición.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al intentar generar el sticker.");
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => setReferenceImages(prev => [...prev, event.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeReferenceImage = (idx: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== idx));
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
              onClick={() => { setMode('single'); setPrompt(''); setUrlInstructions(''); setReferenceImages([]); }}
              className={`px-4 py-3 transition-colors ${mode === 'single' ? 'bg-ink text-white' : 'hover:bg-gray-200 text-ink'}`}
            >
              1 STICKER
            </button>
            <button 
              onClick={() => { setMode('set'); setPrompt(''); setUrlInstructions(''); setReferenceImages([]); }}
              className={`px-4 py-3 sm:border-l-2 border-t-2 sm:border-t-0 border-ink transition-colors flex items-center justify-center gap-2 ${mode === 'set' ? 'bg-ink text-white' : 'hover:bg-gray-200 text-ink'}`}
            >
              SET MÚLTIPLE (x3) <Sparkles className="w-3 h-3" />
            </button>
            <button 
              onClick={() => { setMode('url'); setPrompt(''); setUrlInstructions(''); setReferenceImages([]); }}
              className={`px-4 py-3 sm:border-l-2 border-t-2 sm:border-t-0 border-ink transition-colors flex items-center justify-center gap-2 ${mode === 'url' ? 'bg-ink text-white' : 'hover:bg-gray-200 text-ink'}`}
            >
              EMPRESA URL (x3) <Globe className="w-3 h-3" />
            </button>
            <button 
              onClick={() => { setMode('modify'); setPrompt(''); setUrlInstructions(''); setReferenceImages([]); }}
              className={`px-4 py-3 sm:border-l-2 border-t-2 sm:border-t-0 border-ink transition-colors flex items-center justify-center gap-2 ${mode === 'modify' ? 'bg-ink text-white' : 'hover:bg-gray-200 text-ink'}`}
            >
              EDITAR / SUBIR <Edit className="w-3 h-3" />
            </button>
            <button 
              onClick={() => { setMode('variations'); setPrompt(''); setUrlInstructions(''); setReferenceImages([]); }}
              className={`px-4 py-3 sm:border-l-2 border-t-2 sm:border-t-0 border-ink transition-colors flex items-center justify-center gap-2 ${mode === 'variations' ? 'bg-ink text-white' : 'hover:bg-gray-200 text-ink'}`}
            >
              VARIACIONES (x4) <Sparkles className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        <p className="font-sans font-semibold text-sm uppercase tracking-wide text-dim border-l-2 border-accent pl-4">
          {mode === 'url' 
            ? "Introduce la URL de una empresa y en qué quieres que la IA se enfoque. Usaremos Google Search para analizarla."
            : mode === 'modify'
            ? "Sube una o varias imágenes o pégalas (Ctrl+V) y describe cómo quieres modificarlas o combinarlas. Mantendremos su base."
            : mode === 'variations'
            ? "Sube una foto de un elemento o personaje. Generaremos 4 variaciones suyas diferentes."
            : "Describe tu idea. Utilizaremos Investigación con Gemini para crear la mejor parodia corporativa y fondo transparente."}
        </p>
        
        {mode === 'modify' || mode === 'variations' ? (
          <div className="flex flex-col gap-4">
            {referenceImages.length > 0 && (
              <div className="flex flex-wrap gap-4 items-center justify-center">
                {referenceImages.map((img, idx) => (
                  <div 
                    key={idx} 
                    className="relative w-32 h-32 border-2 border-ink bg-[#f0f0f0] flex items-center justify-center p-2 group cursor-pointer"
                    onClick={() => removeReferenceImage(idx)}
                    style={{ 
                      backgroundImage: 'repeating-linear-gradient(45deg, #e5e5e5 25%, transparent 25%, transparent 75%, #e5e5e5 75%, #e5e5e5)', 
                      backgroundPosition: '0 0, 10px 10px', 
                      backgroundSize: '20px 20px' 
                    }}
                  >
                    <img src={img} className="max-w-full max-h-full object-contain" />
                    <div className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold transition-opacity text-center px-2">
                      BORRAR
                    </div>
                  </div>
                ))}
                <label className="w-32 h-32 border-2 border-dashed border-dim hover:border-ink hover:bg-gray-50 flex items-center justify-center cursor-pointer transition-colors text-dim font-bold text-xs flex-col gap-2">
                  <Upload className="w-5 h-5 text-accent" />
                  AÑADIR OTRA
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            )}

            {referenceImages.length === 0 && (
              <label className="w-full h-48 border-2 border-dashed border-dim hover:border-ink hover:bg-gray-50 flex items-center justify-center cursor-pointer transition-colors text-dim font-bold text-sm flex-col gap-2">
                <Upload className="w-6 h-6 text-accent" />
                Haz clic, arrastra o pega (Ctrl+V) una o más imágenes aquí
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
              </label>
            )}
            
            <textarea
              className="w-full h-24 p-4 font-sans text-sm editorial-border bg-[#F9F9F9] outline-none focus:border-accent transition-colors resize-none"
              placeholder={mode === 'modify' ? "¿Qué quieres cambiar? (Ej. Combina ambas imágenes, hazlo enojado, ponle un sombrero rojo...)" : "Opcional: ¿Qué variaciones quieres? (Ej. Diferentes disfraces, distintos trabajos, cambialo de época...)"}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
            />
          </div>
        ) : mode === 'url' ? (
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
            placeholder={mode === 'set' ? "Ej. Un set de stickers sobre una marca real de móviles o zapatillas..." : "Ej. Un sticker con el logo real de una cadena de fast food..."}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
          />
        )}
        
        <div className="flex flex-col items-center gap-2 mt-2">
          <button 
            onClick={handleGenerate}
            disabled={loading || (mode === 'modify' || mode === 'variations' 
              ? (referenceImages.length === 0 || (mode === 'modify' && !prompt.trim())) 
              : !prompt.trim())}
            className="btn-editorial w-full py-4 px-8 editorial-border flex items-center justify-center gap-4 text-sm disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {statusText || 'GENERANDO...'}</>
            ) : (
              <><Wand2 className="w-5 h-5" /> GENERAR {mode === 'set' || mode === 'url' ? 'SET DE STICKERS' : mode === 'variations' ? 'VARIACIONES' : mode === 'modify' ? 'MODIFICACIÓN' : 'STICKER'}</>
            )}
          </button>
          {loading && mode !== 'modify' && mode !== 'variations' && (
            <div className="flex items-center gap-2 text-[10px] font-mono text-dim tracking-widest uppercase animate-pulse">
              <Search className="w-3 h-3" /> Búsqueda y Análisis en vivo activado
            </div>
          )}
        </div>
        
        {error && <div className="text-accent font-bold uppercase p-4 border border-accent bg-red-50 text-xs">{error}</div>}
      </div>

      {results.length > 0 && (
        <div id="results-section" className="bg-white editorial-border p-8 flex flex-col gap-8 mt-8 shadow-[10px_10px_0_rgba(0,0,0,0.05)]">
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
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setMode('modify'); setPrompt(''); setReferenceImages([r.base64]); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="btn-editorial flex-1 bg-white text-ink editorial-border px-4 py-2 text-xs flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
                    >
                      <Edit className="w-3 h-3"/> MODIFICAR
                    </button>
                    <button 
                      onClick={() => onStickerGenerated(r.base64)}
                      className="btn-editorial flex-1 bg-accent text-white editorial-border px-4 py-2 text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                    >
                      <ArrowRight className="w-3 h-3"/> ANIMAR
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
