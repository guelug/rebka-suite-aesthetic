import { useState, useRef } from 'react';
import { useApiKeys } from '../context/ApiContext';
import { Mic, Loader2, Upload, Play, Download, Trash2, Volume2 } from 'lucide-react';

export default function VoiceClone() {
  const { hasKey } = useApiKeys();
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'upload' | 'clone' | 'speak'>('upload');
  const [voiceId, setVoiceId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        setError('Archivo demasiado grande. Máximo 20MB.');
        return;
      }
      if (!['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a'].includes(file.type)) {
        setError('Formato no soportado. Usa MP3, WAV o M4A.');
        return;
      }
      setSourceFile(file);
      setError('');
    }
  };

  const uploadAndClone = async () => {
    if (!sourceFile || !hasKey('minimax')) return;

    setLoading(true);
    setError('');

    try {
      const apiKey = localStorage.getItem('rebka_api_keys');
      const keys = apiKey ? JSON.parse(apiKey) : {};

      // 1. Upload source audio
      const formData = new FormData();
      formData.append('purpose', 'voice_clone');
      formData.append('file', sourceFile);

      const uploadRes = await fetch('https://api.minimax.io/v1/files/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${keys.minimax}` },
        body: formData
      });

      if (!uploadRes.ok) throw new Error(`Upload Error: ${uploadRes.status}`);
      const uploadData = await uploadRes.json();
      const fileId = uploadData.file?.file_id;

      if (!fileId) throw new Error('No se obtuvo file_id del upload');

      // 2. Clone voice
      const customVoiceId = `rebka-voice-${Date.now()}`;
      const cloneRes = await fetch('https://api.minimax.io/v1/voice_clone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keys.minimax}`
        },
        body: JSON.stringify({
          file_id: fileId,
          voice_id: customVoiceId,
          text: "A gentle breeze passes over the soft grass.",
          model: "speech-2.8-hd"
        })
      });

      if (!cloneRes.ok) throw new Error(`Clone Error: ${cloneRes.status}`);
      
      setVoiceId(customVoiceId);
      setStep('speak');
      setResult(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error clonando voz');
    } finally {
      setLoading(false);
    }
  };

  const synthesize = async () => {
    if (!voiceId || !text.trim() || !hasKey('minimax')) return;

    setLoading(true);
    setError('');

    try {
      const apiKey = localStorage.getItem('rebka_api_keys');
      const keys = apiKey ? JSON.parse(apiKey) : {};

      const res = await fetch('https://api.minimax.io/v1/voice_clone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keys.minimax}`
        },
        body: JSON.stringify({
          voice_id: voiceId,
          text: text,
          model: "speech-2.8-hd"
        })
      });

      if (!res.ok) throw new Error(`TTS Error: ${res.status}`);
      const data = await res.json();
      
      // Try to get audio from response
      if (data.data?.audio_url || data.audio_url || data.file_url) {
        setResult(data.data?.audio_url || data.audio_url || data.file_url);
      } else {
        // If response has base64 audio inline
        const audioData = data.data?.audio_base64 || data.audio_base64;
        if (audioData) {
          setResult(`data:audio/mp3;base64,${audioData}`);
        } else {
          throw new Error('No se recibió audio');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error generando voz');
    } finally {
      setLoading(false);
    }
  };

  if (!hasKey('minimax')) {
    return (
      <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto p-4 md:p-6 mb-16">
        <div className="bg-white editorial-border p-8 flex flex-col gap-6 shadow-[10px_10px_0_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-3">
            <Mic className="w-6 h-6 text-accent" />
            <h2 className="font-serif text-5xl tracking-tighter leading-[0.8] uppercase">VOICE CLONE.</h2>
          </div>
          <div className="text-accent font-bold uppercase p-4 border border-accent bg-red-50 text-xs">
            Configura tu API key de Minimax en Ajustes para usar esta función.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto p-4 md:p-6 mb-16">
      <div className="bg-white editorial-border p-8 flex flex-col gap-6 shadow-[10px_10px_0_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-3">
          <Mic className="w-6 h-6 text-accent" />
          <h2 className="font-serif text-5xl tracking-tighter leading-[0.8] uppercase">VOICE CLONE.</h2>
        </div>

        <p className="font-sans font-semibold text-sm uppercase tracking-wide text-dim border-l-2 border-accent pl-4">
          Clona cualquier voz con solo 10 segundos de audio. Luego hazla hablar con cualquier texto.
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
          <div className={`px-3 py-1 ${step === 'upload' ? 'bg-ink text-white' : 'bg-gray-100 text-dim'}`}>1. SUBIR</div>
          <div className="text-dim">→</div>
          <div className={`px-3 py-1 ${step === 'speak' ? 'bg-ink text-white' : 'bg-gray-100 text-dim'}`}>2. HABLAR</div>
        </div>

        {step === 'upload' && (
          <div className="flex flex-col gap-4">
            {!sourceFile ? (
              <label 
                className="w-full h-48 border-2 border-dashed border-dim hover:border-ink hover:bg-gray-50 flex items-center justify-center cursor-pointer transition-colors text-dim font-bold text-sm flex-col gap-2"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    if (file.size > 20 * 1024 * 1024) {
                      setError('Archivo demasiado grande. Máximo 20MB.');
                      return;
                    }
                    setSourceFile(file);
                    setError('');
                  }
                }}
              >
                <Upload className="w-8 h-8 text-accent" />
                Arrastra o haz clic para subir audio (MP3, WAV, M4A)
                <span className="text-[10px] font-mono">Mínimo 10 segundos, máximo 5 minutos, máximo 20MB</span>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="audio/*" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-4 border-2 border-ink bg-gray-50">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-accent" />
                  <div>
                    <p className="font-bold text-sm">{sourceFile.name}</p>
                    <p className="text-[10px] text-dim font-mono">{(sourceFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSourceFile(null)}
                  className="text-dim hover:text-accent transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {sourceFile && (
              <button
                onClick={uploadAndClone}
                disabled={loading}
                className="btn-editorial w-full py-4 px-8 editorial-border flex items-center justify-center gap-4 text-sm disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> CLONANDO VOZ...</>
                ) : (
                  <><Mic className="w-5 h-5" /> CLONAR VOZ</>
                )}
              </button>
            )}
          </div>
        )}

        {step === 'speak' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-800 text-xs font-bold">
              <CheckIcon className="w-4 h-4" />
              Voz clonada exitosamente: {voiceId}
            </div>

            <textarea
              className="w-full h-32 p-4 font-sans text-sm editorial-border bg-[#F9F9F9] outline-none focus:border-accent transition-colors resize-none"
              placeholder="Escribe aquí lo que quieres que diga la voz clonada..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
            />

            <div className="flex gap-2">
              <button
                onClick={() => setStep('upload')}
                className="btn-editorial flex-1 py-3 px-4 editorial-border text-xs bg-white text-ink hover:bg-gray-100"
              >
                CLONAR OTRA VOZ
              </button>
              <button
                onClick={synthesize}
                disabled={loading || !text.trim()}
                className="btn-editorial flex-[2] py-3 px-4 editorial-border text-sm disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> GENERANDO...</>
                ) : (
                  <><Play className="w-4 h-4" /> HABLAR</>
                )}
              </button>
            </div>
          </div>
        )}

        {error && <div className="text-accent font-bold uppercase p-4 border border-accent bg-red-50 text-xs">{error}</div>}
      </div>

      {result && (
        <div className="bg-white editorial-border p-8 flex flex-col gap-6 shadow-[10px_10px_0_rgba(0,0,0,0.05)]">
          <h2 className="font-serif text-4xl tracking-tighter leading-[0.8] self-start uppercase">RESULTADO.</h2>
          
          <div className="flex flex-col items-center gap-4">
            <audio src={result} controls className="w-full max-w-md" />
            <a
              href={result}
              download="rebka-voice.mp3"
              className="btn-editorial bg-transparent text-ink editorial-border px-4 py-3 text-xs flex items-center justify-center gap-2 hover:bg-ink hover:text-white transition-colors"
            >
              <Download className="w-4 h-4" /> DESCARGAR AUDIO
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
