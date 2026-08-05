import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { SUPABASE_URL } from '@/src/config/bootstrap';
import { clearAdminToken, getAdminToken, setAdminToken } from '@/src/lib/adminApi';
import { getKey } from '@/src/lib/keys';

WebBrowser.maybeCompleteAuthSession();

type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  handleToken: (token: string) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function extractToken(url: string): string | null {
  const parsed = Linking.parse(url);
  const token = parsed.queryParams?.token;
  if (typeof token === 'string' && token.length > 0) return token;
  try {
    const match = url.match(/[?&]token=([^&#]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleToken = useCallback(async (token: string) => {
    await setAdminToken(token);
    setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    (async () => {
      const token = await getAdminToken();
      setIsAuthenticated(!!token);
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    const sub = Linking.addEventListener('url', async ({ url }) => {
      const token = extractToken(url);
      if (token) await handleToken(token);
    });
    return () => sub.remove();
  }, [handleToken]);

  const login = useCallback(async () => {
    const discordClientId = await getKey('DISCORD_CLIENT_ID');
    if (!discordClientId) {
      throw new Error('Discord Client ID not configured.');
    }

    // Expo Go → https://auth.expo.dev/@sogki/ei/...
    // Standalone IPA → eimobile://auth
    const returnUrl = AuthSession.makeRedirectUri({
      scheme: 'eimobile',
      path: 'auth',
    });

    const redirectUri = encodeURIComponent(
      `${SUPABASE_URL}/functions/v1/auth-discord-callback`
    );
    const state = encodeURIComponent(returnUrl);
    const authUrl =
      `https://discord.com/api/oauth2/authorize` +
      `?client_id=${discordClientId}` +
      `&redirect_uri=${redirectUri}` +
      `&response_type=code` +
      `&scope=identify` +
      `&state=${state}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl);

    if (result.type === 'success' && result.url) {
      const token = extractToken(result.url);
      if (token) await handleToken(token);
    }
  }, [handleToken]);

  const logout = useCallback(async () => {
    await clearAdminToken();
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, login, logout, handleToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
