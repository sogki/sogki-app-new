import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from '@/src/components/dashboard/LineChart';
import { Card } from '@/src/components/ui/Card';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { adminApi, fetchVuagQuote } from '@/src/lib/adminApi';
import { formatMoney, formatPct } from '@/src/lib/format';
import { marketSessionBadge, resolveMarketSession } from '@/src/lib/marketHours';
import type { InvestmentRange, InvestmentSnapshot } from '@/src/lib/types';
import { colors, radius } from '@/src/theme/colors';

const RANGES: InvestmentRange[] = ['1D', '1W', '1M', '6M', '1Y', 'ALL'];

type InvestmentsCardProps = {
  initial?: InvestmentSnapshot | null;
};

export function InvestmentsCard({ initial }: InvestmentsCardProps) {
  const [range, setRange] = useState<InvestmentRange>('1M');
  const [data, setData] = useState<InvestmentSnapshot | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);
  const [live, setLive] = useState(!!initial);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [holdingsDraft, setHoldingsDraft] = useState('');
  const [investedDraft, setInvestedDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (nextRange: InvestmentRange) => {
    setLoading(true);
    setError(null);
    try {
      const quote = await fetchVuagQuote(nextRange);
      setData(quote);
      setLive(true);
    } catch (err) {
      setLive(false);
      setError(err instanceof Error ? err.message : 'Could not load VUAG.L');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(range);
  }, [load, range]);

  const points = data?.series[range] ?? [];
  const invested = data?.invested;
  const unrealized =
    invested != null && data && data.holdings > 0 ? data.portfolioValue - invested : null;
  const unrealizedPct =
    unrealized != null && invested != null && invested > 0
      ? (unrealized / invested) * 100
      : null;

  const positiveToday = (data?.todayGainLoss ?? 0) >= 0;
  const positiveUnrealized = unrealized == null ? true : unrealized >= 0;
  const positiveDay = (data?.dailyChangePct ?? 0) >= 0;

  const rangePositive = useMemo(() => {
    if (points.length < 2) return positiveDay;
    return points[points.length - 1].value >= points[0].value;
  }, [points, positiveDay]);

  const session = data?.marketSession ?? resolveMarketSession(data?.marketState);
  const marketBadge = marketSessionBadge(session);

  const startEdit = () => {
    setHoldingsDraft(String(data?.holdings ?? 0));
    setInvestedDraft(data?.invested != null ? String(data.invested) : '');
    setEditing(true);
  };

  const saveHoldings = async () => {
    const holdings = Number(holdingsDraft);
    const investedRaw = investedDraft.trim();
    const invested = investedRaw === '' ? null : Number(investedRaw);
    if (!Number.isFinite(holdings) || holdings < 0) {
      Alert.alert('Invalid holdings', 'Enter a valid number of units.');
      return;
    }
    if (invested != null && (!Number.isFinite(invested) || invested < 0)) {
      Alert.alert('Invalid invested amount', 'Enter a valid amount or leave blank.');
      return;
    }
    setSaving(true);
    try {
      await adminApi.saveLifeInvestment({
        symbol: 'VUAG.L',
        holdings,
        invested,
      });
      setEditing(false);
      await load(range);
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <SectionHeader
        title="Investments"
        subtitle="VUAG · LSE"
        action={
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => (editing ? void saveHoldings() : startEdit())}
              hitSlop={8}
              disabled={saving}
            >
              <Text style={styles.editLink}>
                {saving ? 'Saving…' : editing ? 'Save' : 'Edit'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void load(range)}
              hitSlop={8}
              style={styles.refreshBtn}
            >
              <Ionicons
                name="refresh"
                size={16}
                color={colors.textSecondary}
                style={loading ? { opacity: 0.4 } : undefined}
              />
            </Pressable>
          </View>
        }
      />

      <Card style={styles.card}>
        <View style={styles.rangeRow}>
          {RANGES.map((r) => (
            <Pressable
              key={r}
              onPress={() => setRange(r)}
              style={[styles.rangeChip, range === r && styles.rangeChipActive]}
            >
              <Text style={[styles.rangeText, range === r && styles.rangeTextActive]}>{r}</Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {data ? (
          <>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <View style={styles.badgeRow}>
                  <Text style={styles.symbol}>VUAG · LSE</Text>
                  <View
                    style={[
                      styles.badge,
                      live ? styles.badgeLive : styles.badgeOffline,
                    ]}
                  >
                    <Text style={[styles.badgeText, live && styles.badgeTextLive]}>
                      {live ? 'Live feed' : 'Offline'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      marketBadge.openish ? styles.badgeOpen : styles.badgeClosed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        marketBadge.openish ? styles.badgeTextOpen : styles.badgeTextClosed,
                      ]}
                    >
                      {marketBadge.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.fundName} numberOfLines={2}>
                  {data.name}
                </Text>
                <Text style={styles.portfolioValue}>
                  {formatMoney(data.portfolioValue)}
                </Text>
                <Text style={styles.unitMeta}>
                  {formatMoney(data.price, '£', 3)}/unit
                  {data.holdings > 0
                    ? ` · ${data.holdings.toLocaleString('en-GB', {
                        maximumFractionDigits: 4,
                      })} units`
                    : ' · no holdings set'}
                </Text>
              </View>

              <View style={styles.headerRight}>
                {unrealized == null ? (
                  <Text style={styles.mutedSmall}>Set invested below</Text>
                ) : (
                  <Text
                    style={[
                      styles.unrealized,
                      positiveUnrealized ? styles.good : styles.bad,
                    ]}
                  >
                    {formatMoney(unrealized, '£', 2, { signed: true })}
                    {'\n'}
                    <Text style={styles.unrealizedPct}>{formatPct(unrealizedPct ?? 0)}</Text>
                  </Text>
                )}
                <Text style={styles.mutedSmall}>Unrealised</Text>
              </View>
            </View>

            {editing ? (
              <View style={styles.editBox}>
                <Text style={styles.editLabel}>Holdings (units)</Text>
                <TextInput
                  style={styles.editInput}
                  value={holdingsDraft}
                  onChangeText={setHoldingsDraft}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.editLabel}>Amount invested (£)</Text>
                <TextInput
                  style={styles.editInput}
                  value={investedDraft}
                  onChangeText={setInvestedDraft}
                  keyboardType="decimal-pad"
                  placeholder="Optional"
                  placeholderTextColor={colors.textMuted}
                />
                <Pressable onPress={() => setEditing(false)}>
                  <Text style={styles.cancelEdit}>Cancel</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.chartWrap}>
              {loading && !points.length ? (
                <View style={styles.chartLoading}>
                  <ActivityIndicator color={colors.accent} />
                </View>
              ) : (
                <LineChart points={points} positive={rangePositive} height={150} />
              )}
            </View>

            <View style={styles.statsGrid}>
              <Stat label="Value" value={formatMoney(data.portfolioValue)} />
              <Stat
                label="Unrealised"
                value={
                  unrealized == null
                    ? '—'
                    : `${formatMoney(unrealized, '£', 2, { signed: true })} (${formatPct(unrealizedPct ?? 0)})`
                }
                tone={unrealized == null ? undefined : positiveUnrealized ? 'good' : 'bad'}
              />
              <Stat
                label="Rate of return"
                value={unrealizedPct == null ? '—' : formatPct(unrealizedPct)}
                tone={
                  unrealizedPct == null ? undefined : unrealizedPct >= 0 ? 'good' : 'bad'
                }
              />
              <Stat
                label="Last 24h"
                value={formatMoney(data.todayGainLoss, '£', 2, { signed: true })}
                tone={positiveToday ? 'good' : 'bad'}
              />
            </View>

            <View style={styles.dayRow}>
              <Text style={styles.dayLabel}>Daily change</Text>
              <Text style={[styles.dayValue, positiveDay ? styles.good : styles.bad]}>
                {formatPct(data.dailyChangePct)}
              </Text>
            </View>
          </>
        ) : loading ? (
          <View style={styles.chartLoading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}
      </Card>
    </View>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'bad';
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[
          styles.statValue,
          tone === 'good' && styles.good,
          tone === 'bad' && styles.bad,
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editLink: {
    color: colors.accentLight,
    fontSize: 13,
    fontWeight: '600',
  },
  refreshBtn: {
    padding: 6,
  },
  editBox: {
    gap: 6,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 4,
  },
  editInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: colors.background,
    fontFamily: 'SpaceMono',
  },
  cancelEdit: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  rangeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  rangeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  rangeChipActive: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderColor: colors.accent,
  },
  rangeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  rangeTextActive: {
    color: colors.accentLight,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
    maxWidth: 120,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  symbol: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  badgeLive: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderColor: 'rgba(34,197,94,0.25)',
  },
  badgeOffline: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
  },
  badgeOpen: {
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderColor: 'rgba(56,189,248,0.25)',
  },
  badgeClosed: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderColor: 'rgba(245,158,11,0.25)',
  },
  badgeText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
  badgeTextLive: {
    color: '#6ee7b7',
  },
  badgeTextOpen: {
    color: '#7dd3fc',
  },
  badgeTextClosed: {
    color: '#fcd34d',
  },
  fundName: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
  },
  portfolioValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
    marginTop: 8,
    letterSpacing: -0.5,
  },
  unitMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  unrealized: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'SpaceMono',
    textAlign: 'right',
  },
  unrealizedPct: {
    fontSize: 12,
    fontWeight: '500',
  },
  mutedSmall: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  chartWrap: {
    marginTop: 4,
  },
  chartLoading: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 14,
  },
  stat: {
    width: '47%',
    flexGrow: 1,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'SpaceMono',
    marginTop: 4,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  dayValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  good: {
    color: colors.success,
  },
  bad: {
    color: colors.danger,
  },
});
