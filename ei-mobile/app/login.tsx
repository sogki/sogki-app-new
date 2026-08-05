import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/src/components/ui/Button';
import { GradientBackground } from '@/src/components/ui/GradientBackground';
import { useAuth } from '@/src/context/AuthContext';
import { colors } from '@/src/theme/colors';

export default function LoginScreen() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await login();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="shield-checkmark" size={48} color={colors.accentLight} />
        </View>
        <Text style={styles.brand}>Ei</Text>
        <Text style={styles.tagline}>Personal Command System</Text>
        <Text style={styles.subtitle}>
          Your pocket access point to dashboards, projects, and tools.
        </Text>

        <View style={styles.actions}>
          <Button
            label="Login with Discord"
            onPress={handleLogin}
            loading={loading}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <Text style={styles.footer}>
          Private access only. Authorised Discord account required.
        </Text>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  brand: {
    color: colors.text,
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: 8,
    fontFamily: 'SpaceMono',
  },
  tagline: {
    color: colors.accentLight,
    fontSize: 13,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 20,
    marginBottom: 40,
  },
  actions: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  footer: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 18,
  },
});
