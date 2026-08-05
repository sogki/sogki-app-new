import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from '@/src/components/ui/Card';
import { AppRefreshControl, RefreshBanner } from '@/src/components/ui/AppRefreshControl';
import { GradientBackground } from '@/src/components/ui/GradientBackground';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { adminApi } from '@/src/lib/adminApi';
import { colors, radius } from '@/src/theme/colors';

type SiteContentItem = {
  id: string;
  key: string;
  value: unknown;
  content_type: string;
  label: string | null;
  sort_order: number;
};

const FLAG_GROUPS: { label: string; keys: string[] }[] = [
  { label: 'Hero', keys: ['feature.show_hero'] },
  { label: 'About', keys: ['feature.show_about'] },
  { label: 'Features', keys: ['feature.show_features'] },
  { label: 'Projects', keys: ['feature.show_projects'] },
  { label: 'TCG Collection', keys: ['feature.show_collection'] },
  { label: 'Contact', keys: ['feature.show_contact'] },
];

export default function SettingsTabScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const [items, setItems] = useState<SiteContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await adminApi.siteContent('feature_flags');
    setItems(Array.isArray(data) ? (data as SiteContentItem[]) : []);
  }, []);

  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refresh failed');
    }
    setRefreshing(false);
  }, [load]);

  const toggle = async (item: SiteContentItem, next: boolean) => {
    setSaving(item.key);
    try {
      await adminApi.updateSiteContent(item.key, next);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <LoadingState message="Loading settings..." />;

  const byKey = Object.fromEntries(items.map((i) => [i.key, i]));

  return (
    <GradientBackground>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 110 },
        ]}
        refreshControl={
          <AppRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={insets.top + 8}
          />
        }
      >
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Feature flags · account</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {FLAG_GROUPS.map((group) => {
          const groupItems = group.keys.map((k) => byKey[k]).filter(Boolean);
          if (groupItems.length === 0) return null;
          return (
            <View key={group.label} style={styles.group}>
              <Text style={styles.groupTitle}>{group.label}</Text>
              <Card style={styles.card}>
                {groupItems.map((item, i) => {
                  const on = item.value === true || item.value === 'true';
                  return (
                    <View key={item.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                      <Text style={styles.label}>{item.label ?? item.key}</Text>
                      {saving === item.key ? (
                        <ActivityIndicator color={colors.accent} />
                      ) : (
                        <Switch
                          value={on}
                          onValueChange={(v) => void toggle(item, v)}
                          trackColor={{ false: colors.border, true: colors.accent }}
                          thumbColor={colors.text}
                        />
                      )}
                    </View>
                  );
                })}
              </Card>
            </View>
          );
        })}

        <Card style={styles.accountCard}>
          <Text style={styles.groupTitle}>Account</Text>
          <Pressable style={styles.logoutBtn} onPress={() => void logout()}>
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </Card>
      </ScrollView>
      <RefreshBanner visible={refreshing} label="Refreshing settings…" />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, gap: 16 },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.4 },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginTop: -8, marginBottom: 4 },
  error: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  group: { gap: 8 },
  groupTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  card: { paddingVertical: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  label: { color: colors.text, fontSize: 15, flex: 1, paddingRight: 12 },
  accountCard: { gap: 10 },
  logoutBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
  },
  logoutText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
});
