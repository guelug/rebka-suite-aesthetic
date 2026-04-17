import { useState } from 'react';
import { Shirt, Download, Loader2, Palette, Layers, ShoppingBag } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  mockup: string;
  colors: string[];
}

interface DesignElement {
  type: 'text' | 'image' | 'logo';
  content: string;
  position: { x: number; y: number };
}

export default function Merchandising() {
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [elements, setElements] = useState<DesignElement[]>([]);

  const products: Product[] = [
    { id: 'tshirt', name: 'Camiseta', description: '100% algodón, varias tallas', mockup: 'tshirt', colors: ['#FFFFFF', '#000000', '#FF6B9D', '#4ECDC4'] },
    { id: 'mug', name: 'Taza', description: 'Cerámica premium 11oz', mockup: 'mug', colors: ['#FFFFFF', '#000000', '#2C3E50'] },
    { id: 'tote', name: 'Tote Bag', description: 'Algodón orgánico', mockup: 'tote', colors: ['#F5F5DC', '#000000', '#FFFFFF'] },
    { id: 'hoodie', name: 'Hoodie', description: 'Suave interior fleece', mockup: 'hoodie', colors: ['#000000', '#808080', '#FFFFFF'] },
  ];

  const generateDesign = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setResultUrl('/api/download/merchandising/design.png');
    setLoading(false);
  };

  const selectedProductData = products.find(p => p.id === selectedProduct);

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="bg-white editorial-border p-6 md:p-8 paper-shadow">
        <div className="flex items-center gap-3 mb-4">
          <ShoppingBag className="w-8 h-8 text-accent" />
          <h2 className="font-serif text-4xl md:text-5xl tracking-tighter leading-[0.9] uppercase">
            Diseñador de<br/>Merchandising
          </h2>
        </div>
        <p className="font-sans font-semibold text-sm uppercase tracking-wide text-dim border-l-2 border-accent pl-4">
          Crea diseños para camisetas, tazas, tote bags y más.
        </p>
      </div>

      {/* Products */}
      <div className="bg-white editorial-border p-6 md:p-8 paper-shadow">
        <label className="section-label flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Selecciona Producto
        </label>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => setSelectedProduct(product.id)}
              className={`p-4 text-center editorial-border transition-all ${
                selectedProduct === product.id
                  ? 'bg-ink text-white shadow-[4px_4px_0_#FF6B9D]'
                  : 'bg-white hover:shadow-md'
              }`}
            >
              <Shirt className="w-8 h-8 mx-auto mb-2" />
              <h4 className="font-bold text-sm uppercase">{product.name}</h4>
              <p className={`text-[10px] mt-1 ${selectedProduct === product.id ? 'text-white/60' : 'text-dim'}`}>
                {product.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Color Selection */}
      {selectedProductData && (
        <div className="bg-white editorial-border p-6 md:p-8 paper-shadow">
          <label className="section-label flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Color del Producto
          </label>
          
          <div className="flex gap-3 flex-wrap">
            {selectedProductData.colors.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-12 h-12 editorial-border transition-all ${
                  selectedColor === color ? 'shadow-[3px_3px_0_#FF6B9D] scale-110' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Design Elements */}
      <div className="bg-white editorial-border p-6 md:p-8 paper-shadow">
        <label className="section-label">Elementos de Diseño</label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            className="w-full p-4 font-sans text-base editorial-border bg-[#F9F9F9] outline-none focus:border-accent transition-colors"
            placeholder="Texto principal"
          />
          <input
            type="file"
            accept="image/*"
            className="w-full p-4 font-sans text-sm editorial-border bg-[#F9F9F9] outline-none focus:border-accent transition-colors file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-bold file:bg-ink file:text-white hover:file:bg-accent"
          />
        </div>
      </div>

      {/* Generate */}
      <button
        onClick={generateDesign}
        disabled={loading || !selectedProduct}
        className="btn-editorial py-5 px-8 editorial-border flex items-center justify-center gap-3 text-base paper-shadow"
      >
        {loading ? (
          <><Loader2 className="w-6 h-6 animate-spin" /> DISEÑANDO...</>
        ) : (
          <><Shirt className="w-6 h-6" /> GENERAR MOCKUP</>
        )}
      </button>

      {/* Result */}
      {resultUrl && (
        <div className="bg-white editorial-border p-8 paper-shadow">
          <h3 className="font-serif text-2xl mb-4">Mockup Generado</h3>
          <img src={resultUrl} alt="Mockup" className="w-full max-w-md mx-auto mb-4 editorial-border" />
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
    </div>
  );
}