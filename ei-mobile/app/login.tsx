import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Button } from '@/src/components/ui/Button';
import { GradientBackground } from '@/src/components/ui/GradientBackground';
import { useAuth } from '@/src/context/AuthContext';
import { colors } from '@/src/theme/colors';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
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
    <GradientBackground vivid style={styles.container}>
      <StatusBar style="light" />
      <View
        style={[
          styles.inner,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 28 },
        ]}
      >
        <View style={styles.hero}>
          <Text style={styles.kicker}>Private access</Text>
          <Text style={styles.brand}>Ei</Text>
          <View style={styles.rule} />
          <Text style={styles.tagline}>Personal command system</Text>
          <Text style={styles.subtitle}>
            Dashboards, camera tools, and site ops — one authenticated surface for you.
          </Text>
        </View>

        <View style={styles.footer}>
          <Button
            label={loading ? 'Connecting…' : 'Continue with Discord'}
            onPress={handleLogin}
            loading={loading}
            style={styles.cta}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.fine}>
            Authorised Discord account only. Session stays on this device.
          </Text>
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  kicker: {
    color: colors.accentLight,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    marginBottom: 18,
  },
  brand: {
    color: colors.text,
    fontSize: 72,
    fontWeight: '700',
    letterSpacing: 10,
    fontFamily: 'SpaceMono',
    lineHeight: 80,
  },
  rule: {
    width: 48,
    height: 2,
    backgroundColor: colors.accent,
    marginTop: 18,
    marginBottom: 18,
    borderRadius: 1,
  },
  tagline: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
    maxWidth: 340,
  },
  footer: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: 14,
  },
  cta: {
    width: '100%',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  fine: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
