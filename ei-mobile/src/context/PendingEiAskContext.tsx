import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

type PendingEiAskState = {
  setPendingEiAsk: (message: string) => void;
  consumePendingEiAsk: () => string | null;
};

const PendingEiAskContext = createContext<PendingEiAskState | null>(null);

/** Camera → Dashboard Ask Ei handoff. Survives tab remounts while the app is open. */
export function PendingEiAskProvider({ children }: { children: ReactNode }) {
  const pendingRef = useRef<string | null>(null);

  const setPendingEiAsk = useCallback((message: string) => {
    const trimmed = message.trim();
    pendingRef.current = trimmed || null;
  }, []);

  const consumePendingEiAsk = useCallback(() => {
    const next = pendingRef.current;
    pendingRef.current = null;
    return next;
  }, []);

  const value = useMemo(
    () => ({ setPendingEiAsk, consumePendingEiAsk }),
    [setPendingEiAsk, consumePendingEiAsk]
  );

  return (
    <PendingEiAskContext.Provider value={value}>{children}</PendingEiAskContext.Provider>
  );
}

export function usePendingEiAsk(): PendingEiAskState {
  const ctx = useContext(PendingEiAskContext);
  if (!ctx) throw new Error('usePendingEiAsk must be used within PendingEiAskProvider');
  return ctx;
}
