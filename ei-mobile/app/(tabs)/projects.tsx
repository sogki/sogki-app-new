import { useCallback, useEffect, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '@/src/components/ui/Badge';
import { Card } from '@/src/components/ui/Card';
import { AppRefreshControl, RefreshBanner } from '@/src/components/ui/AppRefreshControl';
import { GradientBackground } from '@/src/components/ui/GradientBackground';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { adminApi } from '@/src/lib/adminApi';
import { relativeDate } from '@/src/lib/format';
import {
  LIFE_PROJECT_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  type LifeProject,
  type Project,
} from '@/src/lib/types';
import { colors } from '@/src/theme/colors';

const STATUS_COLORS: Record<string, string> = {
  active: colors.success,
  paused: colors.warning,
  planning: colors.accentBlue,
  shipped: colors.accentLight,
  live: colors.success,
  in_development: colors.accentBlue,
  closed_beta: colors.warning,
  offline: colors.textMuted,
  ceased: colors.danger,
};

export default function ProjectsScreen() {
  const insets = useSafeAreaInsets();
  const [lifeProjects, setLifeProjects] = useState<LifeProject[]>([]);
  const [portfolioProjects, setPortfolioProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'personal' | 'portfolio'>('personal');

  const load = useCallback(async () => {
    const [dash, projects] = await Promise.all([
      adminApi.lifeDashboard(),
      adminApi.projects(),
    ]);
    setLifeProjects(dash.payload.projects);
    setPortfolioProjects(projects);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) return <LoadingState message="Loading projects..." />;

  const sorted = [...lifeProjects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <GradientBackground>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          <AppRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={insets.top + 8}
          />
        }
      >
        <Text style={styles.pageTitle}>Projects</Text>
        <Text style={styles.pageSubtitle}>Personal tracker & portfolio</Text>

        <View style={styles.tabs}>
          <Pressable
            onPress={() => setTab('personal')}
            style={[styles.tab, tab === 'personal' && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === 'personal' && styles.tabTextActive]}>
              Personal ({lifeProjects.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('portfolio')}
            style={[styles.tab, tab === 'portfolio' && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === 'portfolio' && styles.tabTextActive]}>
              Portfolio ({portfolioProjects.length})
            </Text>
          </Pressable>
        </View>

        {tab === 'personal' ? (
          <View style={styles.list}>
            {sorted.length === 0 ? (
              <Card>
                <Text style={styles.empty}>No personal projects</Text>
              </Card>
            ) : (
              sorted.map((project) => (
                <Card key={project.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{project.name}</Text>
                    <Badge
                      label={LIFE_PROJECT_STATUS_LABELS[project.status]}
                      color={STATUS_COLORS[project.status]}
                    />
                  </View>
                  {project.description ? (
                    <Text style={styles.cardDesc}>{project.description}</Text>
                  ) : null}
                  {project.stack.length > 0 ? (
                    <View style={styles.stackRow}>
                      {project.stack.map((tech) => (
                        <View key={tech} style={styles.techChip}>
                          <Text style={styles.techText}>{tech}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <View style={styles.cardFooter}>
                    <Text style={styles.date}>Updated {relativeDate(project.updatedAt)}</Text>
                    <View style={styles.links}>
                      {project.githubUrl ? (
                        <Pressable onPress={() => Linking.openURL(project.githubUrl!)}>
                          <Ionicons name="logo-github" size={18} color={colors.textSecondary} />
                        </Pressable>
                      ) : null}
                      {project.url ? (
                        <Pressable onPress={() => Linking.openURL(project.url!)}>
                          <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                </Card>
              ))
            )}
          </View>
        ) : (
          <View style={styles.list}>
            <SectionHeader title="Portfolio" subtitle="sogki.dev projects" />
            {portfolioProjects.map((project) => (
              <Card key={project.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{project.title}</Text>
                  <Badge
                    label={PROJECT_STATUS_LABELS[project.status]}
                    color={STATUS_COLORS[project.status]}
                  />
                </View>
                {project.tagline ? (
                  <Text style={styles.tagline}>{project.tagline}</Text>
                ) : null}
                <Text style={styles.cardDesc} numberOfLines={3}>
                  {project.description}
                </Text>
                {project.technologies.length > 0 ? (
                  <View style={styles.stackRow}>
                    {project.technologies.slice(0, 5).map((tech) => (
                      <View key={tech} style={styles.techChip}>
                        <Text style={styles.techText}>{tech}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
      <RefreshBanner visible={refreshing} label="Refreshing projects…" />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
  },
  pageTitle: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 20,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderColor: colors.accent,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.accentLight,
  },
  list: {
    gap: 12,
  },
  card: {
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  tagline: {
    color: colors.accentLight,
    fontSize: 13,
    fontStyle: 'italic',
  },
  cardDesc: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  stackRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  techChip: {
    backgroundColor: 'rgba(99,102,241,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  techText: {
    color: colors.accentLight,
    fontSize: 11,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  date: {
    color: colors.textMuted,
    fontSize: 12,
  },
  links: {
    flexDirection: 'row',
    gap: 12,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
