import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import type { LifeHabit } from '@/src/lib/types';
import { colors, radius } from '@/src/theme/colors';

type HabitsCardProps = {
  habits: LifeHabit[];
  onChange: (habits: LifeHabit[]) => void;
  onToggle?: (id: string) => void;
};

export function HabitsCard({ habits, onChange, onToggle }: HabitsCardProps) {
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const completed = habits.filter((h) => h.completed).length;

  const addHabit = () => {
    const label = draft.trim();
    if (!label) return;
    onChange([
      ...habits,
      { id: `habit-${Date.now()}`, label, completed: false, streak: 0 },
    ]);
    setDraft('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const removeHabit = (id: string) => {
    onChange(habits.filter((h) => h.id !== id));
  };

  const startEdit = (habit: LifeHabit) => {
    setEditingId(habit.id);
    setEditLabel(habit.label);
  };

  const saveEdit = (id: string) => {
    const label = editLabel.trim();
    if (!label) return;
    onChange(habits.map((h) => (h.id === id ? { ...h, label } : h)));
    setEditingId(null);
  };

  return (
    <View>
      <SectionHeader
        title="Today's Habits"
        subtitle={`${completed} of ${habits.length} complete`}
      />
      <Card>
        {habits.length === 0 ? (
          <Text style={styles.empty}>No habits — add one below</Text>
        ) : (
          habits.map((habit, i) => {
            const editing = editingId === habit.id;
            return (
              <View key={habit.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onToggle?.(habit.id);
                  }}
                  style={styles.habitMain}
                >
                  <View style={[styles.checkbox, habit.completed && styles.checkboxDone]}>
                    {habit.completed ? <Text style={styles.check}>✓</Text> : null}
                  </View>
                  <View style={styles.content}>
                    {editing ? (
                      <TextInput
                        style={styles.editInput}
                        value={editLabel}
                        onChangeText={setEditLabel}
                        autoFocus
                        onSubmitEditing={() => saveEdit(habit.id)}
                      />
                    ) : (
                      <>
                        <Text style={[styles.label, habit.completed && styles.labelDone]}>
                          {habit.label}
                        </Text>
                        {habit.streak > 0 ? (
                          <Text style={styles.streak}>{habit.streak} day streak</Text>
                        ) : null}
                      </>
                    )}
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => (editing ? saveEdit(habit.id) : startEdit(habit))}
                  hitSlop={8}
                >
                  <Text style={styles.editLink}>{editing ? 'Save' : 'Edit'}</Text>
                </Pressable>
                <Pressable onPress={() => removeHabit(habit.id)} hitSlop={8}>
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            );
          })
        )}

        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="New habit…"
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={addHabit}
            returnKeyType="done"
          />
          <Pressable
            style={[styles.addBtn, !draft.trim() && styles.addDisabled]}
            onPress={addHabit}
            disabled={!draft.trim()}
          >
            <Ionicons name="add" size={20} color={colors.text} />
          </Pressable>
        </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  habitMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  check: { color: colors.text, fontSize: 13, fontWeight: '700' },
  content: { flex: 1 },
  label: { color: colors.text, fontSize: 15 },
  labelDone: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  streak: { color: colors.accentLight, fontSize: 12, marginTop: 2 },
  editLink: { color: colors.accentLight, fontSize: 12, fontWeight: '600' },
  editInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDisabled: { opacity: 0.4 },
});
