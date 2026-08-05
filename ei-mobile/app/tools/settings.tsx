import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/src/components/ui/Card';
import { GradientBackground } from '@/src/components/ui/GradientBackground';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { ToolScreenHeader } from '@/src/components/ui/ToolScreenHeader';
import { adminApi } from '@/src/lib/adminApi';
import { colors } from '@/src/theme/colors';

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

export default function SettingsToolScreen() {
  const insets = useSafeAreaInsets();
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
      <ToolScreenHeader
        title="Settings"
        subtitle="Feature flags for sogki.dev"
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
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
                    <View
                      key={item.id}
                      style={[styles.row, i > 0 && styles.rowBorder]}
                    >
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

        {items.length === 0 ? (
          <Card>
            <Text style={styles.empty}>No feature flags found</Text>
          </Card>
        ) : null}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, gap: 16 },
  error: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  group: { gap: 8 },
  groupTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: 16 },
});
