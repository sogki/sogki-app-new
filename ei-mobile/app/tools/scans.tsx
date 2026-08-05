import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { AppRefreshControl, RefreshBanner } from '@/src/components/ui/AppRefreshControl';
import { GradientBackground } from '@/src/components/ui/GradientBackground';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { ToolScreenHeader } from '@/src/components/ui/ToolScreenHeader';
import { adminApi } from '@/src/lib/adminApi';
import { relativeDate } from '@/src/lib/format';
import { normalizeOcrText } from '@/src/lib/ocrText';
import type { LifeDashboardPayload, LifeScan } from '@/src/lib/types';
import { colors, radius } from '@/src/theme/colors';

export default function ScansToolScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [payload, setPayload] = useState<LifeDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuScan, setMenuScan] = useState<LifeScan | null>(null);
  const [editing, setEditing] = useState<LifeScan | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const dash = await adminApi.lifeDashboard();
    setPayload(dash.payload);
  }, []);

  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load scans'))
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

  const scans = Array.isArray(payload?.scans) ? payload!.scans : [];
  const sorted = [...scans].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const persist = async (next: LifeScan[]) => {
    if (!payload) return;
    const updated = { ...payload, scans: next };
    setPayload(updated);
    try {
      await adminApi.saveLifeDashboard({ payload: updated });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
      await load();
    }
  };

  const openMenu = (scan: LifeScan) => {
    Keyboard.dismiss();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMenuScan(scan);
  };

  const closeMenu = () => setMenuScan(null);

  const removeScan = (id: string) => {
    closeMenu();
    Alert.alert('Delete scan', 'Remove this scan from your library?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void persist(scans.filter((s) => s.id !== id));
          if (expandedId === id) setExpandedId(null);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const startEdit = (scan: LifeScan) => {
    closeMenu();
    setEditing(scan);
    setEditTitle(scan.title);
    setEditText(scan.text);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const title = editTitle.trim() || editing.title;
    const text = editText.trim();
    if (!text) {
      Alert.alert('Empty scan', 'Text content cannot be empty.');
      return;
    }
    await persist(
      scans.map((s) =>
        s.id === editing.id
          ? { ...s, title, text }
          : s
      )
    );
    setEditing(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const copyScan = async (text: string) => {
    closeMenu();
    await Clipboard.setStringAsync(text);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (loading) return <LoadingState message="Loading scans..." />;

  return (
    <GradientBackground>
      <StatusBar style="light" />
      <ToolScreenHeader
        title="Scans"
        subtitle={`${sorted.length} capture${sorted.length === 1 ? '' : 's'} · hold for options`}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <AppRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={insets.top + 8}
          />
        }
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.cameraCta} onPress={() => router.push('/(tabs)/camera')}>
          <Ionicons name="scan-outline" size={18} color={colors.text} />
          <Text style={styles.cameraCtaText}>Open Camera to scan</Text>
        </Pressable>

        {!sorted.length ? (
          <Card>
            <Text style={styles.empty}>
              No scans yet. Use Camera → Scan or QR, then Save — they’ll show up here with the
              photo and location when available.
            </Text>
          </Card>
        ) : (
          <View style={styles.list}>
            {sorted.map((scan) => {
              const open = expandedId === scan.id;
              const when = new Date(scan.createdAt);
              const dateFull = Number.isNaN(when.getTime())
                ? scan.createdAt
                : when.toLocaleString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
              const displayText =
                scan.mode === 'qr' || scan.mode === 'barcode'
                  ? scan.text
                  : normalizeOcrText(scan.text);
              const hasCapture = Boolean(scan.imageDataUrl);
              const hasProduct = Boolean(scan.productImageUrl);
              const hasAnyImage = hasCapture || hasProduct;

              return (
                <Pressable
                  key={scan.id}
                  onPress={() => setExpandedId(open ? null : scan.id)}
                  onLongPress={() => openMenu(scan)}
                  delayLongPress={380}
                >
                  <Card style={styles.card}>
                    <View style={styles.itemHeader}>
                      {hasAnyImage ? (
                        <View style={styles.thumbRow}>
                          {hasProduct ? (
                            <Image
                              source={{ uri: scan.productImageUrl! }}
                              style={styles.thumb}
                            />
                          ) : null}
                          {hasCapture ? (
                            <Image
                              source={{ uri: scan.imageDataUrl! }}
                              style={styles.thumb}
                            />
                          ) : null}
                        </View>
                      ) : (
                        <View style={styles.itemIcon}>
                          <Ionicons
                            name={
                              scan.mode === 'barcode'
                                ? 'barcode-outline'
                                : scan.source === 'qr' || scan.mode === 'qr'
                                  ? 'qr-code-outline'
                                  : 'document-text-outline'
                            }
                            size={18}
                            color={colors.accentLight}
                          />
                        </View>
                      )}
                      <View style={styles.itemMeta}>
                        <Text style={styles.itemTitle} numberOfLines={2}>
                          {scan.title}
                        </Text>
                        <Text style={styles.itemDate}>
                          {relativeDate(scan.createdAt)}
                          {scan.locationLabel ? ` · ${scan.locationLabel}` : ''}
                        </Text>
                      </View>
                      <Ionicons
                        name={open ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={colors.textMuted}
                      />
                    </View>

                    {open ? (
                      <View style={styles.itemBody}>
                        {hasAnyImage ? (
                          <View style={styles.imagePair}>
                            {hasProduct ? (
                              <View style={styles.imageSlot}>
                                <Text style={styles.imageCaption}>Product</Text>
                                <Image
                                  source={{ uri: scan.productImageUrl! }}
                                  style={styles.pairImage}
                                  resizeMode="contain"
                                />
                              </View>
                            ) : null}
                            {hasCapture ? (
                              <View style={styles.imageSlot}>
                                <Text style={styles.imageCaption}>Your scan</Text>
                                <Image
                                  source={{ uri: scan.imageDataUrl! }}
                                  style={styles.pairImage}
                                  resizeMode="cover"
                                />
                              </View>
                            ) : null}
                          </View>
                        ) : null}

                        <View style={styles.metaBlock}>
                          <MetaRow icon="calendar-outline" label="Date" value={dateFull} />
                          <MetaRow
                            icon="location-outline"
                            label="Location"
                            value={scan.locationLabel || 'Location not recorded'}
                          />
                          <MetaRow
                            icon="camera-outline"
                            label="Source"
                            value={scan.source ?? 'unknown'}
                          />
                        </View>

                        <Text style={styles.contentLabel}>Content</Text>
                        <Text style={styles.scanText} selectable>
                          {displayText}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.preview} numberOfLines={3}>
                        {displayText}
                      </Text>
                    )}
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
      <RefreshBanner visible={refreshing} label="Refreshing scans…" />

      {/* Context menu */}
      <Modal
        visible={Boolean(menuScan)}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
        statusBarTranslucent
      >
        <Pressable style={styles.menuBackdrop} onPress={closeMenu}>
          <Pressable
            style={[styles.menuSheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.menuHandle} />
            <Text style={styles.menuTitle} numberOfLines={1}>
              {menuScan?.title ?? 'Scan'}
            </Text>
            <Text style={styles.menuSub}>Hold options</Text>

            <MenuAction
              icon="create-outline"
              label="Edit content"
              onPress={() => menuScan && startEdit(menuScan)}
            />
            <MenuAction
              icon="copy-outline"
              label="Copy text"
              onPress={() => menuScan && void copyScan(menuScan.text)}
            />
            <MenuAction
              icon="expand-outline"
              label={expandedId === menuScan?.id ? 'Collapse' : 'Expand'}
              onPress={() => {
                if (!menuScan) return;
                setExpandedId(expandedId === menuScan.id ? null : menuScan.id);
                closeMenu();
              }}
            />
            <MenuAction
              icon="trash-outline"
              label="Delete"
              destructive
              onPress={() => menuScan && removeScan(menuScan.id)}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit sheet */}
      <Modal
        visible={Boolean(editing)}
        transparent
        animationType="slide"
        onRequestClose={() => setEditing(null)}
        statusBarTranslucent
      >
        <View style={styles.editBackdrop}>
          <View
            style={[
              styles.editSheet,
              { paddingBottom: Math.max(insets.bottom, 16) + 8 },
            ]}
          >
            <Text style={styles.editHeading}>Edit scan</Text>
            <Text style={styles.editLabel}>Title</Text>
            <TextInput
              style={styles.editInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Title"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.editLabel}>Content</Text>
            <TextInput
              style={[styles.editInput, styles.editBody]}
              value={editText}
              onChangeText={setEditText}
              placeholder="Scan text"
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.editActions}>
              <Pressable style={styles.editCancel} onPress={() => setEditing(null)}>
                <Text style={styles.editCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.editSave} onPress={() => void saveEdit()}>
                <Text style={styles.editSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={14} color={colors.accentLight} />
      <Text style={styles.metaKey}>{label}</Text>
      <Text style={styles.metaVal} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function MenuAction({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        destructive && styles.menuRowDanger,
        pressed && styles.menuRowPressed,
      ]}
    >
      <View style={[styles.menuIcon, destructive && styles.menuIconDanger]}>
        <Ionicons
          name={icon}
          size={18}
          color={destructive ? colors.danger : colors.accentLight}
        />
      </View>
      <Text style={[styles.menuLabel, destructive && styles.menuLabelDanger]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, gap: 12 },
  error: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  empty: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  cameraCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  cameraCtaText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  list: { gap: 10 },
  card: { gap: 8 },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#111',
  },
  thumbRow: {
    flexDirection: 'row',
    gap: 4,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMeta: { flex: 1, minWidth: 0 },
  itemTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  itemDate: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  preview: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  itemBody: { gap: 12, paddingTop: 6 },
  imagePair: {
    flexDirection: 'row',
    gap: 8,
  },
  imageSlot: {
    flex: 1,
    gap: 6,
  },
  imageCaption: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pairImage: {
    width: '100%',
    height: 160,
    borderRadius: radius.md,
    backgroundColor: '#0a0a0a',
  },
  heroImage: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
    backgroundColor: '#0a0a0a',
  },
  metaBlock: { gap: 8 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  metaKey: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    width: 64,
    marginTop: 1,
  },
  metaVal: { flex: 1, color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  contentLabel: {
    color: colors.accentLight,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  scanText: { color: colors.text, fontSize: 15, lineHeight: 23 },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#12121a',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    paddingTop: 10,
    paddingHorizontal: 14,
    gap: 6,
  },
  menuHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 10,
  },
  menuTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  menuSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  menuRowPressed: {
    backgroundColor: 'rgba(139,92,246,0.16)',
    borderColor: 'rgba(139,92,246,0.35)',
  },
  menuRowDanger: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.2)',
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconDanger: { backgroundColor: 'rgba(239,68,68,0.14)' },
  menuLabel: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
  menuLabelDanger: { color: colors.danger },
  editBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  editSheet: {
    backgroundColor: '#12121a',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    padding: 16,
    gap: 8,
  },
  editHeading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  editLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  editInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
    fontSize: 14,
  },
  editBody: {
    minHeight: 160,
    maxHeight: 280,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  editCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  editCancelText: { color: colors.textSecondary, fontWeight: '600' },
  editSave: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  editSaveText: { color: colors.text, fontWeight: '700' },
});
