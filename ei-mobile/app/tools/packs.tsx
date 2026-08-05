import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '@/src/components/ui/Badge';
import { Card } from '@/src/components/ui/Card';
import { AppRefreshControl, RefreshBanner } from '@/src/components/ui/AppRefreshControl';
import { GradientBackground } from '@/src/components/ui/GradientBackground';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { ToolScreenHeader } from '@/src/components/ui/ToolScreenHeader';
import { adminApi } from '@/src/lib/adminApi';
import { formatShortDate } from '@/src/lib/format';
import { formatBytes, type ResourcePack } from '@/src/lib/toolTypes';
import { colors, radius } from '@/src/theme/colors';

const PUBLIC_DOWNLOAD = 'https://sogki.dev/api/resourcepacks';

export default function PacksToolScreen() {
  const insets = useSafeAreaInsets();
  const [packs, setPacks] = useState<ResourcePack[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await adminApi.resourcePacks();
    const list = Array.isArray(data) ? (data as ResourcePack[]) : [];
    setPacks(list);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const toggleActive = async (pack: ResourcePack) => {
    try {
      await adminApi.updateResourcePack(pack.id, { is_active: !pack.is_active });
      await load();
    } catch (e) {
      Alert.alert('Update failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  if (loading) return <LoadingState message="Loading packs..." />;

  return (
    <GradientBackground>
      <StatusBar style="light" />
      <ToolScreenHeader title="Resource Packs" subtitle={`${packs.length} packs`} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <AppRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={insets.top + 8}
          />
        }
      >
        {packs.map((pack) => (
          <Card key={pack.id} style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>{pack.name}</Text>
              <Badge
                label={pack.is_active ? 'Active' : 'Inactive'}
                color={pack.is_active ? colors.success : colors.textMuted}
              />
            </View>
            <Text style={styles.version}>v{pack.version}</Text>
            {pack.description ? (
              <Text style={styles.desc}>{pack.description}</Text>
            ) : null}
            <Text style={styles.meta}>
              {pack.file_name} · {formatBytes(pack.size)}
            </Text>
            <Text style={styles.meta}>Updated {formatShortDate(pack.updated_at)}</Text>

            <View style={styles.actions}>
              <Pressable
                style={styles.btn}
                onPress={() => Linking.openURL(`${PUBLIC_DOWNLOAD}/${pack.id}`)}
              >
                <Ionicons name="download-outline" size={16} color={colors.text} />
                <Text style={styles.btnText}>Download URL</Text>
              </Pressable>
              <Pressable style={styles.btnGhost} onPress={() => toggleActive(pack)}>
                <Text style={styles.btnGhostText}>
                  {pack.is_active ? 'Deactivate' : 'Activate'}
                </Text>
              </Pressable>
            </View>
          </Card>
        ))}
        {packs.length === 0 ? (
          <Card>
            <Text style={styles.empty}>No resource packs</Text>
          </Card>
        ) : null}
      </ScrollView>
      <RefreshBanner visible={refreshing} label="Refreshing packs…" />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, gap: 12 },
  card: { gap: 6 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 },
  version: { color: colors.accentLight, fontSize: 13, fontFamily: 'SpaceMono' },
  desc: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  meta: { color: colors.textMuted, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  btnText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  btnGhost: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnGhostText: { color: colors.textSecondary, fontSize: 13 },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: 16 },
});
