import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { LoadingState } from '@/src/components/ui/LoadingState';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inLogin = segments[0] === 'login';
    if (!isAuthenticated && !inLogin) {
      router.replace('/login');
    } else if (isAuthenticated && inLogin) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) return <LoadingState message="Starting Ei..." />;

  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AuthGate>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#050508' } }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="tools/cvs" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="tools/blogs" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="tools/packs" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="tools/binders" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="tools/settings" options={{ animation: 'slide_from_right' }} />
        </Stack>
      </AuthGate>
    </AuthProvider>
  );
}
