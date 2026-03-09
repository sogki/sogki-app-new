import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { fetchKeys, clearKeysCache } from '../lib/keys';

type KeysState = {
  keys: Record<string, string>;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

const KeysContext = createContext<KeysState | null>(null);

export function KeysProvider({ children }: { children: ReactNode }) {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      clearKeysCache();
      const fetched = await fetchKeys();
      setKeys(fetched);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const value: KeysState = {
    keys,
    loading,
    error,
    refetch: loadKeys,
  };

  return <KeysContext.Provider value={value}>{children}</KeysContext.Provider>;
}

export function useKeys(): KeysState {
  const ctx = useContext(KeysContext);
  if (!ctx) {
    throw new Error('useKeys must be used within a KeysProvider');
  }
  return ctx;
}

export function useKey(key: string): string | undefined {
  const { keys } = useKeys();
  return keys[key];
}
