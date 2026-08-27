import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { adminApi } from '@/src/lib/adminApi';
import type { LifeDashboardPayload, LifeDashboardState } from '@/src/lib/types';

type LifeDashboardContextValue = {
  dashboard: LifeDashboardState | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<LifeDashboardState | null>;
  /** Optimistic local replace (does not persist). */
  setDashboard: Dispatch<SetStateAction<LifeDashboardState | null>>;
  savePayload: (payload: LifeDashboardPayload) => Promise<void>;
  saveLayout: (layout: LifeDashboardState['layout']) => Promise<void>;
  patchPayload: (patch: Partial<LifeDashboardPayload>) => Promise<void>;
};

const LifeDashboardContext = createContext<LifeDashboardContextValue | null>(null);

export function LifeDashboardProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [dashboard, setDashboard] = useState<LifeDashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setDashboard(null);
      setError(null);
      return null;
    }
    try {
      const dash = await adminApi.lifeDashboard();
      setDashboard(dash);
      setError(null);
      return dash;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard';
      setError(message);
      throw err;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setDashboard(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        await refresh();
      } catch {
        /* error state set in refresh */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, refresh]);

  const savePayload = useCallback(
    async (nextPayload: LifeDashboardPayload) => {
      setDashboard((prev) => (prev ? { ...prev, payload: nextPayload } : prev));
      try {
        await adminApi.saveLifeDashboard({ payload: nextPayload });
      } catch (err) {
        await refresh().catch(() => null);
        throw err;
      }
    },
    [refresh]
  );

  const saveLayout = useCallback(
    async (layout: LifeDashboardState['layout']) => {
      setDashboard((prev) => (prev ? { ...prev, layout } : prev));
      try {
        await adminApi.saveLifeDashboard({ layout });
      } catch (err) {
        await refresh().catch(() => null);
        throw err;
      }
    },
    [refresh]
  );

  const patchPayload = useCallback(
    async (patch: Partial<LifeDashboardPayload>) => {
      let next: LifeDashboardPayload | null = null;
      setDashboard((prev) => {
        if (!prev) return prev;
        next = { ...prev.payload, ...patch };
        return { ...prev, payload: next };
      });
      if (!next) return;
      try {
        await adminApi.saveLifeDashboard({ payload: next });
      } catch (err) {
        await refresh().catch(() => null);
        throw err;
      }
    },
    [refresh]
  );

  const value = useMemo(
    () => ({
      dashboard,
      loading,
      error,
      refresh,
      setDashboard,
      savePayload,
      saveLayout,
      patchPayload,
    }),
    [dashboard, loading, error, refresh, savePayload, saveLayout, patchPayload]
  );

  return (
    <LifeDashboardContext.Provider value={value}>{children}</LifeDashboardContext.Provider>
  );
}

export function useLifeDashboard(): LifeDashboardContextValue {
  const ctx = useContext(LifeDashboardContext);
  if (!ctx) throw new Error('useLifeDashboard must be used within LifeDashboardProvider');
  return ctx;
}
