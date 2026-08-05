import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '@/src/components/ui/Badge';
import { Card } from '@/src/components/ui/Card';
import { GradientBackground } from '@/src/components/ui/GradientBackground';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { ToolScreenHeader } from '@/src/components/ui/ToolScreenHeader';
import { adminApi } from '@/src/lib/adminApi';
import { formatShortDate } from '@/src/lib/format';
import { formatBytes, type CvDocument } from '@/src/lib/toolTypes';
import { colors, radius } from '@/src/theme/colors';

export default function CvsToolScreen() {
  const insets = useSafeAreaInsets();
  const [cvs, setCvs] = useState<CvDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await adminApi.cvs();
    const list = Array.isArray(data) ? (data as CvDocument[]) : [];
    setCvs(list);
    setSelectedId((prev) => prev ?? list[0]?.id ?? null);
  }, []);

  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load CVs'))
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

  const selected = cvs.find((c) => c.id === selectedId) ?? null;

  const openCv = async (cv: CvDocument) => {
    setBusy(cv.id);
    try {
      let url = cv.signed_url;
      if (!url) {
        const fresh = await adminApi.cvSignedUrl(cv.id);
        url = fresh.signed_url;
      }
      if (!url) throw new Error('No signed URL');
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      Alert.alert('Could not open CV', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(null);
    }
  };

  const emailCv = async (cv: CvDocument | null, includeAll = false) => {
    setBusy(includeAll ? 'all' : cv?.id ?? 'email');
    try {
      const result = await adminApi.sendCvEmail({
        cvId: includeAll ? undefined : cv?.id,
        includeAll,
      });
      Alert.alert(
        'Email sent',
        `Sent ${result.count} CV(s) to ${result.sent_to}`
      );
    } catch (e) {
      Alert.alert('Email failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(null);
    }
  };

  const deleteCv = (cv: CvDocument) => {
    Alert.alert('Delete CV', `Delete “${cv.title}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(cv.id);
          try {
            await adminApi.deleteCv(cv.id);
            await load();
          } catch (e) {
            Alert.alert('Delete failed', e instanceof Error ? e.message : 'Unknown error');
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const uploadCv = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      setBusy('upload');
      const title = asset.name.replace(/\.[^.]+$/, '') || 'CV';
      await adminApi.uploadCv({
        uri: asset.uri,
        fileName: asset.name,
        mimeType: asset.mimeType || 'application/pdf',
        title,
        isActive: true,
      });
      await load();
      Alert.alert('Uploaded', `“${title}” is ready`);
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <LoadingState message="Loading CVs..." />;

  return (
    <GradientBackground>
      <StatusBar style="light" />
      <ToolScreenHeader title="CVs" subtitle={`${cvs.length} documents`} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.actionBtn, styles.actionPrimary]}
            onPress={() => void uploadCv()}
            disabled={busy === 'upload'}
          >
            {busy === 'upload' ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={16} color={colors.text} />
                <Text style={styles.actionText}>Upload CV</Text>
              </>
            )}
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            onPress={() => emailCv(null, true)}
            disabled={busy === 'all' || cvs.length === 0}
          >
            {busy === 'all' ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <>
                <Ionicons name="mail-outline" size={16} color={colors.text} />
                <Text style={styles.actionText}>Email all</Text>
              </>
            )}
          </Pressable>
        </View>

        {cvs.map((cv) => {
          const active = cv.id === selectedId;
          return (
            <Pressable key={cv.id} onPress={() => setSelectedId(cv.id)}>
              <Card style={[styles.card, active && styles.cardActive]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{cv.title}</Text>
                  {cv.is_active ? <Badge label="Active" color={colors.success} /> : null}
                </View>
                <Text style={styles.meta}>
                  {cv.file_name} · {formatBytes(cv.size)}
                </Text>
                <Text style={styles.meta}>{formatShortDate(cv.created_at)}</Text>
                {cv.notes ? (
                  <Text style={styles.notes} numberOfLines={2}>
                    {cv.notes}
                  </Text>
                ) : null}

                {active ? (
                  <View style={styles.detailActions}>
                    <Pressable
                      style={styles.primaryBtn}
                      onPress={() => openCv(cv)}
                      disabled={busy === cv.id}
                    >
                      {busy === cv.id ? (
                        <ActivityIndicator color={colors.text} size="small" />
                      ) : (
                        <>
                          <Ionicons name="open-outline" size={16} color={colors.text} />
                          <Text style={styles.primaryBtnText}>Open preview</Text>
                        </>
                      )}
                    </Pressable>
                    <Pressable
                      style={styles.secondaryBtn}
                      onPress={() => emailCv(cv)}
                      disabled={!!busy}
                    >
                      <Ionicons name="mail-outline" size={16} color={colors.accentLight} />
                      <Text style={styles.secondaryBtnText}>Email</Text>
                    </Pressable>
                    <Pressable style={styles.dangerBtn} onPress={() => deleteCv(cv)}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </Pressable>
                  </View>
                ) : null}
              </Card>
            </Pressable>
          );
        })}

        {cvs.length === 0 ? (
          <Card>
            <Text style={styles.empty}>No CVs uploaded yet</Text>
          </Card>
        ) : null}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  actionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  card: {
    gap: 6,
  },
  cardActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(139,92,246,0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  notes: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  detailActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  primaryBtnText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: {
    color: colors.accentLight,
    fontSize: 13,
    fontWeight: '500',
  },
  dangerBtn: {
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
