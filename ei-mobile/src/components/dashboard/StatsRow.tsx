import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/src/components/ui/Card';
import { formatMoney, formatPct } from '@/src/lib/format';
import type { InvestmentSnapshot } from '@/src/lib/types';
import { colors } from '@/src/theme/colors';

type StatsRowProps = {
  investment?: InvestmentSnapshot | null;
  habitsCompleted: number;
  habitsTotal: number;
  activeProjects: number;
  applicationsSent: number;
};

export function StatsRow({
  investment,
  habitsCompleted,
  habitsTotal,
  activeProjects,
  applicationsSent,
}: StatsRowProps) {
  const stats = [
    {
      label: 'Portfolio',
      value: investment ? formatMoney(investment.portfolioValue) : '—',
      sub: investment ? formatPct(investment.dailyChangePct) : undefined,
      subPositive: (investment?.dailyChangePct ?? 0) >= 0,
    },
    {
      label: 'Habits',
      value: `${habitsCompleted}/${habitsTotal}`,
      sub: habitsTotal > 0 ? `${Math.round((habitsCompleted / habitsTotal) * 100)}%` : undefined,
    },
    {
      label: 'Projects',
      value: String(activeProjects),
      sub: 'active',
    },
    {
      label: 'Applications',
      value: String(applicationsSent),
      sub: 'sent',
    },
  ];

  return (
    <View style={styles.row}>
      {stats.map((stat) => (
        <Card key={stat.label} style={styles.stat}>
          <Text style={styles.label}>{stat.label}</Text>
          <Text style={styles.value}>{stat.value}</Text>
          {stat.sub ? (
            <Text
              style={[
                styles.sub,
                stat.subPositive === true && { color: colors.success },
                stat.subPositive === false && { color: colors.danger },
              ]}
            >
              {stat.sub}
            </Text>
          ) : null}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stat: {
    flex: 1,
    minWidth: '46%',
    padding: 14,
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  value: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});
