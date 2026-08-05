import { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoalsCard } from '@/src/components/dashboard/GoalsCard';
import { HabitsCard } from '@/src/components/dashboard/HabitsCard';
import { EiAssistantCard } from '@/src/components/dashboard/EiAssistantCard';
import { InvestmentsCard } from '@/src/components/dashboard/InvestmentsCard';
import { JobSearchCard } from '@/src/components/dashboard/JobSearchCard';
import { NotesCard } from '@/src/components/dashboard/NotesCard';
import { ProjectsPreview } from '@/src/components/dashboard/ProjectsPreview';
import { QuickActionsCard } from '@/src/components/dashboard/QuickActionsCard';
import { ReadingCard } from '@/src/components/dashboard/ReadingCard';
import { RemindersCard } from '@/src/components/dashboard/RemindersCard';
import { StatsRow } from '@/src/components/dashboard/StatsRow';
import { WelcomeCard } from '@/src/components/dashboard/WelcomeCard';
import { WeatherCard } from '@/src/components/dashboard/WeatherCard';
import { GradientBackground } from '@/src/components/ui/GradientBackground';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { adminApi, fetchVuagQuote } from '@/src/lib/adminApi';
import { todayKey } from '@/src/lib/format';
import { fetchLiveWeather } from '@/src/lib/weather';
import type {
  InvestmentSnapshot,
  LifeDashboardPayload,
  LifeDashboardState,
  LifeGoal,
  LifeHabit,
  LifeJobSearch,
  LifeNote,
  LifeReading,
  LifeReminder,
  LifeWeather,
} from '@/src/lib/types';
import { colors } from '@/src/theme/colors';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [dashboard, setDashboard] = useState<LifeDashboardState | null>(null);
  const [investment, setInvestment] = useState<InvestmentSnapshot | null>(null);
  const [weather, setWeather] = useState<LifeWeather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [investKey, setInvestKey] = useState(0);

  const loadWeather = useCallback(async () => {
    setWeatherLoading(true);
    try {
      const live = await fetchLiveWeather();
      setWeather(live);
      setWeatherError(null);
    } catch (err) {
      setWeatherError(err instanceof Error ? err.message : 'Could not load local weather');
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const [dash, quote] = await Promise.all([
        adminApi.lifeDashboard(),
        fetchVuagQuote('1M').catch(() => null),
      ]);
      setDashboard(dash);
      setInvestment(quote);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    }
  }, []);

  useEffect(() => {
    void Promise.all([load(), loadWeather()]).finally(() => setLoading(false));
  }, [load, loadWeather]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([load(), loadWeather()]);
    setInvestKey((k) => k + 1);
    setRefreshing(false);
  }, [load, loadWeather]);

  const persistPayload = useCallback(
    async (nextPayload: LifeDashboardPayload) => {
      if (!dashboard) return;
      const updated: LifeDashboardState = {
        ...dashboard,
        payload: nextPayload,
      };
      setDashboard(updated);
      try {
        await adminApi.saveLifeDashboard({ payload: nextPayload });
      } catch {
        await load();
      }
    },
    [dashboard, load]
  );

  const patchPayload = useCallback(
    (patch: Partial<LifeDashboardPayload>) => {
      if (!dashboard) return;
      void persistPayload({ ...dashboard.payload, ...patch });
    },
    [dashboard, persistPayload]
  );

  const toggleHabit = useCallback(
    async (habitId: string) => {
      if (!dashboard) return;
      const today = todayKey();
      const completions = dashboard.payload.habitCompletions;
      const completedIds = new Set(
        completions?.date === today ? completions.completedIds : []
      );

      if (completedIds.has(habitId)) {
        completedIds.delete(habitId);
      } else {
        completedIds.add(habitId);
      }

      const updatedHabits = dashboard.payload.habits.map((h) => ({
        ...h,
        completed: completedIds.has(h.id),
      }));

      await persistPayload({
        ...dashboard.payload,
        habits: updatedHabits,
        habitCompletions: { date: today, completedIds: [...completedIds] },
      });
    },
    [dashboard, persistPayload]
  );

  const saveHabits = useCallback(
    (habits: LifeHabit[]) => {
      if (!dashboard) return;
      const today = todayKey();
      const completedIds = habits.filter((h) => h.completed).map((h) => h.id);
      void persistPayload({
        ...dashboard.payload,
        habits,
        habitCompletions: { date: today, completedIds },
      });
    },
    [dashboard, persistPayload]
  );

  if (loading) return <LoadingState message="Initializing Ei..." />;

  const payload = dashboard?.payload;
  const habitsCompleted = payload?.habits.filter((h) => h.completed).length ?? 0;
  const activeProjects =
    payload?.projects.filter((p) => p.status === 'active' || p.status === 'planning')
      .length ?? 0;

  return (
    <GradientBackground>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {payload ? (
          <>
            <View style={styles.section}>
              <WelcomeCard
                displayName={payload.displayName}
                reminders={payload.reminders ?? []}
                onRemindersChange={(reminders: LifeReminder[]) =>
                  patchPayload({ reminders })
                }
              />
            </View>

            <View style={styles.section}>
              <EiAssistantCard
                payload={payload}
                investment={investment}
                weather={weather}
                onMutate={() => void load()}
              />
            </View>

            <View style={styles.section}>
              <QuickActionsCard links={payload.links} />
            </View>

            <View style={styles.section}>
              <StatsRow
                investment={investment}
                habitsCompleted={habitsCompleted}
                habitsTotal={payload.habits.length}
                activeProjects={activeProjects}
                applicationsSent={payload.jobSearch.applicationsSent}
              />
            </View>

            <View style={styles.section}>
              <WeatherCard
                weather={weather}
                loading={weatherLoading}
                error={weatherError}
                onRefresh={() => void loadWeather()}
              />
            </View>

            <View style={styles.section}>
              <RemindersCard
                reminders={payload.reminders ?? []}
                onChange={(reminders: LifeReminder[]) => patchPayload({ reminders })}
              />
            </View>

            <View style={styles.section}>
              <InvestmentsCard key={investKey} initial={investment} />
            </View>

            <View style={styles.section}>
              <HabitsCard
                habits={payload.habits}
                onChange={saveHabits}
                onToggle={toggleHabit}
              />
            </View>

            <View style={styles.section}>
              <GoalsCard
                goals={payload.goals}
                onChange={(goals: LifeGoal[]) => patchPayload({ goals })}
              />
            </View>

            <View style={styles.section}>
              <JobSearchCard
                jobSearch={payload.jobSearch}
                onChange={(jobSearch: LifeJobSearch) => patchPayload({ jobSearch })}
              />
            </View>

            <View style={styles.section}>
              <ReadingCard
                reading={payload.reading}
                onChange={(reading: LifeReading) => patchPayload({ reading })}
              />
            </View>

            <View style={styles.section}>
              <ProjectsPreview projects={payload.projects} />
            </View>

            <View style={styles.section}>
              <NotesCard
                notes={payload.notes}
                onChange={(notes: LifeNote[]) => patchPayload({ notes })}
              />
            </View>
          </>
        ) : null}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    gap: 20,
  },
  section: {
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
});
