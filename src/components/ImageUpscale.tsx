import { useState, useRef } from 'react';
import { useApiKeys } from '../context/ApiContext';
import { Maximize, Loader2, Upload, Download, Trash2, Image as ImageIcon, Sparkles } from 'lucide-react';

type Resolution = '1K' | '2K' | '4K';

interface UpscaleResult {
  base64: string;
  url: string;
}

export default function ImageUpscale() {
  const { hasKey } = useApiKeys();
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState<Resolution>('2K');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState<UpscaleResult | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Archivo demasiado grande. Máximo 10MB.');
        return;
      }
      setSourceFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setSourceImage(event.target?.result as string);
        setResult(null);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Archivo demasiado grande. Máximo 10MB.');
        return;
      }
      setSourceFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setSourceImage(event.target?.result as string);
        setResult(null);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSourceImage(null);
    setSourceFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpscale = async () => {
    if (!sourceImage || !hasKey('gemini')) {
      setError(hasKey('gemini') ? 'Primero sube una imagen.' : 'Necesitas configurar tu API key de Gemini en Ajustes.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setStatusText('Procesando imagen con Gemini 3.1...');

    try {
      const keys = JSON.parse(localStorage.getItem('rebka_api_keys') || '{}');
      
      // Preparar la imagen base64
      const base64Data = sourceImage.includes(',') ? sourceImage.split(',')[1] : sourceImage;
      
      // Construir el prompt mejorado
      const enhancedPrompt = `Recreate and enhance this image with maximum quality and detail. ${prompt || 'Maintain the original composition and style but increase resolution and clarity.'} Professional, high-quality output without any watermarks.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${keys.gemini}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: enhancedPrompt },
              { inlineData: { mimeType: 'image/jpeg', data: base64Data } }
            ]
          }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig: {
              aspectRatio: aspectRatio,
              imageSize: resolution
            }
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Extraer imagen de la respuesta
      for (const candidate of data.candidates || []) {
        for (const part of candidate.content?.parts || []) {
          if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
            const base64 = part.inlineData.data;
            setResult({
              base64,
              url: `data:image/png;base64,${base64}`
            });
            break;
          }
        }
      }

      if (!result) {
        throw new Error('No se pudo generar la imagen mejorada');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al procesar la imagen.');
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  if (!hasKey('gemini')) {
    return (
      <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto p-4 md:p-6 mb-16">
        <div className="bg-white editorial-border p-8 flex flex-col gap-6 shadow-[10px_10px_0_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-3">
            <Maximize className="w-6 h-6 text-accent" />
            <h2 className="font-serif text-5xl tracking-tighter leading-[0.8] uppercase">IMAGE UPSCALE.</h2>
          </div>
          <div className="text-accent font-bold uppercase p-4 border border-accent bg-red-50 text-xs">
            Configura tu API key de Gemini en Ajustes para usar esta función.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto p-4 md:p-6 mb-16">
      <div className="bg-white editorial-border p-8 flex flex-col gap-6 shadow-[10px_10px_0_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-3">
          <Maximize className="w-6 h-6 text-accent" />
          <h2 className="font-serif text-5xl tracking-tighter leading-[0.8] uppercase">IMAGE UPSCALE.</h2>
        </div>

        <p className="font-sans font-semibold text-sm uppercase tracking-wide text-dim border-l-2 border-accent pl-4">
          Mejora y reescala imágenes a 4K usando Gemini 3.1 Flash. Sin marcas de agua, máxima calidad.
        </p>

        {/* Configuración */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-dim">Resolución</label>
            <div className="flex border-2 border-ink text-xs font-bold uppercase tracking-widest overflow-hidden">
              {(['1K', '2K', '4K'] as Resolution[]).map((res) => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  className={`flex-1 px-3 py-2 transition-colors ${
                    resolution === res ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-gray-100'
                  } ${res !== '1K' ? 'border-l-2 border-ink' : ''}`}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-dim">Aspect Ratio</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full p-3 font-sans text-sm editorial-border bg-[#F9F9F9] outline-none focus:border-accent transition-colors"
            >
              <option value="1:1">1:1 (Cuadrado)</option>
              <option value="16:9">16:9 (Panorámico)</option>
              <option value="4:3">4:3 (Clásico)</option>
              <option value="3:2">3:2 (Foto)</option>
              <option value="9:16">9:16 (Vertical)</option>
              <option value="21:9">21:9 (Cinemascope)</option>
            </select>
          </div>
        </div>

        {/* Upload Area */}
        {!sourceImage ? (
          <label
            className="w-full h-64 border-2 border-dashed border-dim hover:border-ink hover:bg-gray-50 flex items-center justify-center cursor-pointer transition-colors text-dim font-bold flex-col gap-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <ImageIcon className="w-10 h-10 text-accent" />
            <span>Arrastra o haz clic para subir imagen</span>
            <span className="text-[10px] font-normal">Máximo 10MB • JPG, PNG, WebP</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="relative w-full max-w-md mx-auto">
              <img
                src={sourceImage}
                alt="Original"
                className="w-full h-auto editorial-border"
              />
              <button
                onClick={clearImage}
                className="absolute top-2 right-2 p-2 bg-white border-2 border-ink hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-accent" />
              </button>
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-ink text-white text-[10px] font-bold uppercase">
                Original
              </div>
            </div>

            <textarea
              className="w-full h-20 p-3 font-sans text-sm editorial-border bg-[#F9F9F9] outline-none focus:border-accent transition-colors resize-none"
              placeholder="Instrucciones opcionales (ej: 'mejora los detalles', 'estilo cinematográfico', 'más vibrante')..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
            />

            <button
              onClick={handleUpscale}
              disabled={loading}
              className="btn-editorial w-full py-4 px-8 editorial-border flex items-center justify-center gap-4 text-sm disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> {statusText || 'MEJORANDO...'}</>
              ) : (
                <><Sparkles className="w-5 h-5" /> UPSCALE A {resolution}</>
              )}
            </button>
          </div>
        )}

        {error && <div className="text-accent font-bold uppercase p-4 border border-accent bg-red-50 text-xs">{error}</div>}
      </div>

      {/* Resultado */}
      {result && (
        <div className="bg-white editorial-border p-8 flex flex-col gap-6 shadow-[10px_10px_0_rgba(0,0,0,0.05)]">
          <h2 className="font-serif text-4xl tracking-tighter leading-[0.8] self-start uppercase">RESULTADO.</h2>
          
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-full max-w-2xl">
              <img
                src={result.url}
                alt="Upscaled"
                className="w-full h-auto editorial-border"
              />
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-green-500 text-white text-[10px] font-bold uppercase">
                {resolution} • Sin marca de agua
              </div>
            </div>
            
            <a
              href={result.url}
              download={`upscaled-${resolution}.png`}
              className="btn-editorial w-full max-w-md bg-transparent text-ink editorial-border px-4 py-3 text-xs flex items-center justify-center gap-2 hover:bg-ink hover:text-white transition-colors"
            >
              <Download className="w-4 h-4" /> DESCARGAR {resolution} PNG
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
