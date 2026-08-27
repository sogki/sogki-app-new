import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { AppRefreshControl, RefreshBanner } from '@/src/components/ui/AppRefreshControl';
import { GradientBackground } from '@/src/components/ui/GradientBackground';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { ToolScreenHeader } from '@/src/components/ui/ToolScreenHeader';
import { useLifeDashboard } from '@/src/context/LifeDashboardContext';
import { errorMessage } from '@/src/lib/appError';
import { relativeAgoLong } from '@/src/lib/scanMemory';
import {
  captureHomeLocation,
  defaultPresence,
  maybeCheckIn,
  presenceDayBuckets,
  topAwayPlaces,
} from '@/src/lib/presence';
import type { LifePresence } from '@/src/lib/types';
import { colors, radius } from '@/src/theme/colors';

export default function PresenceScreen() {
  const insets = useSafeAreaInsets();
  const { dashboard, loading: dashLoading, refresh, savePayload } = useLifeDashboard();
  const [presence, setPresence] = useState<LifePresence>(defaultPresence());
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<'home' | 'ping' | 'toggle' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!dashboard) return;
    setPresence({ ...defaultPresence(), ...(dashboard.payload.presence ?? {}) });
  }, [dashboard]);

  const persist = useCallback(
    async (next: LifePresence) => {
      if (!dashboard) return;
      await savePayload({ ...dashboard.payload, presence: next });
      setPresence(next);
    },
    [dashboard, savePayload]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
      setError(null);
    } catch (e) {
      setError(errorMessage(e, 'Refresh failed'));
    }
    setRefreshing(false);
  }, [refresh]);

  const buckets = useMemo(
    () => presenceDayBuckets(presence.checkIns ?? [], 14),
    [presence.checkIns]
  );
  const maxBucket = Math.max(1, ...buckets.map((b) => b.away + b.home));
  const places = useMemo(() => topAwayPlaces(presence.checkIns ?? [], 5), [presence.checkIns]);

  const setTracking = async (on: boolean) => {
    setBusy('toggle');
    setNote(null);
    try {
      await persist({ ...presence, trackingEnabled: on });
      setNote(on ? 'Tracking on — Ei will log visits when you open the app.' : 'Tracking paused.');
    } catch (e) {
      setError(errorMessage(e, 'Could not update'));
    } finally {
      setBusy(null);
    }
  };

  const setHome = async () => {
    setBusy('home');
    setError(null);
    setNote(null);
    try {
      const home = await captureHomeLocation();
      if (!home) {
        setError('Location permission is required to set home.');
        return;
      }
      await persist({
        ...presence,
        homeLat: home.lat,
        homeLng: home.lng,
        homeLabel: home.label,
      });
      setNote(`Home set to ${home.label}`);
    } catch (e) {
      setError(errorMessage(e, 'Could not set home'));
    } finally {
      setBusy(null);
    }
  };

  const pingNow = async () => {
    setBusy('ping');
    setError(null);
    setNote(null);
    try {
      const next = await maybeCheckIn({ ...presence, trackingEnabled: true });
      if (!next) {
        setNote('No new check-in (too soon or still in the same place).');
        return;
      }
      await persist(next);
      const latest = next.checkIns[0];
      setNote(
        latest.awayFromHome
          ? `Away · ${latest.label}${latest.distanceKm != null ? ` · ${latest.distanceKm} km from home` : ''}`
          : `Near home · ${latest.label}`
      );
    } catch (e) {
      setError(errorMessage(e, 'Check-in failed'));
    } finally {
      setBusy(null);
    }
  };

  if (dashLoading && !dashboard) return <LoadingState message="Loading presence…" />;

  const awayCount = (presence.checkIns ?? []).filter((c) => c.awayFromHome).length;

  return (
    <GradientBackground>
      <StatusBar style="light" />
      <ToolScreenHeader
        title="Presence & travel"
        subtitle="Where you’ve been vs home"
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
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {note ? <Text style={styles.note}>{note}</Text> : null}

        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.label}>Track presence</Text>
              <Text style={styles.hint}>
                Quiet check-ins when you open Ei (deduped every few hours)
              </Text>
            </View>
            {busy === 'toggle' ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Switch
                value={presence.trackingEnabled}
                onValueChange={(v) => void setTracking(v)}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.text}
              />
            )}
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>Home base</Text>
          <Text style={styles.homeValue}>
            {presence.homeLabel
              ? presence.homeLabel
              : 'Not set — use your current location'}
          </Text>
          {presence.homeLat != null && presence.homeLng != null ? (
            <Text style={styles.hint}>
              {presence.homeLat.toFixed(4)}, {presence.homeLng.toFixed(4)} · away if &gt;{' '}
              {presence.homeRadiusKm ?? 3} km
            </Text>
          ) : null}
          <Pressable style={styles.primaryBtn} onPress={() => void setHome()} disabled={busy != null}>
            {busy === 'home' ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <Ionicons name="home-outline" size={16} color={colors.text} />
                <Text style={styles.primaryBtnText}>
                  {presence.homeLabel ? 'Update home here' : 'Set home here'}
                </Text>
              </>
            )}
          </Pressable>
        </Card>

        <Card style={styles.card}>
          <View style={styles.graphHeader}>
            <Text style={styles.sectionLabel}>Last 14 days</Text>
            <Text style={styles.hint}>{awayCount} away check-ins total</Text>
          </View>
          <View style={styles.graph}>
            {buckets.map((b) => {
              const total = b.away + b.home;
              const h = Math.max(4, Math.round((total / maxBucket) * 72));
              const awayH = total ? Math.round((b.away / total) * h) : 0;
              return (
                <View key={b.day} style={styles.barCol}>
                  <View style={[styles.barTrack, { height: 72 }]}>
                    <View style={[styles.barStack, { height: h }]}>
                      <View style={[styles.barAway, { height: Math.max(awayH, b.away ? 2 : 0) }]} />
                      <View
                        style={[
                          styles.barHome,
                          { height: Math.max(h - awayH, b.home ? 2 : 0) },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={styles.barLabel}>{b.day.split(' ')[0]}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.accent }]} />
              <Text style={styles.hint}>Away</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.success }]} />
              <Text style={styles.hint}>Near home</Text>
            </View>
          </View>
        </Card>

        {places.length ? (
          <Card style={styles.card}>
            <Text style={styles.sectionLabel}>Places you’ve been</Text>
            {places.map((p, i) => (
              <View key={p.label} style={[styles.placeRow, i > 0 && styles.rowBorder]}>
                <Text style={styles.placeTitle}>{p.label}</Text>
                <Text style={styles.hint}>
                  {p.count}× · last {relativeAgoLong(p.lastAt)}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}

        <Pressable style={styles.secondaryBtn} onPress={() => void pingNow()} disabled={busy != null}>
          {busy === 'ping' ? (
            <ActivityIndicator color={colors.accentLight} />
          ) : (
            <>
              <Ionicons name="locate-outline" size={16} color={colors.accentLight} />
              <Text style={styles.secondaryBtnText}>Check in now</Text>
            </>
          )}
        </Pressable>

        {(presence.checkIns ?? []).slice(0, 8).map((c) => (
          <Card key={c.id} style={styles.checkCard}>
            <Text style={styles.checkTitle}>
              {c.awayFromHome ? 'Away' : 'Home'} · {c.label}
            </Text>
            <Text style={styles.hint}>
              {relativeAgoLong(c.at)}
              {c.distanceKm != null ? ` · ${c.distanceKm} km from home` : ''}
            </Text>
          </Card>
        ))}
      </ScrollView>
      <RefreshBanner visible={refreshing} label="Refreshing presence…" />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, gap: 14 },
  error: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  note: { color: colors.accentLight, fontSize: 13, textAlign: 'center' },
  card: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowText: { flex: 1, gap: 4 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  label: { color: colors.text, fontSize: 15, fontWeight: '600' },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  homeValue: { color: colors.text, fontSize: 17, fontWeight: '700' },
  primaryBtn: {
    marginTop: 4,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  secondaryBtn: {
    height: 42,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: { color: colors.accentLight, fontSize: 14, fontWeight: '600' },
  graphHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  graph: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 96,
    paddingTop: 8,
  },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: {
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barStack: {
    width: '70%',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barAway: { width: '100%', backgroundColor: colors.accent },
  barHome: { width: '100%', backgroundColor: colors.success },
  barLabel: { color: colors.textMuted, fontSize: 8 },
  legend: { flexDirection: 'row', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  placeRow: { paddingVertical: 8, gap: 2 },
  placeTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  checkCard: { gap: 4, paddingVertical: 12 },
  checkTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
});
