import { useState, useRef } from 'react';
import { useApiKeys } from '../context/ApiContext';
import { Languages, Loader2, Upload, Download, Trash2, ArrowRightLeft, CheckCircle2, AlertCircle, Image as ImageIcon, FileText, Package } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

// Polyfill para Math.sumPrecise (no soportado en todos los navegadores)
if (typeof Math.sumPrecise !== 'function') {
  Math.sumPrecise = (values: Iterable<number>): number => {
    let sum = 0;
    for (const v of values) sum += v;
    return sum;
  };
}

// Worker local (copiado a /public/ desde node_modules/pdfjs-dist/build/)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

type TranslationDirection = 'en-to-es' | 'es-to-en';
type FileType = 'image' | 'pdf' | null;
type PageStatus = 'pending' | 'rendering' | 'translating' | 'done' | 'error';

interface PageInfo {
  pageNum: number;
  status: PageStatus;
  originalBase64: string;
  translatedBase64: string | null;
  error?: string;
}

interface TranslationResult {
  base64: string;
  url: string;
  direction: TranslationDirection;
}

export default function Translator() {
  const { hasKey } = useApiKeys();
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>(null);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [direction, setDirection] = useState<TranslationDirection>('en-to-es');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [overallProgress, setOverallProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<boolean>(false);

  const detectFileType = (f: File): FileType => {
    if (f.type.startsWith('image/')) return 'image';
    if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) return 'pdf';
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const type = detectFileType(selected);
    if (!type) {
      setError('Solo se aceptan imágenes (JPG, PNG, WebP) o archivos PDF.');
      return;
    }

    if (type === 'image' && selected.size > 10 * 1024 * 1024) {
      setError('Imagen demasiado grande. Máximo 10MB.');
      return;
    }
    if (type === 'pdf' && selected.size > 50 * 1024 * 1024) {
      setError('PDF demasiado grande. Máximo 50MB.');
      return;
    }

    setFile(selected);
    setFileType(type);
    setError('');
    setResult(null);
    setPages([]);
    setOverallProgress({ done: 0, total: 0 });

    if (type === 'image') {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSourceImage(event.target?.result as string);
      };
      reader.readAsDataURL(selected);
    } else {
      setSourceImage(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (!dropped) return;

    const type = detectFileType(dropped);
    if (!type) {
      setError('Solo se aceptan imágenes (JPG, PNG, WebP) o archivos PDF.');
      return;
    }

    setFile(dropped);
    setFileType(type);
    setError('');
    setResult(null);
    setPages([]);
    setOverallProgress({ done: 0, total: 0 });

    if (type === 'image') {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSourceImage(event.target?.result as string);
      };
      reader.readAsDataURL(dropped);
    } else {
      setSourceImage(null);
    }
  };

  const clearFile = () => {
    setFile(null);
    setFileType(null);
    setSourceImage(null);
    setResult(null);
    setPages([]);
    setError('');
    setOverallProgress({ done: 0, total: 0 });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Translate a single image using Gemini
  const translateImageWithGemini = async (base64Image: string, apiKey: string, dir: TranslationDirection): Promise<string> => {
    const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    const sourceLang = dir === 'en-to-es' ? 'English' : 'Spanish';
    const targetLang = dir === 'en-to-es' ? 'Spanish' : 'English';

    const prompt = `Translate all text in this image from ${sourceLang} to ${targetLang}. Preserve the original design, layout, colors, typography style, and visual elements exactly. Replace only the text content with the translated version, keeping the same font style, size, and positioning. Output a clean, professional image without any watermarks or overlays.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/png', data: base64Data } }
          ]
        }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: { aspectRatio: "1:1", imageSize: "2K" }
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `API Error ${response.status}`);
    }

    const data = await response.json();
    for (const candidate of data.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error('No image returned from Gemini');
  };

  // Convert PDF page to image
  const renderPageToImage = async (pdfDoc: pdfjsLib.PDFDocumentProxy, pageNum: number): Promise<string> => {
    const page = await pdfDoc.getPage(pageNum);
    const scale = 2.0;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL('image/png');
  };

  // Rebuild PDF from translated images
  const rebuildPdf = async (pages: PageInfo[]): Promise<Uint8Array> => {
    const newPdf = await PDFDocument.create();
    for (const page of pages) {
      if (!page.translatedBase64) continue;
      
      const base64Data = page.translatedBase64.split(',')[1];
      const imgBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      // Detectar formato real por magic bytes (no por mime type del data URL)
      const isPng = imgBytes[0] === 0x89 && imgBytes[1] === 0x50 && imgBytes[2] === 0x4E && imgBytes[3] === 0x47;
      const isJpeg = imgBytes[0] === 0xFF && imgBytes[1] === 0xD8 && imgBytes[2] === 0xFF;
      
      let img;
      try {
        if (isPng) {
          img = await newPdf.embedPng(imgBytes);
        } else if (isJpeg) {
          img = await newPdf.embedJpg(imgBytes);
        } else {
          // Formato desconocido, intentar convertir a PNG via canvas
          console.warn(`Página ${page.pageNum}: formato desconocido, convirtiendo via canvas`);
          const convertedPng = await convertToPng(page.translatedBase64);
          const convertedBytes = Uint8Array.from(atob(convertedPng.split(',')[1]), c => c.charCodeAt(0));
          img = await newPdf.embedPng(convertedBytes);
        }
      } catch (err) {
        console.error(`Error embebiendo página ${page.pageNum}:`, err);
        // Fallback: convertir a PNG via canvas
        try {
          const convertedPng = await convertToPng(page.translatedBase64);
          const convertedBytes = Uint8Array.from(atob(convertedPng.split(',')[1]), c => c.charCodeAt(0));
          img = await newPdf.embedPng(convertedBytes);
        } catch (fallbackErr) {
          console.error(`Página ${page.pageNum} saltada:`, fallbackErr);
          continue;
        }
      }
      
      const { width, height } = img.scale(1);
      const pdfPage = newPdf.addPage([width, height]);
      pdfPage.drawImage(img, { x: 0, y: 0, width, height });
    }
    return await newPdf.save();
  };

  // Convertir cualquier imagen a PNG usando canvas (fallback)
  const convertToPng = (dataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No canvas context'));
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load image for conversion'));
      img.src = dataUrl;
    });
  };

  // Descargar todas las imágenes traducidas como ZIP
  const downloadImagesAsZip = async (pages: PageInfo[], originalFileName: string, dir: TranslationDirection) => {
    const zip = new JSZip();
    const folder = zip.folder('traducido');
    const suffix = dir === 'en-to-es' ? '_ES' : '_EN';
    const baseName = originalFileName.replace(/\.pdf$/i, '');

    for (const page of pages) {
      if (!page.translatedBase64) continue;
      
      // Detectar extensión por el mime type
      const isJpeg = page.translatedBase64.includes('image/jpeg') || page.translatedBase64.includes('image/jpg');
      const ext = isJpeg ? 'jpg' : 'png';
      const fileName = `${baseName}_pagina${page.pageNum.toString().padStart(3, '0')}${suffix}.${ext}`;
      
      // Extraer bytes base64
      const base64Data = page.translatedBase64.split(',')[1];
      const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      folder?.file(fileName, bytes);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${baseName}_imagenes${suffix}.zip`);
  };

  const handleTranslate = async () => {
    if (!file || !hasKey('gemini')) {
      setError(hasKey('gemini') ? 'Primero sube un archivo.' : 'Necesitas configurar tu API key de Gemini en Ajustes.');
      return;
    }

    setLoading(true);
    setError('');
    abortRef.current = false;

    try {
      const keys = JSON.parse(localStorage.getItem('rebka_api_keys') || '{}');
      const apiKey = keys.gemini;

      if (fileType === 'image') {
        // Single image translation
        setStatusText('Traduciendo imagen con Gemini 3.1...');
        if (!sourceImage) throw new Error('Error al leer la imagen');
        
        const translated = await translateImageWithGemini(sourceImage, apiKey, direction);
        setResult({
          base64: translated.split(',')[1],
          url: translated,
          direction
        });
      } else if (fileType === 'pdf') {
        // PDF translation
        setStatusText('Cargando PDF...');
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdfDoc.numPages;

        const initialPages: PageInfo[] = [];
        for (let i = 1; i <= numPages; i++) {
          initialPages.push({ pageNum: i, status: 'pending', originalBase64: '', translatedBase64: null });
        }
        setPages(initialPages);
        setOverallProgress({ done: 0, total: numPages });

        // Render pages
        const renderedPages: PageInfo[] = [];
        for (let i = 0; i < numPages; i++) {
          if (abortRef.current) break;
          setStatusText(`Renderizando página ${i + 1} de ${numPages}...`);
          const base64 = await renderPageToImage(pdfDoc, i + 1);
          renderedPages.push({ pageNum: i + 1, status: 'translating', originalBase64: base64, translatedBase64: null });
          setPages(prev => {
            const copy = [...prev];
            copy[i] = { ...copy[i], status: 'translating', originalBase64: base64 };
            return copy;
          });
        }

        // Translate pages
        const translatedPages: PageInfo[] = [...renderedPages];
        for (let i = 0; i < translatedPages.length; i++) {
          if (abortRef.current) break;
          setStatusText(`Traduciendo página ${i + 1} de ${numPages}...`);
          try {
            const translated = await translateImageWithGemini(translatedPages[i].originalBase64, apiKey, direction);
            translatedPages[i].translatedBase64 = translated;
            translatedPages[i].status = 'done';
            setPages(prev => {
              const copy = [...prev];
              copy[i] = { ...copy[i], translatedBase64: translated, status: 'done' };
              return copy;
            });
            setOverallProgress({ done: i + 1, total: numPages });
          } catch (err: any) {
            translatedPages[i].status = 'error';
            translatedPages[i].error = err.message;
            setPages(prev => {
              const copy = [...prev];
              copy[i] = { ...copy[i], status: 'error', error: err.message };
              return copy;
            });
          }
        }

        // Rebuild PDF
        const donePages = translatedPages.filter(p => p.status === 'done');
        if (donePages.length === 0) throw new Error('No se pudo traducir ninguna página.');

        let pdfSuccess = false;
        try {
          setStatusText('Reconstruyendo PDF...');
          const pdfBytes = await rebuildPdf(translatedPages);
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          const originalName = file.name.replace(/\.pdf$/i, '');
          const suffix = direction === 'en-to-es' ? '_ES' : '_EN';
          saveAs(blob, `${originalName}${suffix}.pdf`);
          pdfSuccess = true;
          setStatusText('¡PDF traducido y descargado!');
        } catch (pdfErr: any) {
          console.error('Error reconstruyendo PDF:', pdfErr);
          setError(`Error al crear PDF: ${pdfErr.message}. Puedes descargar las imágenes individuales como ZIP.`);
        }

        // Siempre ofrecer ZIP con las imágenes traducidas (útil si el PDF falla o como backup)
        if (!pdfSuccess) {
          setStatusText('Generando ZIP con imágenes...');
          await downloadImagesAsZip(translatedPages, file.name, direction);
          setStatusText('¡Imágenes descargadas como ZIP!');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al traducir.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    abortRef.current = true;
    setLoading(false);
    setStatusText('Cancelado por el usuario.');
  };

  if (!hasKey('gemini')) {
    return (
      <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto p-4 md:p-6 mb-16">
        <div className="bg-white editorial-border p-8 flex flex-col gap-6 shadow-[10px_10px_0_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-3">
            <Languages className="w-6 h-6 text-accent" />
            <h2 className="font-serif text-5xl tracking-tighter leading-[0.8] uppercase">TRANSLATOR.</h2>
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
          <h2 className="font-serif text-5xl tracking-tighter leading-[0.8] uppercase">TRANSLATOR.</h2>
        </div>

        <p className="font-sans font-semibold text-sm uppercase tracking-wide text-dim border-l-2 border-accent pl-4">
          Traduce imágenes y documentos PDF de inglés a español (o viceversa). Sube una imagen o PDF y mantendremos el diseño original.
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
        {!file ? (
          <label
            className="w-full h-64 border-2 border-dashed border-dim hover:border-ink hover:bg-gray-50 flex items-center justify-center cursor-pointer transition-colors text-dim font-bold flex-col gap-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <ImageIcon className="w-10 h-10 text-accent" />
            <span>Arrastra o haz clic para subir imagen o PDF</span>
            <span className="text-[10px] font-normal">Imágenes: máx 10MB • PDF: máx 50MB</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        ) : (
          <div className="flex flex-col gap-4">
            {/* File info */}
            <div className="flex items-center justify-between bg-gray-50 p-4 editorial-border">
              <div className="flex items-center gap-3">
                {fileType === 'image' ? <ImageIcon className="w-8 h-8 text-accent" /> : <FileText className="w-8 h-8 text-accent" />}
                <div>
                  <p className="font-bold text-sm">{file.name}</p>
                  <p className="text-[10px] text-dim">{(file.size / 1024 / 1024).toFixed(2)} MB • {fileType === 'image' ? 'Imagen' : 'PDF'}</p>
                </div>
              </div>
              <button
                onClick={clearFile}
                className="p-2 bg-white border-2 border-ink hover:bg-red-50 transition-colors"
                disabled={loading}
              >
                <Trash2 className="w-4 h-4 text-accent" />
              </button>
            </div>

            {/* Image preview */}
            {fileType === 'image' && sourceImage && (
              <div className="relative w-full max-w-md mx-auto">
                <img src={sourceImage} alt="Original" className="w-full h-auto editorial-border" />
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-ink text-white text-[10px] font-bold uppercase">Original</div>
              </div>
            )}

            {/* PDF progress grid */}
            {fileType === 'pdf' && pages.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-dim">
                  <span>Progreso: {overallProgress.done} / {overallProgress.total} páginas</span>
                  <span>{statusText}</span>
                </div>
                <div className="w-full h-2 bg-gray-200 overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${overallProgress.total > 0 ? (overallProgress.done / overallProgress.total) * 100 : 0}%` }}
                  />
                </div>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mt-2">
                  {pages.map((page) => (
                    <div
                      key={page.pageNum}
                      className={`aspect-[3/4] border-2 flex items-center justify-center text-[10px] font-bold uppercase ${
                        page.status === 'done' ? 'border-green-500 bg-green-50 text-green-700' :
                        page.status === 'error' ? 'border-red-500 bg-red-50 text-red-700' :
                        page.status === 'translating' ? 'border-accent bg-accent/10 text-accent animate-pulse' :
                        'border-gray-300 bg-gray-50 text-gray-400'
                      }`}
                    >
                      {page.status === 'done' && <CheckCircle2 className="w-4 h-4" />}
                      {page.status === 'error' && <AlertCircle className="w-4 h-4" />}
                      {page.status === 'translating' && <Loader2 className="w-4 h-4 animate-spin" />}
                      {page.status === 'pending' && page.pageNum}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleTranslate}
                disabled={loading}
                className="btn-editorial flex-1 py-4 px-8 editorial-border flex items-center justify-center gap-4 text-sm disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> {statusText || 'PROCESANDO...'}</>
                ) : (
                  <><Languages className="w-5 h-5" /> {fileType === 'image' ? 'TRADUCIR IMAGEN' : 'TRADUCIR PDF'}</>
                )}
              </button>
              {loading && (
                <button
                  onClick={handleCancel}
                  className="px-6 py-4 border-2 border-red-500 text-red-500 font-bold text-xs uppercase tracking-widest hover:bg-red-50 transition-colors"
                >
                  CANCELAR
                </button>
              )}
            </div>

            {/* Descargar imágenes como ZIP (siempre disponible si hay páginas traducidas) */}
            {fileType === 'pdf' && pages.some(p => p.translatedBase64) && !loading && (
              <button
                onClick={() => downloadImagesAsZip(pages, file.name, direction)}
                className="w-full py-3 px-4 border-2 border-dim text-dim font-bold text-xs uppercase tracking-widest hover:border-ink hover:text-ink hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Package className="w-4 h-4" />
                DESCARGAR IMÁGENES TRADUCIDAS COMO ZIP (BACKUP)
              </button>
            )}
          </div>
        )}

        {error && <div className="text-accent font-bold uppercase p-4 border border-accent bg-red-50 text-xs">{error}</div>}
      </div>

      {/* Image result */}
      {result && fileType === 'image' && (
        <div className="bg-white editorial-border p-8 flex flex-col gap-6 shadow-[10px_10px_0_rgba(0,0,0,0.05)]">
          <h2 className="font-serif text-4xl tracking-tighter leading-[0.8] self-start uppercase">TRADUCCIÓN.</h2>
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-full max-w-2xl">
              <img src={result.url} alt="Translated" className="w-full h-auto editorial-border" />
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
