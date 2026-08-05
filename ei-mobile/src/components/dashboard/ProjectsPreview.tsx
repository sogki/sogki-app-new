import { StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/src/components/ui/Badge';
import { Card } from '@/src/components/ui/Card';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { relativeDate } from '@/src/lib/format';
import { LIFE_PROJECT_STATUS_LABELS, type LifeProject } from '@/src/lib/types';
import { colors } from '@/src/theme/colors';

const STATUS_COLORS: Record<string, string> = {
  active: colors.success,
  paused: colors.warning,
  planning: colors.accentBlue,
  shipped: colors.accentLight,
};

type ProjectsPreviewProps = {
  projects: LifeProject[];
};

export function ProjectsPreview({ projects }: ProjectsPreviewProps) {
  const active = projects.filter((p) => p.status === 'active' || p.status === 'planning');
  const visible = active.slice(0, 3);

  return (
    <View>
      <SectionHeader title="Active Projects" subtitle={`${active.length} in progress`} />
      <Card>
        {visible.length === 0 ? (
          <Text style={styles.empty}>No active projects</Text>
        ) : (
          visible.map((project, i) => (
            <View key={project.id} style={[styles.project, i > 0 && styles.projectBorder]}>
              <View style={styles.header}>
                <Text style={styles.name}>{project.name}</Text>
                <Badge
                  label={LIFE_PROJECT_STATUS_LABELS[project.status]}
                  color={STATUS_COLORS[project.status]}
                />
              </View>
              {project.description ? (
                <Text style={styles.desc} numberOfLines={2}>
                  {project.description}
                </Text>
              ) : null}
              {project.stack.length > 0 ? (
                <Text style={styles.stack}>{project.stack.join(' · ')}</Text>
              ) : null}
              <Text style={styles.date}>Updated {relativeDate(project.updatedAt)}</Text>
            </View>
          ))
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
  },
  project: {
    paddingVertical: 12,
  },
  projectBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  desc: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  stack: {
    color: colors.accentLight,
    fontSize: 12,
    marginTop: 6,
  },
  date: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 6,
  },
});
