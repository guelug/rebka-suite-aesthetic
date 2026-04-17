import { useState } from 'react';
import { Sparkles, Download, Loader2, Globe, Lightbulb, Wand2, Image as ImageIcon, Upload } from 'lucide-react';

interface StickerSuggestion {
  id: string;
  title: string;
  description: string;
  style: string;
}

interface CompanyInfo {
  name: string;
  colors: string[];
  logo?: string;
  industry?: string;
}

export default function Stickers() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [suggestions, setSuggestions] = useState<StickerSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Sugerencias predefinidas basadas en industrias
  const defaultSuggestions: StickerSuggestion[] = [
    { id: '1', title: 'Logo Clásico', description: 'Tu logo con borde elegante', style: 'minimal' },
    { id: '2', title: 'Mascota Cute', description: 'Versión kawaii de tu marca', style: 'cute' },
    { id: '3', title: 'Emoji Brand', description: 'Emoji representativo de tu negocio', style: 'emoji' },
    { id: '4', title: 'Slogan Sticker', description: 'Tu eslogan en formato sticker', style: 'typography' },
    { id: '5', title: 'Producto Star', description: 'Tu producto estrella ilustrado', style: 'illustration' },
    { id: '6', title: 'Rebca Style', description: 'Diseño con identidad Rebka', style: 'rebka' },
  ];

  const analyzeUrl = async () => {
    if (!url.trim()) return;
    setAnalyzing(true);
    setError('');
    
    try {
      // Simulación de análisis de URL (en producción sería un endpoint real)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Extraer dominio para el nombre
      const domain = new URL(url).hostname.replace('www.', '').split('.')[0];
      const capitalizedName = domain.charAt(0).toUpperCase() + domain.slice(1);
      
      // Simular extracción de colores comunes
      const mockColors = ['#FF6B9D', '#4ECDC4', '#FFE66D', '#2C3E50'];
      
      setCompanyInfo({
        name: capitalizedName,
        colors: mockColors,
        industry: 'Tecnología',
      });
      
      // Generar sugerencias específicas basadas en la empresa
      const customSuggestions: StickerSuggestion[] = [
        { id: 'c1', title: `${capitalizedName} Classic`, description: `Logo estilizado de ${capitalizedName}`, style: 'minimal' },
        { id: 'c2', title: 'Tech Vibes', description: 'Versión tech moderna', style: 'modern' },
        { id: 'c3', title: 'Playful Mascot', description: 'Mascota divertida', style: 'cute' },
        { id: 'c4', title: 'Pro Badge', description: 'Insignia profesional', style: 'badge' },
        { id: 'c5', title: 'Brand Pattern', description: 'Patrón con elementos de marca', style: 'pattern' },
        { id: 'c6', title: 'Emoji Reactions', description: 'Reacciones personalizadas', style: 'emoji' },
      ];
      
      setSuggestions(customSuggestions);
      
    } catch (err: any) {
      setError('Error analizando la URL. Intenta con otra dirección.');
      setSuggestions(defaultSuggestions);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateSticker = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Simular generación
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Aquí iría la llamada real a la API de generación
      // Por ahora usamos un placeholder
      setResultImage('https://via.placeholder.com/512x512/FF6B9D/FFFFFF?text=Sticker+Generado');
      
    } catch (err: any) {
      setError(err.message || 'Error generando sticker');
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (suggestion: StickerSuggestion) => {
    setSelectedSuggestion(suggestion.id);
    setCustomPrompt(`${suggestion.description} - Estilo ${suggestion.style}`);
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="bg-white editorial-border p-6 md:p-8 paper-shadow">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-8 h-8 text-accent" />
          <h2 className="font-serif text-4xl md:text-5xl tracking-tighter leading-[0.9] uppercase">
            Estudio de<br/>Stickers
          </h2>
        </div>
        <p className="font-sans font-semibold text-sm uppercase tracking-wide text-dim border-l-2 border-accent pl-4">
          Crea stickers profesionales para WhatsApp (512×512px, PNG transparente) a partir de tu marca o diseños personalizados.
        </p>
      </div>

      {/* URL Analysis Section */}
      <div className="bg-white editorial-border p-6 md:p-8 paper-shadow">
        <label className="section-label flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Analizar Empresa desde URL
        </label>
        
        <div className="flex gap-3">
          <input
            type="url"
            className="flex-1 p-4 font-sans text-base editorial-border bg-[#F9F9F9] outline-none focus:border-accent transition-colors"
            placeholder="https://tuempresa.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            onClick={analyzeUrl}
            disabled={analyzing || !url.trim()}
            className="btn-editorial py-4 px-6 editorial-border flex items-center gap-2 whitespace-nowrap"
          >
            {analyzing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Analizando...</>
            ) : (
              <><Globe className="w-5 h-5" /> Analizar</>
            )}
          </button>
        </div>

        {/* Company Info */}
        {companyInfo && (
          <div className="mt-6 p-4 bg-gray-50 editorial-border">
            <h3 className="font-serif text-xl mb-3">{companyInfo.name}</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {companyInfo.colors.map((color, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 editorial-border" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-mono">{color}</span>
                </div>
              ))}
            </div>
            {companyInfo.industry && (
              <p className="text-sm text-dim">Industria: {companyInfo.industry}</p>
            )}
          </div>
        )}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-white editorial-border p-6 md:p-8 paper-shadow">
          <label className="section-label flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Sugerencias de Stickers
          </label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => applySuggestion(suggestion)}
                className={`p-4 text-left editorial-border transition-all ${
                  selectedSuggestion === suggestion.id
                    ? 'bg-accent text-white border-accent'
                    : 'bg-white hover:shadow-md'
                }`}
              >
                <h4 className="font-bold text-sm uppercase mb-1">{suggestion.title}</h4>
                <p className={`text-xs ${selectedSuggestion === suggestion.id ? 'text-white/80' : 'text-dim'}`}>
                  {suggestion.description}
                </p>
                <span className={`inline-block mt-2 text-[10px] uppercase tracking-wider px-2 py-1 border ${
                  selectedSuggestion === suggestion.id ? 'border-white/30' : 'border-gray-200'
                }`}>
                  {suggestion.style}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="bg-white editorial-border p-6 md:p-8 paper-shadow">
        <label className="section-label flex items-center gap-2">
          <Upload className="w-4 h-4" />
          O sube tu propia imagen
        </label>
        
        <div className="flex flex-col gap-4">
          <label className="w-full h-32 flex flex-col items-center justify-center editorial-border bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
            {uploadedImage ? (
              <img src={uploadedImage} alt="Uploaded" className="h-full object-contain" />
            ) : (
              <>
                <ImageIcon className="w-8 h-8 text-dim mb-2" />
                <span className="text-sm text-dim">Click para subir imagen</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>

      {/* Custom Prompt */}
      <div className="bg-white editorial-border p-6 md:p-8 paper-shadow">
        <label className="section-label">Descripción personalizada (opcional)</label>
        <textarea
          className="w-full h-24 p-4 font-sans text-base editorial-border bg-[#F9F9F9] outline-none focus:border-accent transition-colors resize-none"
          placeholder="Describe cómo quieres tu sticker..."
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
        />
      </div>

      {/* Generate Button */}
      <button
        onClick={generateSticker}
        disabled={loading || (!url && !uploadedImage)}
        className="btn-editorial py-5 px-8 editorial-border flex items-center justify-center gap-3 text-base paper-shadow"
      >
        {loading ? (
          <><Loader2 className="w-6 h-6 animate-spin" /> GENERANDO STICKER...</>
        ) : (
          <><Wand2 className="w-6 h-6" /> GENERAR STICKER WHATSAPP</>
        )}
      </button>

      {error && (
        <div className="text-accent font-bold uppercase p-4 border border-accent bg-red-50 text-xs">
          {error}
        </div>
      )}

      {/* Result */}
      {resultImage && (
        <div className="bg-white editorial-border p-8 paper-shadow">
          <h3 className="font-serif text-3xl tracking-tighter uppercase mb-6">Resultado</h3>
          
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-[300px] h-[300px] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] editorial-border flex items-center justify-center">
                <img 
                  src={resultImage} 
                  alt="Sticker generado" 
                  className="max-w-[90%] max-h-[90%] object-contain drop-shadow-lg"
                />
              </div>
              <div className="absolute -top-3 -right-3 bg-accent text-white px-3 py-1 text-[10px] uppercase font-bold editorial-border">
                512×512px
              </div>
            </div>
            
            <div className="flex gap-3">
              <a
                href={resultImage}
                download="sticker-whatsapp.png"
                className="btn-editorial-outline px-6 py-3 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                DESCARGAR PNG
              </a>
            </div>
            
            <p className="text-xs text-dim text-center max-w-md">
              Este sticker está optimizado para WhatsApp (512×512px, fondo transparente). 
              Puedes usarlo directamente en tus conversaciones.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}