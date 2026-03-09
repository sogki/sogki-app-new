import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { SUPABASE_URL } from '../config/bootstrap';
import { getAdminToken, setAdminToken, clearAdminToken } from '../lib/adminApi';

type AdminAuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (discordClientId: string) => void;
  logout: () => void;
  handleCallback: (token: string) => void;
};

const AdminAuthContext = createContext<AdminAuthState | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsAuthenticated(!!getAdminToken());
    setIsLoading(false);
  }, []);

  const login = useCallback((discordClientId: string) => {
    const redirectUri = encodeURIComponent(
      `${SUPABASE_URL}/functions/v1/auth-discord-callback`
    );
    const url = `https://discord.com/api/oauth2/authorize?client_id=${discordClientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify`;
    window.location.href = url;
  }, []);

  const logout = useCallback(() => {
    clearAdminToken();
    setIsAuthenticated(false);
  }, []);

  const handleCallback = useCallback((token: string) => {
    setAdminToken(token);
    setIsAuthenticated(true);
  }, []);

  const value: AdminAuthState = {
    isAuthenticated,
    isLoading,
    login,
    logout,
    handleCallback,
  };

  return (
    <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthState {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
