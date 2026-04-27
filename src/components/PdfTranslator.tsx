import { useState, useRef, useCallback } from 'react';
import { useApiKeys } from '../context/ApiContext';
import { FileText, Loader2, Upload, Download, Trash2, ArrowRightLeft, CheckCircle2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, PDFImage } from 'pdf-lib';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

type TranslationDirection = 'en-to-es' | 'es-to-en';
type PageStatus = 'pending' | 'rendering' | 'translating' | 'done' | 'error';

interface PageInfo {
  pageNum: number;
  status: PageStatus;
  originalBase64: string;
  translatedBase64: string | null;
  error?: string;
}

export default function PdfTranslator() {
  const { hasKey } = useApiKeys();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [direction, setDirection] = useState<TranslationDirection>('en-to-es');
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');
  const [overallProgress, setOverallProgress] = useState({ done: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setError('Archivo demasiado grande. Máximo 50MB.');
        return;
      }
      if (!file.type.includes('pdf')) {
        setError('Solo se aceptan archivos PDF.');
        return;
      }
      setPdfFile(file);
      setPages([]);
      setError('');
      setOverallProgress({ done: 0, total: 0 });
    }
  };

  const clearFile = () => {
    setPdfFile(null);
    setPages([]);
    setError('');
    setOverallProgress({ done: 0, total: 0 });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Convert PDF page to image (base64 PNG)
  const renderPageToImage = async (pdfDoc: pdfjsLib.PDFDocumentProxy, pageNum: number): Promise<string> => {
    const page = await pdfDoc.getPage(pageNum);
    const scale = 2.0; // High quality
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL('image/png');
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

  // Rebuild PDF from translated images
  const rebuildPdf = async (pages: PageInfo[]): Promise<Uint8Array> => {
    const newPdf = await PDFDocument.create();
    for (const page of pages) {
      if (!page.translatedBase64) continue;
      const imgData = page.translatedBase64.split(',')[1];
      const imgBytes = Uint8Array.from(atob(imgData), c => c.charCodeAt(0));
      const img = await newPdf.embedPng(imgBytes);
      const { width, height } = img.scale(1);
      const pdfPage = newPdf.addPage([width, height]);
      pdfPage.drawImage(img, { x: 0, y: 0, width, height });
    }
    return await newPdf.save();
  };

  const handleTranslate = async () => {
    if (!pdfFile || !hasKey('gemini')) {
      setError(hasKey('gemini') ? 'Primero sube un PDF.' : 'Necesitas configurar tu API key de Gemini en Ajustes.');
      return;
    }

    setLoading(true);
    setError('');
    abortRef.current = false;

    try {
      const keys = JSON.parse(localStorage.getItem('rebka_api_keys') || '{}');
      const apiKey = keys.gemini;

      // Step 1: Load PDF and render pages to images
      setStatusText('Cargando PDF y renderizando páginas...');
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdfDoc.numPages;

      const initialPages: PageInfo[] = [];
      for (let i = 1; i <= numPages; i++) {
        initialPages.push({
          pageNum: i,
          status: 'pending',
          originalBase64: '',
          translatedBase64: null
        });
      }
      setPages(initialPages);
      setOverallProgress({ done: 0, total: numPages });

      // Step 2: Render each page to image
      const renderedPages: PageInfo[] = [];
      for (let i = 0; i < numPages; i++) {
        if (abortRef.current) break;
        setStatusText(`Renderizando página ${i + 1} de ${numPages}...`);
        const base64 = await renderPageToImage(pdfDoc, i + 1);
        renderedPages.push({
          pageNum: i + 1,
          status: 'translating',
          originalBase64: base64,
          translatedBase64: null
        });
        setPages(prev => {
          const copy = [...prev];
          copy[i] = { ...copy[i], status: 'translating', originalBase64: base64 };
          return copy;
        });
      }

      // Step 3: Translate each page
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

      // Step 4: Rebuild PDF
      const donePages = translatedPages.filter(p => p.status === 'done');
      if (donePages.length === 0) {
        throw new Error('No se pudo traducir ninguna página.');
      }

      setStatusText('Reconstruyendo PDF...');
      const pdfBytes = await rebuildPdf(translatedPages);

      // Download
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const originalName = pdfFile.name.replace(/\.pdf$/i, '');
      const suffix = direction === 'en-to-es' ? '_ES' : '_EN';
      saveAs(blob, `${originalName}${suffix}.pdf`);

      setStatusText('¡PDF traducido y descargado!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al procesar el PDF.');
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
            <FileText className="w-6 h-6 text-accent" />
            <h2 className="font-serif text-5xl tracking-tighter leading-[0.8] uppercase">PDF TRANSLATOR.</h2>
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
          <FileText className="w-6 h-6 text-accent" />
          <h2 className="font-serif text-5xl tracking-tighter leading-[0.8] uppercase">PDF TRANSLATOR.</h2>
        </div>

        <p className="font-sans font-semibold text-sm uppercase tracking-wide text-dim border-l-2 border-accent pl-4">
          Traduce documentos PDF completos de inglés a español (o viceversa). Cada página se convierte a imagen, se traduce con Gemini 3.1 Flash manteniendo diseño original, y se reconstruye como PDF. Ideal para infografías, presentaciones y documentos visuales.
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
        {!pdfFile ? (
          <label
            className="w-full h-64 border-2 border-dashed border-dim hover:border-ink hover:bg-gray-50 flex items-center justify-center cursor-pointer transition-colors text-dim font-bold flex-col gap-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file && file.type.includes('pdf')) {
                setPdfFile(file);
                setPages([]);
                setError('');
              }
            }}
          >
            <FileText className="w-10 h-10 text-accent" />
            <span>Arrastra o haz clic para subir PDF</span>
            <span className="text-[10px] font-normal">Máximo 50MB • Solo archivos PDF</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between bg-gray-50 p-4 editorial-border">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-accent" />
                <div>
                  <p className="font-bold text-sm">{pdfFile.name}</p>
                  <p className="text-[10px] text-dim">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
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

            {/* Progress */}
            {pages.length > 0 && (
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

                {/* Page grid */}
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

            <div className="flex gap-3">
              <button
                onClick={handleTranslate}
                disabled={loading}
                className="btn-editorial flex-1 py-4 px-8 editorial-border flex items-center justify-center gap-4 text-sm disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> {statusText || 'PROCESANDO...'}</>
                ) : (
                  <><Languages className="w-5 h-5" /> TRADUCIR PDF</>
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
          </div>
        )}

        {error && <div className="text-accent font-bold uppercase p-4 border border-accent bg-red-50 text-xs">{error}</div>}
      </div>
    </div>
  );
}
