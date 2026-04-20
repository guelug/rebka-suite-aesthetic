import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ApiKeys {
  gemini: string;
  minimax: string;
}

interface ApiContextType {
  keys: ApiKeys;
  setKey: (provider: keyof ApiKeys, key: string) => void;
  hasKey: (provider: keyof ApiKeys) => boolean;
}

const ApiContext = createContext<ApiContextType | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const [keys, setKeys] = useState<ApiKeys>(() => {
    const saved = localStorage.getItem('rebka_api_keys');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { gemini: '', minimax: '' };
      }
    }
    return { gemini: '', minimax: '' };
  });

  useEffect(() => {
    localStorage.setItem('rebka_api_keys', JSON.stringify(keys));
  }, [keys]);

  const setKey = (provider: keyof ApiKeys, key: string) => {
    setKeys(prev => ({ ...prev, [provider]: key }));
  };

  const hasKey = (provider: keyof ApiKeys) => {
    return keys[provider]?.trim().length > 0;
  };

  return (
    <ApiContext.Provider value={{ keys, setKey, hasKey }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApiKeys() {
  const context = useContext(ApiContext);
  if (!context) throw new Error('useApiKeys must be used within ApiProvider');
  return context;
}
