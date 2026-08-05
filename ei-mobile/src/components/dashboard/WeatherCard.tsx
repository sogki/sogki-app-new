import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import type { LifeWeather } from '@/src/lib/types';
import { colors, radius } from '@/src/theme/colors';

type WeatherCardProps = {
  weather: LifeWeather | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
};

export function WeatherCard({ weather, loading, error, onRefresh }: WeatherCardProps) {
  return (
    <View>
      <SectionHeader
        title="Weather"
        subtitle={weather?.location || 'Near you'}
        action={
          onRefresh ? (
            <Pressable onPress={onRefresh} hitSlop={8} style={styles.refreshBtn}>
              <Ionicons
                name="refresh"
                size={16}
                color={colors.textSecondary}
                style={loading ? { opacity: 0.4 } : undefined}
              />
            </Pressable>
          ) : null
        }
      />
      <Card>
        {loading && !weather ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>Getting local weather…</Text>
          </View>
        ) : error && !weather ? (
          <Text style={styles.error}>{error}</Text>
        ) : weather ? (
          <>
            <View style={styles.top}>
              <View style={styles.main}>
                <Text style={styles.temp}>{weather.temperatureC}°</Text>
                <Text style={styles.condition}>{weather.condition}</Text>
                <Text style={styles.hl}>
                  H {weather.highC}° · L {weather.lowC}°
                </Text>
              </View>
              <View style={styles.iconWrap}>
                <Ionicons name="partly-sunny-outline" size={28} color={colors.accentLight} />
              </View>
            </View>

            {weather.forecast?.length ? (
              <View style={styles.forecast}>
                {weather.forecast.map((day) => (
                  <View key={`${day.day}-${day.highC}`} style={styles.day}>
                    <Text style={styles.dayName}>{day.day}</Text>
                    <Text style={styles.dayHigh}>{day.highC}°</Text>
                    <Text style={styles.dayCond} numberOfLines={1}>
                      {day.condition}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {error ? <Text style={styles.errorSoft}>{error}</Text> : null}
          </>
        ) : (
          <Text style={styles.empty}>No weather yet — pull to refresh</Text>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  refreshBtn: { padding: 6 },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  loadingText: { color: colors.textMuted, fontSize: 13 },
  error: { color: colors.danger, fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  errorSoft: { color: colors.warning, fontSize: 11, marginTop: 10 },
  empty: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  main: { flex: 1 },
  temp: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
    letterSpacing: -1,
  },
  condition: {
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: 2,
  },
  hl: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  forecast: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  day: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
  },
  dayName: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  dayHigh: {
    color: colors.text,
    fontSize: 14,
    fontFamily: 'SpaceMono',
    marginTop: 4,
  },
  dayCond: { color: colors.textMuted, fontSize: 10, marginTop: 2, paddingHorizontal: 2 },
});
