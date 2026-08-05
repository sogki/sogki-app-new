import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { clampPct, formatMoney } from '@/src/lib/format';
import type { LifeGoal } from '@/src/lib/types';
import { colors, radius } from '@/src/theme/colors';

type GoalsCardProps = {
  goals: LifeGoal[];
  onChange: (goals: LifeGoal[]) => void;
};

export function GoalsCard({ goals, onChange }: GoalsCardProps) {
  const [mode, setMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [currentDraft, setCurrentDraft] = useState('');
  const [targetDraft, setTargetDraft] = useState('');

  const addGoal = () => {
    const goal: LifeGoal = {
      id: `goal-${Date.now()}`,
      title: 'New goal',
      current: 0,
      target: 1000,
      currency: '£',
    };
    onChange([...goals, goal]);
    startEdit(goal);
    setMode(true);
  };

  const startEdit = (goal: LifeGoal) => {
    setEditingId(goal.id);
    setTitleDraft(goal.title);
    setCurrentDraft(String(goal.current));
    setTargetDraft(String(goal.target));
  };

  const saveEdit = (id: string) => {
    const current = Number(currentDraft);
    const target = Number(targetDraft);
    const title = titleDraft.trim();
    if (!title || !Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return;
    onChange(
      goals.map((g) => (g.id === id ? { ...g, title, current, target } : g))
    );
    setEditingId(null);
  };

  const removeGoal = (id: string) => {
    Alert.alert('Delete goal', 'Remove this goal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          onChange(goals.filter((g) => g.id !== id));
          if (editingId === id) setEditingId(null);
        },
      },
    ]);
  };

  return (
    <View>
      <SectionHeader
        title="Goals"
        subtitle={`${goals.length} active`}
        action={
          <View style={styles.headerActions}>
            <Pressable onPress={addGoal} hitSlop={8}>
              <Ionicons name="add-circle-outline" size={22} color={colors.accentLight} />
            </Pressable>
            <Pressable onPress={() => setMode((v) => !v)}>
              <Text style={styles.editLink}>{mode ? 'Done' : 'Manage'}</Text>
            </Pressable>
          </View>
        }
      />
      <Card>
        {goals.length === 0 ? (
          <Text style={styles.empty}>No goals — tap + to add one</Text>
        ) : (
          goals.map((goal, i) => {
            const pct = clampPct(goal.current, goal.target);
            const accent = goal.color ?? colors.accent;
            const editing = editingId === goal.id;
            return (
              <View key={goal.id} style={[styles.goal, i > 0 && styles.goalBorder]}>
                <View style={styles.goalHeader}>
                  {editing || mode ? (
                    <TextInput
                      style={[styles.input, styles.titleInput]}
                      value={editing ? titleDraft : goal.title}
                      onChangeText={(t) => {
                        if (editing) setTitleDraft(t);
                        else onChange(goals.map((g) => (g.id === goal.id ? { ...g, title: t } : g)));
                      }}
                      onFocus={() => !editing && startEdit(goal)}
                      placeholder="Goal title"
                      placeholderTextColor={colors.textMuted}
                    />
                  ) : (
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                  )}
                  <View style={styles.rowActions}>
                    <Pressable
                      onPress={() => (editing ? saveEdit(goal.id) : startEdit(goal))}
                    >
                      <Text style={styles.editLink}>{editing ? 'Save' : 'Edit'}</Text>
                    </Pressable>
                    {mode ? (
                      <Pressable onPress={() => removeGoal(goal.id)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                {editing ? (
                  <View style={styles.editRow}>
                    <TextInput
                      style={styles.input}
                      value={currentDraft}
                      onChangeText={setCurrentDraft}
                      keyboardType="decimal-pad"
                      placeholder="Current"
                      placeholderTextColor={colors.textMuted}
                    />
                    <Text style={styles.slash}>/</Text>
                    <TextInput
                      style={styles.input}
                      value={targetDraft}
                      onChangeText={setTargetDraft}
                      keyboardType="decimal-pad"
                      placeholder="Target"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                ) : (
                  <>
                    <Text style={styles.goalAmount}>
                      {formatMoney(goal.current, goal.currency ?? '£', 0)} /{' '}
                      {formatMoney(goal.target, goal.currency ?? '£', 0)}
                    </Text>
                    <View style={styles.track}>
                      <View
                        style={[styles.fill, { width: `${pct}%`, backgroundColor: accent }]}
                      />
                    </View>
                    <Text style={styles.pct}>{Math.round(pct)}%</Text>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
  },
  goal: { paddingVertical: 12 },
  goalBorder: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  goalTitle: { color: colors.text, fontSize: 15, fontWeight: '500', flex: 1 },
  titleInput: { flex: 1, marginRight: 4 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editLink: { color: colors.accentLight, fontSize: 13, fontWeight: '600' },
  goalAmount: { color: colors.textSecondary, fontSize: 12, marginBottom: 8 },
  track: {
    height: 6,
    backgroundColor: colors.borderSubtle,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3 },
  pct: { color: colors.textMuted, fontSize: 11, marginTop: 4, textAlign: 'right' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
  },
  slash: { color: colors.textMuted },
});
