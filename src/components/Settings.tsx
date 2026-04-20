import { useState } from 'react';
import { useApiKeys } from '../context/ApiContext';
import { KeyRound, Eye, EyeOff, Save, Check, X } from 'lucide-react';

interface SettingsProps {
  onClose?: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const { keys, setKey, hasKey } = useApiKeys();
  const [showGemini, setShowGemini] = useState(false);
  const [showMinimax, setShowMinimax] = useState(false);
  const [geminiInput, setGeminiInput] = useState(keys.gemini);
  const [minimaxInput, setMinimaxInput] = useState(keys.minimax);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setKey('gemini', geminiInput);
    setKey('minimax', minimaxInput);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl mx-auto">
      <div className="bg-white editorial-border p-8 flex flex-col gap-6 shadow-[10px_10px_0_rgba(0,0,0,0.05)] relative">
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-ink" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <KeyRound className="w-6 h-6 text-accent" />
          <h2 className="font-serif text-4xl tracking-tighter leading-[0.8] uppercase">AJUSTES.</h2>
        </div>

        <p className="font-sans font-semibold text-sm uppercase tracking-wide text-dim border-l-2 border-accent pl-4">
          Configura tus API keys para usar Gemini, Minimax, y todas las funciones de la suite.
        </p>

        <div className="flex flex-col gap-6">
          {/* Gemini API Key */}
          <div className="flex flex-col gap-3">
            <label className="font-bold text-xs uppercase tracking-widest text-ink flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${hasKey('gemini') ? 'bg-green-500' : 'bg-red-400'}`} />
              Gemini API Key
            </label>
            <div className="relative">
              <input
                type={showGemini ? 'text' : 'password'}
                className="w-full p-4 font-sans text-sm editorial-border bg-[#F9F9F9] outline-none focus:border-accent transition-colors pr-12"
                placeholder="AIzaSy..."
                value={geminiInput}
                onChange={(e) => setGeminiInput(e.target.value)}
              />
              <button
                onClick={() => setShowGemini(!showGemini)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-ink transition-colors"
              >
                {showGemini ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-[10px] text-dim font-mono">
              Necesaria para: Stickers (imagen), Research con Google Search
            </p>
          </div>

          {/* Minimax API Key */}
          <div className="flex flex-col gap-3">
            <label className="font-bold text-xs uppercase tracking-widest text-ink flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${hasKey('minimax') ? 'bg-green-500' : 'bg-red-400'}`} />
              Minimax API Key
            </label>
            <div className="relative">
              <input
                type={showMinimax ? 'text' : 'password'}
                className="w-full p-4 font-sans text-sm editorial-border bg-[#F9F9F9] outline-none focus:border-accent transition-colors pr-12"
                placeholder="Bearer token..."
                value={minimaxInput}
                onChange={(e) => setMinimaxInput(e.target.value)}
              />
              <button
                onClick={() => setShowMinimax(!showMinimax)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-ink transition-colors"
              >
                {showMinimax ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-[10px] text-dim font-mono">
              Necesaria para: Stickers (alternativa), Música AI, Voice Clone, Speech
            </p>
          </div>

          <button
            onClick={handleSave}
            className="btn-editorial w-full py-4 px-8 editorial-border flex items-center justify-center gap-4 text-sm mt-4"
          >
            {saved ? (
              <><Check className="w-5 h-5" /> GUARDADO</>
            ) : (
              <><Save className="w-5 h-5" /> GUARDAR API KEYS</>
            )}
          </button>
        </div>

        <div className="bg-[#F9F9F9] p-4 border border-dim text-xs font-mono text-dim space-y-1">
          <p className="font-bold text-ink">PROVEEDORES SOPORTADOS:</p>
          <p>• Gemini (Google): Image Gen, Google Search, JSON mode</p>
          <p>• Minimax: Image Gen, Music Gen, Voice Clone, TTS</p>
          <p className="mt-2 text-accent">Las keys se guardan localmente en tu navegador (localStorage).</p>
        </div>
      </div>
    </div>
  );
}
