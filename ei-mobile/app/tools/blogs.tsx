import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge } from '@/src/components/ui/Badge';
import { Card } from '@/src/components/ui/Card';
import { AppRefreshControl, RefreshBanner } from '@/src/components/ui/AppRefreshControl';
import { GradientBackground } from '@/src/components/ui/GradientBackground';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { ToolScreenHeader } from '@/src/components/ui/ToolScreenHeader';
import { adminApi } from '@/src/lib/adminApi';
import { formatShortDate } from '@/src/lib/format';
import type { BlogPost } from '@/src/lib/toolTypes';
import { colors, radius } from '@/src/theme/colors';

export default function BlogsToolScreen() {
  const insets = useSafeAreaInsets();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await adminApi.blogs();
    const list = Array.isArray(data) ? (data as BlogPost[]) : [];
    list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    setBlogs(list);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const togglePublish = async (blog: BlogPost) => {
    setBusyId(blog.id);
    try {
      await adminApi.updateBlog(blog.id, {
        published_at: blog.published_at ? null : new Date().toISOString(),
      });
      await load();
    } catch (e) {
      Alert.alert('Update failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <LoadingState message="Loading blogs..." />;

  return (
    <GradientBackground>
      <StatusBar style="light" />
      <ToolScreenHeader title="Blogs" subtitle={`${blogs.length} posts`} />
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
        {blogs.map((blog) => {
          const open = blog.id === expandedId;
          return (
            <Pressable
              key={blog.id}
              onPress={() => setExpandedId(open ? null : blog.id)}
            >
              <Card style={styles.card}>
                {blog.preview_image_url ? (
                  <Image
                    source={{ uri: blog.preview_image_url }}
                    style={styles.preview}
                    resizeMode="cover"
                  />
                ) : null}
                <View style={styles.header}>
                  <Text style={styles.title}>{blog.title}</Text>
                  <Badge
                    label={blog.published_at ? 'Published' : 'Draft'}
                    color={blog.published_at ? colors.success : colors.warning}
                  />
                </View>
                <Text style={styles.slug}>/{blog.slug}</Text>
                {blog.excerpt ? (
                  <Text style={styles.excerpt} numberOfLines={open ? undefined : 2}>
                    {blog.excerpt}
                  </Text>
                ) : null}
                <Text style={styles.meta}>
                  {blog.published_at
                    ? `Published ${formatShortDate(blog.published_at)}`
                    : `Updated ${formatShortDate(blog.updated_at)}`}
                </Text>
                {open ? (
                  <>
                    {blog.content ? (
                      <Text style={styles.content}>
                        {blog.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
                      </Text>
                    ) : null}
                    <Pressable
                      style={styles.publishBtn}
                      onPress={() => void togglePublish(blog)}
                      disabled={busyId === blog.id}
                    >
                      <Text style={styles.publishText}>
                        {busyId === blog.id
                          ? 'Saving…'
                          : blog.published_at
                            ? 'Unpublish'
                            : 'Publish'}
                      </Text>
                    </Pressable>
                  </>
                ) : null}
              </Card>
            </Pressable>
          );
        })}
        {blogs.length === 0 ? (
          <Card>
            <Text style={styles.empty}>No blog posts</Text>
          </Card>
        ) : null}
      </ScrollView>
      <RefreshBanner visible={refreshing} label="Refreshing blogs…" />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, gap: 12 },
  card: { gap: 8, overflow: 'hidden' },
  preview: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: colors.surfaceElevated,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 },
  slug: { color: colors.accentLight, fontSize: 12, fontFamily: 'SpaceMono' },
  excerpt: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  meta: { color: colors.textMuted, fontSize: 12 },
  content: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  publishBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  publishText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: 16 },
});
