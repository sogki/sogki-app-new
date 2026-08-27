import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from '@/src/components/ui/Card';
import { GradientBackground } from '@/src/components/ui/GradientBackground';
import { colors, radius } from '@/src/theme/colors';

type SettingsRow = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  danger?: boolean;
};

export default function SettingsTabScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout } = useAuth();

  const rows: SettingsRow[] = [
    {
      id: 'flags',
      title: 'Portfolio feature flags',
      subtitle: 'Hero, About, Projects, TCG, Contact…',
      icon: 'flag-outline',
      onPress: () => router.push('/tools/feature-flags'),
    },
    {
      id: 'presence',
      title: 'Presence & travel',
      subtitle: 'Home base, away tracking, visit graph',
      icon: 'navigate-outline',
      onPress: () => router.push('/tools/presence'),
    },
    {
      id: 'scans',
      title: 'Scan library',
      subtitle: 'Saved Vision / QR / barcode memory',
      icon: 'scan-outline',
      onPress: () => router.push('/tools/scans'),
    },
  ];

  return (
    <GradientBackground>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 110 },
        ]}
      >
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Account · site · presence</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <Card style={styles.card}>
            {rows.map((row, i) => (
              <Pressable
                key={row.id}
                style={[styles.row, i > 0 && styles.rowBorder]}
                onPress={row.onPress}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name={row.icon} size={18} color={colors.accentLight} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{row.title}</Text>
                  <Text style={styles.rowSub}>{row.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Card style={styles.card}>
            <Pressable style={styles.row} onPress={() => void logout()}>
              <View style={[styles.iconWrap, styles.iconDanger]}>
                <Ionicons name="log-out-outline" size={18} color={colors.danger} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.danger }]}>Sign out</Text>
                <Text style={styles.rowSub}>Clear Discord session on this device</Text>
              </View>
            </Pressable>
          </Card>
        </View>

        <Text style={styles.foot}>Ei · sogki.dev companion</Text>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, gap: 18 },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.4 },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginTop: -10 },
  section: { gap: 8 },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  card: { paddingVertical: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  iconDanger: { backgroundColor: 'rgba(239,68,68,0.12)' },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowSub: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
  foot: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
