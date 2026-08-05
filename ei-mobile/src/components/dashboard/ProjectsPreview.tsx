import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '@/src/components/ui/Badge';
import { Card } from '@/src/components/ui/Card';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { relativeDate } from '@/src/lib/format';
import {
  LIFE_PROJECT_STATUS_LABELS,
  type LifeProject,
  type LifeProjectStatus,
} from '@/src/lib/types';
import { colors, radius } from '@/src/theme/colors';

const STATUS_COLORS: Record<string, string> = {
  active: colors.success,
  paused: colors.warning,
  planning: colors.accentBlue,
  shipped: colors.accentLight,
};

const STATUSES: LifeProjectStatus[] = ['active', 'planning', 'paused', 'shipped'];

type ProjectsPreviewProps = {
  projects: LifeProject[];
  onChange: (projects: LifeProject[]) => void;
};

export function ProjectsPreview({ projects, onChange }: ProjectsPreviewProps) {
  const [draftName, setDraftName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const sorted = [...projects].sort((a, b) => {
    const rank = (s: LifeProjectStatus) =>
      s === 'active' ? 0 : s === 'planning' ? 1 : s === 'paused' ? 2 : 3;
    return rank(a.status) - rank(b.status);
  });

  const addProject = () => {
    const name = draftName.trim();
    if (!name) return;
    const project: LifeProject = {
      id: `proj-${Date.now()}`,
      name,
      description: '',
      status: 'active',
      stack: [],
      updatedAt: new Date().toISOString(),
    };
    onChange([project, ...projects]);
    setDraftName('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const cycleStatus = (id: string) => {
    onChange(
      projects.map((p) => {
        if (p.id !== id) return p;
        const idx = STATUSES.indexOf(p.status);
        const next = STATUSES[(idx + 1) % STATUSES.length]!;
        return { ...p, status: next, updatedAt: new Date().toISOString() };
      })
    );
  };

  const startEdit = (p: LifeProject) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditDesc(p.description);
  };

  const saveEdit = (id: string) => {
    const name = editName.trim();
    if (!name) return;
    onChange(
      projects.map((p) =>
        p.id === id
          ? {
              ...p,
              name,
              description: editDesc.trim(),
              updatedAt: new Date().toISOString(),
            }
          : p
      )
    );
    setEditingId(null);
  };

  const remove = (id: string) => {
    Alert.alert('Delete project', 'Remove this project from the dashboard?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onChange(projects.filter((p) => p.id !== id)),
      },
    ]);
  };

  const activeCount = projects.filter((p) => p.status === 'active' || p.status === 'planning').length;

  return (
    <View>
      <SectionHeader title="Projects" subtitle={`${activeCount} active · tap status to cycle`} />
      <Card>
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            value={draftName}
            onChangeText={setDraftName}
            placeholder="New project name…"
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={addProject}
            returnKeyType="done"
          />
          <Pressable
            style={[styles.addBtn, !draftName.trim() && styles.addDisabled]}
            onPress={addProject}
            disabled={!draftName.trim()}
          >
            <Ionicons name="add" size={20} color={colors.text} />
          </Pressable>
        </View>

        {sorted.length === 0 ? (
          <Text style={styles.empty}>No projects yet</Text>
        ) : (
          sorted.map((project, i) => {
            const editing = editingId === project.id;
            return (
              <View key={project.id} style={[styles.project, i > 0 && styles.projectBorder]}>
                {editing ? (
                  <View style={styles.editBlock}>
                    <TextInput
                      style={styles.input}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Name"
                      placeholderTextColor={colors.textMuted}
                    />
                    <TextInput
                      style={[styles.input, styles.descInput]}
                      value={editDesc}
                      onChangeText={setEditDesc}
                      placeholder="Description"
                      placeholderTextColor={colors.textMuted}
                      multiline
                    />
                    <View style={styles.editActions}>
                      <Pressable onPress={() => setEditingId(null)}>
                        <Text style={styles.linkMuted}>Cancel</Text>
                      </Pressable>
                      <Pressable onPress={() => saveEdit(project.id)}>
                        <Text style={styles.link}>Save</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={styles.header}>
                      <Text style={styles.name}>{project.name}</Text>
                      <Pressable onPress={() => cycleStatus(project.id)} hitSlop={6}>
                        <Badge
                          label={LIFE_PROJECT_STATUS_LABELS[project.status]}
                          color={STATUS_COLORS[project.status]}
                        />
                      </Pressable>
                    </View>
                    {project.description ? (
                      <Text style={styles.desc} numberOfLines={3}>
                        {project.description}
                      </Text>
                    ) : null}
                    {project.stack.length > 0 ? (
                      <Text style={styles.stack}>{project.stack.join(' · ')}</Text>
                    ) : null}
                    <View style={styles.footer}>
                      <Text style={styles.date}>Updated {relativeDate(project.updatedAt)}</Text>
                      <View style={styles.rowActions}>
                        <Pressable onPress={() => startEdit(project)} hitSlop={8}>
                          <Text style={styles.link}>Edit</Text>
                        </Pressable>
                        <Pressable onPress={() => remove(project.id)} hitSlop={8}>
                          <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        </Pressable>
                      </View>
                    </View>
                  </>
                )}
              </View>
            );
          })
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
    backgroundColor: colors.surfaceElevated,
  },
  descInput: { minHeight: 64, textAlignVertical: 'top', marginTop: 8 },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDisabled: { opacity: 0.4 },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
  },
  project: { paddingVertical: 12 },
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  date: {
    color: colors.textMuted,
    fontSize: 11,
  },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  link: { color: colors.accentLight, fontSize: 12, fontWeight: '600' },
  linkMuted: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  editBlock: { gap: 0 },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 10,
  },
});
