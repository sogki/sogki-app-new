import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
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
import { AppRefreshControl, RefreshBanner } from '@/src/components/ui/AppRefreshControl';
import { GradientBackground } from '@/src/components/ui/GradientBackground';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { SectionMenu, type SectionMenuAction } from '@/src/components/ui/SectionMenu';
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
  LifeProject,
  LifeReading,
  LifeReminder,
  LifeWeather,
} from '@/src/lib/types';
import { colors } from '@/src/theme/colors';

const DEFAULT_SECTION_ORDER = [
  'welcome',
  'assistant',
  'quickActions',
  'stats',
  'weather',
  'reminders',
  'investments',
  'habits',
  'goals',
  'jobSearch',
  'reading',
  'projects',
  'notes',
] as const;

type SectionId = (typeof DEFAULT_SECTION_ORDER)[number];

const SECTION_LABELS: Record<SectionId, string> = {
  welcome: 'Welcome',
  assistant: 'Ei',
  quickActions: 'Quick Actions',
  stats: 'Stats',
  weather: 'Weather',
  reminders: 'Reminders',
  investments: 'Investments',
  habits: 'Habits',
  goals: 'Goals',
  jobSearch: 'Job Search',
  reading: 'Reading',
  projects: 'Projects',
  notes: 'Notes',
};

function normalizeOrder(raw: string[] | undefined): SectionId[] {
  const allowed = new Set<string>(DEFAULT_SECTION_ORDER);
  const fromLayout = (raw ?? []).filter((id): id is SectionId => allowed.has(id));
  const missing = DEFAULT_SECTION_ORDER.filter((id) => !fromLayout.includes(id));
  return [...fromLayout, ...missing];
}

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
  const [editRequests, setEditRequests] = useState<Partial<Record<SectionId, number>>>({});

  const requestEdit = useCallback((id: SectionId) => {
    setEditRequests((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }, []);

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

  const persistLayout = useCallback(
    async (patch: Partial<LifeDashboardState['layout']>) => {
      if (!dashboard) return;
      const layout = {
        order: patch.order ?? dashboard.layout?.order ?? [...DEFAULT_SECTION_ORDER],
        spans: patch.spans ?? dashboard.layout?.spans ?? {},
        hidden: patch.hidden ?? dashboard.layout?.hidden ?? [],
      };
      setDashboard({ ...dashboard, layout });
      try {
        await adminApi.saveLifeDashboard({ layout });
      } catch {
        await load();
      }
    },
    [dashboard, load]
  );

  const persistLayoutOrder = useCallback(
    async (order: SectionId[]) => {
      await persistLayout({ order });
    },
    [persistLayout]
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

  const sectionOrder = useMemo(
    () => normalizeOrder(dashboard?.layout?.order),
    [dashboard?.layout?.order]
  );

  const hiddenSections = useMemo(() => {
    const raw = dashboard?.layout?.hidden ?? [];
    const allowed = new Set<string>(DEFAULT_SECTION_ORDER);
    return raw.filter((id): id is SectionId => allowed.has(id));
  }, [dashboard?.layout?.hidden]);

  const visibleOrder = useMemo(
    () => sectionOrder.filter((id) => !hiddenSections.includes(id)),
    [hiddenSections, sectionOrder]
  );

  const moveSection = useCallback(
    (id: SectionId, dir: -1 | 1) => {
      const idx = sectionOrder.indexOf(id);
      const nextIdx = idx + dir;
      if (idx < 0 || nextIdx < 0 || nextIdx >= sectionOrder.length) return;
      const next = [...sectionOrder];
      const [item] = next.splice(idx, 1);
      next.splice(nextIdx, 0, item!);
      void persistLayoutOrder(next);
    },
    [persistLayoutOrder, sectionOrder]
  );

  const moveSectionToEdge = useCallback(
    (id: SectionId, edge: 'top' | 'bottom') => {
      const idx = sectionOrder.indexOf(id);
      if (idx < 0) return;
      const next = [...sectionOrder];
      const [item] = next.splice(idx, 1);
      if (edge === 'top') next.unshift(item!);
      else next.push(item!);
      void persistLayoutOrder(next);
    },
    [persistLayoutOrder, sectionOrder]
  );

  const hideSection = useCallback(
    (id: SectionId) => {
      if (id === 'welcome' || id === 'assistant') return;
      if (hiddenSections.includes(id)) return;
      void persistLayout({ hidden: [...hiddenSections, id] });
    },
    [hiddenSections, persistLayout]
  );

  const unhideSection = useCallback(
    (id: SectionId) => {
      void persistLayout({ hidden: hiddenSections.filter((h) => h !== id) });
    },
    [hiddenSections, persistLayout]
  );

  const resetSectionOrder = useCallback(() => {
    void persistLayout({
      order: [...DEFAULT_SECTION_ORDER],
      hidden: [],
    });
  }, [persistLayout]);

  const refreshSection = useCallback(
    (id: SectionId) => {
      if (id === 'weather') {
        void loadWeather();
        return;
      }
      if (id === 'investments') {
        setInvestKey((k) => k + 1);
        return;
      }
      void load();
    },
    [load, loadWeather]
  );

  if (loading) return <LoadingState message="Initializing Ei..." />;

  const payload = dashboard?.payload;
  const habitsCompleted = payload?.habits.filter((h) => h.completed).length ?? 0;
  const activeProjects =
    payload?.projects.filter((p) => p.status === 'active' || p.status === 'planning')
      .length ?? 0;

  const renderSection = (id: SectionId) => {
    if (!payload) return null;
    switch (id) {
      case 'welcome':
        return (
          <WelcomeCard
            displayName={payload.displayName}
            reminders={payload.reminders ?? []}
            onRemindersChange={(reminders: LifeReminder[]) => patchPayload({ reminders })}
          />
        );
      case 'assistant':
        return (
          <EiAssistantCard
            payload={payload}
            investment={investment}
            weather={weather}
            onMutate={() => void load()}
          />
        );
      case 'quickActions':
        return <QuickActionsCard links={payload.links} />;
      case 'stats':
        return (
          <StatsRow
            investment={investment}
            habitsCompleted={habitsCompleted}
            habitsTotal={payload.habits.length}
            activeProjects={activeProjects}
            applicationsSent={payload.jobSearch.applicationsSent}
          />
        );
      case 'weather':
        return (
          <WeatherCard
            weather={weather}
            loading={weatherLoading}
            error={weatherError}
            onRefresh={() => void loadWeather()}
          />
        );
      case 'reminders':
        return (
          <RemindersCard
            reminders={payload.reminders ?? []}
            onChange={(reminders: LifeReminder[]) => patchPayload({ reminders })}
          />
        );
      case 'investments':
        return (
          <InvestmentsCard
            key={investKey}
            initial={investment}
            editRequest={editRequests.investments}
          />
        );
      case 'habits':
        return (
          <HabitsCard habits={payload.habits} onChange={saveHabits} onToggle={toggleHabit} />
        );
      case 'goals':
        return (
          <GoalsCard
            goals={payload.goals}
            onChange={(goals: LifeGoal[]) => patchPayload({ goals })}
          />
        );
      case 'jobSearch':
        return (
          <JobSearchCard
            jobSearch={payload.jobSearch}
            onChange={(jobSearch: LifeJobSearch) => patchPayload({ jobSearch })}
            editRequest={editRequests.jobSearch}
          />
        );
      case 'reading':
        return (
          <ReadingCard
            reading={payload.reading}
            onChange={(reading: LifeReading) => patchPayload({ reading })}
            editRequest={editRequests.reading}
          />
        );
      case 'projects':
        return (
          <ProjectsPreview
            projects={payload.projects}
            onChange={(projects: LifeProject[]) => patchPayload({ projects })}
          />
        );
      case 'notes':
        return (
          <NotesCard
            notes={payload.notes}
            onChange={(notes: LifeNote[]) => patchPayload({ notes })}
          />
        );
      default:
        return null;
    }
  };

  return (
    <GradientBackground>
      <StatusBar style="light" />
      <ScrollView
        style={styles.flex}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 110 },
        ]}
        refreshControl={
          <AppRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={insets.top + 8}
          />
        }
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.scrollInner}>
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {payload
              ? visibleOrder.map((id, index) => {
                  const fullIdx = sectionOrder.indexOf(id);
                  const canHide = id !== 'welcome' && id !== 'assistant';
                  const canEdit =
                    id === 'reading' || id === 'jobSearch' || id === 'investments';
                  const actions: SectionMenuAction[] = [
                    ...(canEdit
                      ? [
                          {
                            id: 'edit',
                            label:
                              id === 'reading'
                                ? 'Edit reading'
                                : id === 'jobSearch'
                                  ? 'Edit job search'
                                  : 'Edit holdings',
                            icon: 'create-outline' as const,
                            hint: 'Open this widget’s editor',
                            onPress: () => requestEdit(id),
                          } satisfies SectionMenuAction,
                        ]
                      : []),
                    {
                      id: 'top',
                      label: 'Move to top',
                      icon: 'arrow-up-circle-outline',
                      hint: 'Pin this widget at the top',
                      disabled: fullIdx <= 0,
                      onPress: () => moveSectionToEdge(id, 'top'),
                    },
                    {
                      id: 'up',
                      label: 'Move up',
                      icon: 'chevron-up-outline',
                      disabled: fullIdx <= 0,
                      onPress: () => moveSection(id, -1),
                    },
                    {
                      id: 'down',
                      label: 'Move down',
                      icon: 'chevron-down-outline',
                      disabled: fullIdx < 0 || fullIdx >= sectionOrder.length - 1,
                      onPress: () => moveSection(id, 1),
                    },
                    {
                      id: 'bottom',
                      label: 'Move to bottom',
                      icon: 'arrow-down-circle-outline',
                      hint: 'Send this widget to the end',
                      disabled: fullIdx < 0 || fullIdx >= sectionOrder.length - 1,
                      onPress: () => moveSectionToEdge(id, 'bottom'),
                    },
                    {
                      id: 'refresh',
                      label: 'Refresh widget',
                      icon: 'refresh-outline',
                      hint:
                        id === 'weather'
                          ? 'Reload local weather'
                          : id === 'investments'
                            ? 'Reload Vanguard quote'
                            : 'Reload dashboard data',
                      onPress: () => refreshSection(id),
                    },
                    ...(canHide
                      ? [
                          {
                            id: 'hide',
                            label: 'Hide from dashboard',
                            icon: 'eye-off-outline' as const,
                            hint: 'Use another widget’s organiser bar to unhide later',
                            destructive: true,
                            onPress: () => hideSection(id),
                          } satisfies SectionMenuAction,
                        ]
                      : []),
                    ...hiddenSections.map(
                      (hid): SectionMenuAction => ({
                        id: `unhide-${hid}`,
                        label: `Show ${SECTION_LABELS[hid]}`,
                        icon: 'eye-outline',
                        hint: 'Bring this widget back',
                        onPress: () => unhideSection(hid),
                      })
                    ),
                    {
                      id: 'reset',
                      label: 'Reset layout',
                      icon: 'albums-outline',
                      hint: 'Restore default order & show all',
                      onPress: resetSectionOrder,
                    },
                  ];

                  return (
                    <View key={id} style={styles.section}>
                      <SectionMenu
                        label={SECTION_LABELS[id]}
                        subtitle={`${index + 1} of ${visibleOrder.length} · ⋯ or long-press`}
                        actions={actions}
                      >
                        {renderSection(id)}
                      </SectionMenu>
                    </View>
                  );
                })
              : null}
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
      <RefreshBanner visible={refreshing} label="Refreshing dashboard…" />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  scrollInner: {
    flexGrow: 1,
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
