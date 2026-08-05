import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/src/components/ui/Card';
import { AppRefreshControl, RefreshBanner } from '@/src/components/ui/AppRefreshControl';
import { GradientBackground } from '@/src/components/ui/GradientBackground';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { ToolScreenHeader } from '@/src/components/ui/ToolScreenHeader';
import { adminApi } from '@/src/lib/adminApi';
import { clampPct } from '@/src/lib/format';
import type { BinderShowcase, MasterSetEntry } from '@/src/lib/toolTypes';
import { colors, radius } from '@/src/theme/colors';

const IMG_W = Dimensions.get('window').width - 64;

export default function BindersToolScreen() {
  const insets = useSafeAreaInsets();
  const [showcases, setShowcases] = useState<BinderShowcase[]>([]);
  const [masterSets, setMasterSets] = useState<MasterSetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pctDraft, setPctDraft] = useState('');

  const load = useCallback(async () => {
    const [binders, masters] = await Promise.all([
      adminApi.binderShowcases(),
      adminApi.collectionMasterSets().catch(() => []),
    ]);
    const showcaseList = Array.isArray(binders) ? (binders as BinderShowcase[]) : [];
    showcaseList.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const masterList = Array.isArray(masters) ? (masters as MasterSetEntry[]) : [];
    masterList.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    setShowcases(showcaseList);
    setMasterSets(masterList);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const startEdit = (set: MasterSetEntry) => {
    setEditingId(set.id);
    setPctDraft(String(set.progress_percent ?? 0));
  };

  const saveProgress = async (id: string) => {
    const pct = Math.min(100, Math.max(0, Number(pctDraft)));
    if (!Number.isFinite(pct)) {
      Alert.alert('Invalid value', 'Enter a percentage between 0 and 100.');
      return;
    }
    try {
      await adminApi.updateCollectionMasterSet(id, { progress_percent: pct });
      setEditingId(null);
      await load();
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  if (loading) return <LoadingState message="Loading collection..." />;

  return (
    <GradientBackground>
      <StatusBar style="light" />
      <ToolScreenHeader
        title="Collection"
        subtitle={`${showcases.length} binders · ${masterSets.length} master sets`}
      />
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
        {masterSets.length > 0 ? (
          <View style={styles.block}>
            <SectionHeader title="Master sets" subtitle="Tap Edit to update %" />
            {masterSets.map((set) => {
              const pct = Math.min(100, Math.max(0, set.progress_percent ?? 0));
              const editing = editingId === set.id;
              return (
                <Card key={set.id} style={styles.card}>
                  <View style={styles.setHeader}>
                    <Text style={styles.title}>{set.title}</Text>
                    <Pressable onPress={() => (editing ? void saveProgress(set.id) : startEdit(set))}>
                      <Text style={styles.editLink}>{editing ? 'Save' : 'Edit'}</Text>
                    </Pressable>
                  </View>
                  {set.title_jp ? <Text style={styles.jp}>{set.title_jp}</Text> : null}
                  {set.subtitle ? <Text style={styles.subtitle}>{set.subtitle}</Text> : null}
                  {editing ? (
                    <TextInput
                      style={styles.input}
                      value={pctDraft}
                      onChangeText={setPctDraft}
                      keyboardType="decimal-pad"
                      placeholder="0–100"
                      placeholderTextColor={colors.textMuted}
                    />
                  ) : (
                    <>
                      <View style={styles.track}>
                        <View style={[styles.fill, { width: `${pct}%` }]} />
                      </View>
                      <Text style={styles.pct}>{Math.round(pct)}%</Text>
                    </>
                  )}
                </Card>
              );
            })}
          </View>
        ) : null}

        <View style={styles.block}>
          <SectionHeader title="Binder showcases" />
          {showcases.map((showcase) => {
            const images = [...(showcase.binder_showcase_images ?? [])].sort(
              (a, b) => a.sort_order - b.sort_order
            );
            const sets = [...(showcase.binder_showcase_sets ?? [])].sort(
              (a, b) => a.sort_order - b.sort_order
            );
            return (
              <Card key={showcase.id} style={styles.card}>
                <Text style={styles.title}>{showcase.title}</Text>
                {showcase.title_jp ? <Text style={styles.jp}>{showcase.title_jp}</Text> : null}
                {showcase.description ? (
                  <Text style={styles.desc}>{showcase.description}</Text>
                ) : null}

                {images.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.carousel}
                    contentContainerStyle={styles.carouselContent}
                  >
                    {images.map((img) => (
                      <Image
                        key={img.id}
                        source={{ uri: img.public_url }}
                        style={styles.image}
                        resizeMode="cover"
                      />
                    ))}
                  </ScrollView>
                ) : null}

                {sets.map((set) => {
                  const setPct = clampPct(set.completed, set.total || 1);
                  return (
                    <View key={set.id} style={styles.setRow}>
                      <View style={styles.setHeader}>
                        <Text style={styles.setName}>{set.name}</Text>
                        <Text style={styles.setCount}>
                          {set.completed}/{set.total}
                        </Text>
                      </View>
                      <View style={styles.track}>
                        <View style={[styles.fill, { width: `${setPct}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </Card>
            );
          })}
          {showcases.length === 0 ? (
            <Card>
              <Text style={styles.empty}>No binder showcases</Text>
            </Card>
          ) : null}
        </View>
      </ScrollView>
      <RefreshBanner visible={refreshing} label="Refreshing collection…" />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, gap: 20 },
  block: { gap: 10 },
  card: { gap: 6 },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 },
  editLink: { color: colors.accentLight, fontSize: 13, fontWeight: '600' },
  jp: { color: colors.textMuted, fontSize: 12 },
  subtitle: { color: colors.textSecondary, fontSize: 13 },
  desc: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
    marginTop: 4,
    fontFamily: 'SpaceMono',
  },
  track: {
    height: 6,
    backgroundColor: colors.borderSubtle,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },
  fill: { height: '100%', backgroundColor: colors.accent, borderRadius: 3 },
  pct: { color: colors.textMuted, fontSize: 12, textAlign: 'right', marginTop: 4 },
  carousel: { marginTop: 8 },
  carouselContent: { gap: 8 },
  image: {
    width: IMG_W * 0.7,
    height: 160,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
  },
  setRow: { marginTop: 10 },
  setName: { color: colors.text, fontSize: 14, flex: 1 },
  setCount: { color: colors.textMuted, fontSize: 12, fontFamily: 'SpaceMono' },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: 16 },
});
