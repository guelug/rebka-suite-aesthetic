import { useState } from 'react';
import { useApiKeys } from '../context/ApiContext';
import { Music, Loader2, Wand2, Download, Play, Pause } from 'lucide-react';

export default function MusicGenerator() {
  const { hasKey } = useApiKeys();
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<'full' | 'instrumental'>('full');

  const generateMusic = async () => {
    if (!hasKey('minimax')) {
      setError('Necesitas configurar tu API key de Minimax en Ajustes.');
      return;
    }
    if (!prompt.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const apiKey = localStorage.getItem('rebka_api_keys');
      const keys = apiKey ? JSON.parse(apiKey) : {};

      const payload: any = {
        model: 'music-2.6',
        prompt: prompt,
        audio_setting: {
          sample_rate: 44100,
          bitrate: 256000,
          format: 'mp3'
        },
        output_format: 'url'
      };

      if (mode === 'full' && lyrics.trim()) {
        payload.lyrics = lyrics;
      } else {
        payload.is_instrumental = true;
      }

      const response = await fetch('https://api.minimax.io/v1/music_generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keys.minimax}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Minimax API Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.data?.audio_url) {
        setResult(data.data.audio_url);
      } else if (data.data?.file_url) {
        setResult(data.data.file_url);
      } else {
        throw new Error('No se recibió URL de audio');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error generando música');
    } finally {
      setLoading(false);
    }
  };

  const generateLyrics = async () => {
    if (!hasKey('minimax')) {
      setError('Necesitas configurar tu API key de Minimax.');
      return;
    }
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const apiKey = localStorage.getItem('rebka_api_keys');
      const keys = apiKey ? JSON.parse(apiKey) : {};

      const response = await fetch('https://api.minimax.io/v1/lyrics_generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keys.minimax}`
        },
        body: JSON.stringify({
          mode: 'write_full_song',
          prompt: prompt
        })
      });

      if (!response.ok) throw new Error(`Lyrics API Error: ${response.status}`);

      const data = await response.json();
      if (data.data?.lyrics || data.data?.text) {
        setLyrics(data.data.lyrics || data.data.text);
      }
    } catch (err: any) {
      setError(err.message || 'Error generando letras');
    } finally {
      setLoading(false);
    }
  };

  if (!hasKey('minimax')) {
    return (
      <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto p-4 md:p-6 mb-16">
        <div className="bg-white editorial-border p-8 flex flex-col gap-6 shadow-[10px_10px_0_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-3">
            <Music className="w-6 h-6 text-accent" />
            <h2 className="font-serif text-5xl tracking-tighter leading-[0.8] uppercase">MÚSICA AI.</h2>
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
          <Music className="w-6 h-6 text-accent" />
          <h2 className="font-serif text-5xl tracking-tighter leading-[0.8] uppercase">MÚSICA AI.</h2>
        </div>

        <p className="font-sans font-semibold text-sm uppercase tracking-wide text-dim border-l-2 border-accent pl-4">
          Genera música completa con letras o instrumental usando Minimax Music 2.6
        </p>

        {/* Mode selector */}
        <div className="flex border-2 border-ink bg-gray-50 text-xs font-bold uppercase tracking-widest overflow-hidden">
          <button
            onClick={() => setMode('full')}
            className={`flex-1 px-4 py-3 transition-colors ${mode === 'full' ? 'bg-ink text-white' : 'hover:bg-gray-200 text-ink'}`}
          >
            CON LETRAS
          </button>
          <button
            onClick={() => setMode('instrumental')}
            className={`flex-1 px-4 py-3 border-l-2 border-ink transition-colors ${mode === 'instrumental' ? 'bg-ink text-white' : 'hover:bg-gray-200 text-ink'}`}
          >
            INSTRUMENTAL
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <textarea
            className="w-full h-24 p-4 font-sans text-sm editorial-border bg-[#F9F9F9] outline-none focus:border-accent transition-colors resize-none"
            placeholder="Describe el estilo: Soulful Blues, Rainy Night, Electric Guitar, Male Vocals..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
          />

          {mode === 'full' && (
            <div className="flex flex-col gap-2">
              <textarea
                className="w-full h-48 p-4 font-mono text-xs editorial-border bg-[#F9F9F9] outline-none focus:border-accent transition-colors resize-none"
                placeholder="Pega aquí las letras... o usa el botón GENERAR LETRAS para crearlas automáticamente"
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                disabled={loading}
              />
              <button
                onClick={generateLyrics}
                disabled={loading || !prompt.trim()}
                className="self-end btn-editorial px-4 py-2 text-xs editorial-border disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                GENERAR LETRAS
              </button>
            </div>
          )}
        </div>

        <button
          onClick={generateMusic}
          disabled={loading || !prompt.trim()}
          className="btn-editorial w-full py-4 px-8 editorial-border flex items-center justify-center gap-4 text-sm disabled:opacity-50"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> COMPONIENDO...</>
          ) : (
            <><Music className="w-5 h-5" /> GENERAR MÚSICA</>
          )}
        </button>

        {error && <div className="text-accent font-bold uppercase p-4 border border-accent bg-red-50 text-xs">{error}</div>}
      </div>

      {result && (
        <div className="bg-white editorial-border p-8 flex flex-col gap-6 shadow-[10px_10px_0_rgba(0,0,0,0.05)]">
          <h2 className="font-serif text-4xl tracking-tighter leading-[0.8] self-start uppercase">RESULTADO.</h2>
          
          <div className="flex flex-col items-center gap-4">
            <audio
              src={result}
              controls
              className="w-full max-w-md"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
            
            <div className="flex gap-2 w-full max-w-md">
              <a
                href={result}
                download="rebka-music.mp3"
                className="flex-1 btn-editorial bg-transparent text-ink editorial-border px-4 py-3 text-xs flex items-center justify-center gap-2 hover:bg-ink hover:text-white transition-colors"
              >
                <Download className="w-4 h-4" /> DESCARGAR MP3
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
