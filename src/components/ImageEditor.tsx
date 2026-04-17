import { useState, useRef } from 'react';
import { Palette, Download, Loader2, Upload, RefreshCw, Sun, Contrast, Droplet, Blur, Crop, RotateCw, FlipHorizontal, Type } from 'lucide-react';

interface Filter {
  id: string;
  name: string;
  icon: React.ReactNode;
}

export default function ImageEditor() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [adjustments, setAdjustments] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filters: Filter[] = [
    { id: 'grayscale', name: 'B&W', icon: <Contrast className="w-4 h-4" /> },
    { id: 'sepia', name: 'Sepia', icon: <Sun className="w-4 h-4" /> },
    { id: 'vintage', name: 'Vintage', icon: <Droplet className="w-4 h-4" /> },
    { id: 'blur', name: 'Blur', icon: <Blur className="w-4 h-4" /> },
    { id: 'enhance', name: 'Enhance', icon: <RefreshCw className="w-4 h-4" /> },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const applyEdit = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setResultUrl(image);
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="bg-white editorial-border p-6 md:p-8 paper-shadow">
        <div className="flex items-center gap-3 mb-4">
          <Palette className="w-8 h-8 text-accent" />
          <h2 className="font-serif text-4xl md:text-5xl tracking-tighter leading-[0.9] uppercase">
            Editor de<br/>Imágenes
          </h2>
        </div>
        <p className="font-sans font-semibold text-sm uppercase tracking-wide text-dim border-l-2 border-accent pl-4">
          Edita, ajusta y mejora tus imágenes con filtros profesionales.
        </p>
      </div>

      {/* Upload */}
      {!image && (
        <div className="bg-white editorial-border p-8 md:p-12 paper-shadow">
          <label
            className="flex flex-col items-center justify-center h-64 editorial-border bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 text-dim mb-4" />
            <span className="text-lg font-bold uppercase tracking-wider">Subir Imagen</span>
            <span className="text-sm text-dim mt-2">Click para seleccionar archivo</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      )}

      {/* Editor */}
      {image && (
        <>
          {/* Image Preview */}
          <div className="bg-white editorial-border p-6 paper-shadow">
            <div className="relative">
              <img
                src={image}
                alt="Edit"
                className="w-full max-h-[500px] object-contain editorial-border"
              />
              <button
                onClick={() => setImage(null)}
                className="absolute top-2 right-2 btn-editorial px-3 py-1 text-xs"
              >
                Cambiar
              </button>
            </div>
          </div>

          {/* Tools */}
          <div className="bg-white editorial-border p-6 md:p-8 paper-shadow">
            <label className="section-label flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Filtros y Efectos
            </label>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`style-tag flex items-center gap-2 ${activeFilter === filter.id ? 'selected' : ''}`}
                >
                  {filter.icon}
                  {filter.name}
                </button>
              ))}
            </div>

            {/* Adjustments */}
            <div className="space-y-4">
              {Object.entries(adjustments).map(([key, value]) => (
                <div key={key} className="flex items-center gap-4">
                  <span className="text-xs uppercase font-bold w-24">{key}</span>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={value}
                    onChange={(e) => setAdjustments({...adjustments, [key]: parseInt(e.target.value)})}
                    className="flex-1 accent-[#FF6B9D]"
                  />
                  <span className="text-xs font-mono w-12">{value}%</span>
                </div>
              ))}
            </div>

            {/* Transform Tools */}
            <div className="flex gap-2 mt-6 pt-6 border-t border-gray-200">
              <button className="btn-editorial-outline px-4 py-2 flex items-center gap-2 text-xs">
                <Crop className="w-4 h-4" /> Recortar
              </button>
              <button className="btn-editorial-outline px-4 py-2 flex items-center gap-2 text-xs">
                <RotateCw className="w-4 h-4" /> Rotar
              </button>
              <button className="btn-editorial-outline px-4 py-2 flex items-center gap-2 text-xs">
                <FlipHorizontal className="w-4 h-4" /> Voltear
              </button>
              <button className="btn-editorial-outline px-4 py-2 flex items-center gap-2 text-xs">
                <Type className="w-4 h-4" /> Texto
              </button>
            </div>
          </div>

          {/* Apply */}
          <button
            onClick={applyEdit}
            disabled={loading}
            className="btn-editorial py-5 px-8 editorial-border flex items-center justify-center gap-3 text-base paper-shadow"
          >
            {loading ? (
              <><Loader2 className="w-6 h-6 animate-spin" /> APLICANDO...</>
            ) : (
              <><RefreshCw className="w-6 h-6" /> APLICAR EDICIÓN</>
            )}
          </button>

          {/* Result */}
          {resultUrl && (
            <div className="bg-white editorial-border p-8 paper-shadow">
              <h3 className="font-serif text-2xl mb-4">Resultado</h3>
              <img src={resultUrl} alt="Result" className="w-full mb-4 editorial-border" />
              <a
                href={resultUrl}
                download
                className="btn-editorial-outline px-6 py-3 inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                DESCARGAR
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}