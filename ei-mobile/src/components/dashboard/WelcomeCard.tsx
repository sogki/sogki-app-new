import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/src/components/ui/Card';
import { RemindersCard } from '@/src/components/dashboard/RemindersCard';
import { formatTime, greetingForHour } from '@/src/lib/format';
import type { LifeReminder } from '@/src/lib/types';
import { colors } from '@/src/theme/colors';

type WelcomeCardProps = {
  displayName: string;
  reminders: LifeReminder[];
  onRemindersChange: (reminders: LifeReminder[]) => void;
};

export function WelcomeCard({
  displayName,
  reminders,
  onRemindersChange,
}: WelcomeCardProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const greeting = greetingForHour(now.getHours());
  const dateLabel = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Card style={styles.card}>
      <View style={styles.glow} />
      <Text style={styles.brand}>Ei</Text>
      <Text style={styles.greeting}>
        {greeting}, {displayName}.
      </Text>
      <View style={styles.meta}>
        <Text style={styles.date}>{dateLabel}</Text>
        <Text style={styles.time}>{formatTime(now)}</Text>
      </View>
      <RemindersCard
        reminders={reminders}
        onChange={onRemindersChange}
        compact
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  glow: {
    position: 'absolute',
    top: -40,
    left: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(99,102,241,0.2)',
  },
  brand: {
    color: colors.accentLight,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  greeting: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  date: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  time: {
    color: colors.text,
    fontSize: 13,
    fontFamily: 'SpaceMono',
  },
});
