import { useCallback, useEffect, useState } from 'react';
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { GradientBackground } from '@/src/components/ui/GradientBackground';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { useAuth } from '@/src/context/AuthContext';
import { adminApi } from '@/src/lib/adminApi';
import type { LifeDashboardPayload } from '@/src/lib/types';
import { colors } from '@/src/theme/colors';

type ToolItem = {
  id: string;
  href: '/tools/cvs' | '/tools/blogs' | '/tools/packs' | '/tools/binders' | '/tools/settings';
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  count?: number;
};

export default function ToolsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout } = useAuth();
  const [payload, setPayload] = useState<LifeDashboardPayload | null>(null);
  const [counts, setCounts] = useState({
    blogs: 0,
    cvs: 0,
    packs: 0,
    binders: 0,
    masters: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [dash, blogs, cvs, packs, binders, masters] = await Promise.all([
      adminApi.lifeDashboard(),
      adminApi.blogs().catch(() => []),
      adminApi.cvs().catch(() => []),
      adminApi.resourcePacks().catch(() => []),
      adminApi.binderShowcases().catch(() => []),
      adminApi.collectionMasterSets().catch(() => []),
    ]);
    setPayload(dash.payload);
    setCounts({
      blogs: Array.isArray(blogs) ? blogs.length : 0,
      cvs: Array.isArray(cvs) ? cvs.length : 0,
      packs: Array.isArray(packs) ? packs.length : 0,
      binders: Array.isArray(binders) ? binders.length : 0,
      masters: Array.isArray(masters) ? masters.length : 0,
    });
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) return <LoadingState message="Loading tools..." />;

  const tools: ToolItem[] = [
    {
      id: 'cvs',
      href: '/tools/cvs',
      icon: 'briefcase-outline',
      title: 'CVs',
      subtitle: 'Preview, open & email resumes',
      count: counts.cvs,
    },
    {
      id: 'blogs',
      href: '/tools/blogs',
      icon: 'document-text-outline',
      title: 'Blogs',
      subtitle: 'Posts & drafts',
      count: counts.blogs,
    },
    {
      id: 'packs',
      href: '/tools/packs',
      icon: 'cube-outline',
      title: 'Resource Packs',
      subtitle: 'Minecraft packs & status',
      count: counts.packs,
    },
    {
      id: 'binders',
      href: '/tools/binders',
      icon: 'albums-outline',
      title: 'Collection',
      subtitle: 'Binders & master sets',
      count: counts.binders + counts.masters,
    },
    {
      id: 'settings',
      href: '/tools/settings',
      icon: 'settings-outline',
      title: 'Settings',
      subtitle: 'Site feature flags',
    },
  ];

  const quickLinks = [
    { label: 'Portfolio', url: payload?.links.portfolio || 'https://sogki.dev' },
    { label: 'GitHub', url: payload?.links.github || 'https://github.com/sogki' },
    {
      label: 'LinkedIn',
      url: payload?.links.linkedin || 'https://www.linkedin.com/in/jasonsws/',
    },
  ];

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
        <Text style={styles.pageTitle}>Tools</Text>
        <Text style={styles.pageSubtitle}>Admin panel sections</Text>

        <SectionHeader title="Site tools" subtitle="Tap to open" />
        <View style={styles.toolsGrid}>
          {tools.map((tool) => (
            <Pressable key={tool.id} onPress={() => router.push(tool.href)} style={styles.toolPress}>
              <Card style={styles.toolCard}>
                <Ionicons name={tool.icon} size={24} color={colors.accentLight} />
                <Text style={styles.toolTitle}>{tool.title}</Text>
                <Text style={styles.toolSubtitle}>{tool.subtitle}</Text>
                {tool.count !== undefined ? (
                  <Text style={styles.toolCount}>{tool.count} items</Text>
                ) : null}
              </Card>
            </Pressable>
          ))}
        </View>

        {quickLinks.length > 0 ? (
          <>
            <SectionHeader title="Quick links" />
            <View style={styles.linksRow}>
              {quickLinks.map((link) => (
                <Pressable
                  key={link.label}
                  style={styles.linkChip}
                  onPress={() => Linking.openURL(link.url!)}
                >
                  <Text style={styles.linkText}>{link.label}</Text>
                  <Ionicons name="open-outline" size={14} color={colors.accentLight} />
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <Pressable style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    gap: 16,
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
    marginBottom: 8,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  toolPress: {
    width: '48%',
    flexGrow: 1,
    minWidth: '46%',
  },
  toolCard: {
    gap: 6,
    padding: 14,
    minHeight: 120,
  },
  toolTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  toolSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },
  toolCount: {
    color: colors.accentLight,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  logoutText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '500',
  },
});
