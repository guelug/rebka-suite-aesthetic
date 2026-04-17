import { useState } from 'react';
import { Presentation, Download, Loader2, FileText, Palette, Layout, CheckCircle } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  slides: number;
  style: string;
}

interface PresentationData {
  title: string;
  subtitle: string;
  company: string;
  content: string;
}

export default function Presentations() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [data, setData] = useState<PresentationData>({
    title: '',
    subtitle: '',
    company: '',
    content: ''
  });

  const templates: Template[] = [
    { id: 'corporate', name: 'Corporate', description: 'Profesional y elegante para empresas', slides: 8, style: 'corporate' },
    { id: 'pitch', name: 'Pitch Deck', description: 'Para presentaciones de venta e inversores', slides: 10, style: 'pitch' },
    { id: 'portfolio', name: 'Portfolio', description: 'Muestra tus trabajos y proyectos', slides: 12, style: 'creative' },
    { id: 'minimal', name: 'Minimal', description: 'Diseño limpio y minimalista', slides: 6, style: 'minimal' },
    { id: 'creative', name: 'Creative', description: 'Bold y creativo para ideas innovadoras', slides: 8, style: 'creative' },
  ];

  const generatePresentation = async () => {
    setLoading(true);
    // Simular generación
    await new Promise(resolve => setTimeout(resolve, 3000));
    setResultUrl('/api/download/presentations/ejemplo.pptx');
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="bg-white editorial-border p-6 md:p-8 paper-shadow">
        <div className="flex items-center gap-3 mb-4">
          <Presentation className="w-8 h-8 text-accent" />
          <h2 className="font-serif text-4xl md:text-5xl tracking-tighter leading-[0.9] uppercase">
            Creador de<br/>Presentaciones
          </h2>
        </div>
        <p className="font-sans font-semibold text-sm uppercase tracking-wide text-dim border-l-2 border-accent pl-4">
          Genera presentaciones profesionales con branding REBKA en segundos.
        </p>
      </div>

      {/* Templates */}
      <div className="bg-white editorial-border p-6 md:p-8 paper-shadow">
        <label className="section-label flex items-center gap-2">
          <Layout className="w-4 h-4" />
          Selecciona una Plantilla
        </label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template.id)}
              className={`p-5 text-left editorial-border transition-all ${
                selectedTemplate === template.id
                  ? 'bg-ink text-white shadow-[4px_4px_0_#FF6B9D]'
                  : 'bg-white hover:shadow-md'
              }`}
            >
              <h4 className="font-serif text-xl mb-2">{template.name}</h4>
              <p className={`text-sm mb-3 ${selectedTemplate === template.id ? 'text-white/70' : 'text-dim'}`}>
                {template.description}
              </p>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] uppercase tracking-wider px-2 py-1 border ${
                  selectedTemplate === template.id ? 'border-white/30' : 'border-gray-300'
                }`}>
                  {template.slides} slides
                </span>
                <span className={`text-[10px] uppercase tracking-wider ${
                  selectedTemplate === template.id ? 'text-white/60' : 'text-dim'
                }`}>
                  {template.style}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="bg-white editorial-border p-6 md:p-8 paper-shadow">
        <label className="section-label flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Información de la Presentación
        </label>
        
        <div className="flex flex-col gap-4">
          <input
            type="text"
            className="w-full p-4 font-sans text-base editorial-border bg-[#F9F9F9] outline-none focus:border-accent transition-colors"
            placeholder="Título de la presentación"
            value={data.title}
            onChange={(e) => setData({...data, title: e.target.value})}
          />
          <input
            type="text"
            className="w-full p-4 font-sans text-base editorial-border bg-[#F9F9F9] outline-none focus:border-accent transition-colors"
            placeholder="Subtítulo"
            value={data.subtitle}
            onChange={(e) => setData({...data, subtitle: e.target.value})}
          />
          <input
            type="text"
            className="w-full p-4 font-sans text-base editorial-border bg-[#F9F9F9] outline-none focus:border-accent transition-colors"
            placeholder="Nombre de la empresa"
            value={data.company}
            onChange={(e) => setData({...data, company: e.target.value})}
          />
          <textarea
            className="w-full h-32 p-4 font-sans text-base editorial-border bg-[#F9F9F9] outline-none focus:border-accent transition-colors resize-none"
            placeholder="Contenido principal (puntos clave, descripción, etc.)"
            value={data.content}
            onChange={(e) => setData({...data, content: e.target.value})}
          />
        </div>
      </div>

      {/* Generate */}
      <button
        onClick={generatePresentation}
        disabled={loading || !selectedTemplate}
        className="btn-editorial py-5 px-8 editorial-border flex items-center justify-center gap-3 text-base paper-shadow"
      >
        {loading ? (
          <><Loader2 className="w-6 h-6 animate-spin" /> GENERANDO PPTX...</>
        ) : (
          <><Presentation className="w-6 h-6" /> CREAR PRESENTACIÓN</>
        )}
      </button>

      {/* Result */}
      {resultUrl && (
        <div className="bg-white editorial-border p-8 paper-shadow">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <h3 className="font-serif text-2xl">¡Presentación lista!</h3>
          </div>
          <a
            href={resultUrl}
            download
            className="btn-editorial-outline px-6 py-3 inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            DESCARGAR PPTX
          </a>
        </div>
      )}
    </div>
  );
}