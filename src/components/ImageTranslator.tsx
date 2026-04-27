import { useState, useRef } from 'react';
import { useApiKeys } from '../context/ApiContext';
import { Languages, Loader2, Upload, Download, Trash2, Image as ImageIcon, ArrowRightLeft } from 'lucide-react';

type TranslationDirection = 'en-to-es' | 'es-to-en';

interface TranslationResult {
  base64: string;
  url: string;
  direction: TranslationDirection;
}

export default function ImageTranslator() {
  const { hasKey } = useApiKeys();
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [direction, setDirection] = useState<TranslationDirection>('en-to-es');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState<TranslationResult | null>(null);
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

  const handleTranslate = async () => {
    if (!sourceImage || !hasKey('gemini')) {
      setError(hasKey('gemini') ? 'Primero sube una imagen.' : 'Necesitas configurar tu API key de Gemini en Ajustes.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setStatusText('Traduciendo imagen con Gemini 3.1...');

    try {
      const keys = JSON.parse(localStorage.getItem('rebka_api_keys') || '{}');
      const base64Data = sourceImage.includes(',') ? sourceImage.split(',')[1] : sourceImage;

      const sourceLang = direction === 'en-to-es' ? 'English' : 'Spanish';
      const targetLang = direction === 'en-to-es' ? 'Spanish' : 'English';

      const prompt = `Translate all text in this image from ${sourceLang} to ${targetLang}. Preserve the original design, layout, colors, typography style, and visual elements exactly. Replace only the text content with the translated version, keeping the same font style, size, and positioning. Output a clean, professional image without any watermarks or overlays.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${keys.gemini}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: 'image/jpeg', data: base64Data } }
            ]
          }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig: {
              aspectRatio: "1:1",
              imageSize: "2K"
            }
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }

      const data = await response.json();

      for (const candidate of data.candidates || []) {
        for (const part of candidate.content?.parts || []) {
          if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
            const base64 = part.inlineData.data;
            setResult({
              base64,
              url: `data:image/png;base64,${base64}`,
              direction
            });
            break;
          }
        }
      }

      if (!result) {
        throw new Error('No se pudo generar la imagen traducida');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al traducir la imagen.');
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
            <Languages className="w-6 h-6 text-accent" />
            <h2 className="font-serif text-5xl tracking-tighter leading-[0.8] uppercase">IMAGE TRANSLATOR.</h2>
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
          <Languages className="w-6 h-6 text-accent" />
          <h2 className="font-serif text-5xl tracking-tighter leading-[0.8] uppercase">IMAGE TRANSLATOR.</h2>
        </div>

        <p className="font-sans font-semibold text-sm uppercase tracking-wide text-dim border-l-2 border-accent pl-4">
          Traduce infografías e imágenes de inglés a español (o viceversa) manteniendo diseño, colores y tipografía originales. Usa Gemini 3.1 Flash Image Preview (Nano Banana 2).
        </p>

        {/* Direction Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-dim">Dirección de traducción</label>
          <div className="flex border-2 border-ink text-xs font-bold uppercase tracking-widest overflow-hidden">
            <button
              onClick={() => setDirection('en-to-es')}
              className={`flex-1 px-3 py-3 transition-colors flex items-center justify-center gap-2 ${
                direction === 'en-to-es' ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-gray-100'
              }`}
            >
              <span className="text-sm">🇺🇸</span> EN <ArrowRightLeft className="w-3 h-3" /> ES <span className="text-sm">🇪🇸</span>
            </button>
            <button
              onClick={() => setDirection('es-to-en')}
              className={`flex-1 px-3 py-3 transition-colors flex items-center justify-center gap-2 border-l-2 border-ink ${
                direction === 'es-to-en' ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-gray-100'
              }`}
            >
              <span className="text-sm">🇪🇸</span> ES <ArrowRightLeft className="w-3 h-3" /> EN <span className="text-sm">🇺🇸</span>
            </button>
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

            <button
              onClick={handleTranslate}
              disabled={loading}
              className="btn-editorial w-full py-4 px-8 editorial-border flex items-center justify-center gap-4 text-sm disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> {statusText || 'TRADUCIENDO...'}</>
              ) : (
                <><Languages className="w-5 h-5" /> TRADUCIR {direction === 'en-to-es' ? 'EN → ES' : 'ES → EN'}</>
              )}
            </button>
          </div>
        )}

        {error && <div className="text-accent font-bold uppercase p-4 border border-accent bg-red-50 text-xs">{error}</div>}
      </div>

      {/* Resultado */}
      {result && (
        <div className="bg-white editorial-border p-8 flex flex-col gap-6 shadow-[10px_10px_0_rgba(0,0,0,0.05)]">
          <h2 className="font-serif text-4xl tracking-tighter leading-[0.8] self-start uppercase">TRADUCCIÓN.</h2>

          <div className="flex flex-col items-center gap-4">
            <div className="relative w-full max-w-2xl">
              <img
                src={result.url}
                alt="Translated"
                className="w-full h-auto editorial-border"
              />
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-green-500 text-white text-[10px] font-bold uppercase">
                {result.direction === 'en-to-es' ? 'ESPAÑOL' : 'ENGLISH'} • Sin marca de agua
              </div>
            </div>

            <a
              href={result.url}
              download={`translated-${result.direction}.png`}
              className="btn-editorial w-full max-w-md bg-transparent text-ink editorial-border px-4 py-3 text-xs flex items-center justify-center gap-2 hover:bg-ink hover:text-white transition-colors"
            >
              <Download className="w-4 h-4" /> DESCARGAR PNG TRADUCIDO
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
