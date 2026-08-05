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
import { Card } from '@/src/components/ui/Card';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { formatReminderLine } from '@/src/lib/eiOverview';
import type { LifeReminder } from '@/src/lib/types';
import { colors, radius } from '@/src/theme/colors';

type RemindersCardProps = {
  reminders: LifeReminder[];
  onChange: (reminders: LifeReminder[]) => void;
  /** Compact strip under the greeting */
  compact?: boolean;
};

export function RemindersCard({ reminders, onChange, compact }: RemindersCardProps) {
  const [draft, setDraft] = useState('');
  const [dueDraft, setDueDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDue, setEditDue] = useState('');

  const open = reminders.filter((r) => !r.done);
  const done = reminders.filter((r) => r.done);
  const sorted = [...open, ...done];

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    const dueAt = parseDueInput(dueDraft);
    onChange([
      {
        id: `rem-${Date.now()}`,
        title,
        dueAt,
        done: false,
        createdAt: new Date().toISOString(),
      },
      ...reminders,
    ]);
    setDraft('');
    setDueDraft('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleDone = (id: string) => {
    onChange(reminders.map((r) => (r.id === id ? { ...r, done: !r.done } : r)));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const remove = (id: string) => {
    Alert.alert('Delete reminder', 'Remove this reminder?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onChange(reminders.filter((r) => r.id !== id)),
      },
    ]);
  };

  const startEdit = (r: LifeReminder) => {
    setEditingId(r.id);
    setEditTitle(r.title);
    setEditDue(r.dueAt ? toDateInput(r.dueAt) : '');
  };

  const saveEdit = (id: string) => {
    const title = editTitle.trim();
    if (!title) return;
    onChange(
      reminders.map((r) =>
        r.id === id
          ? { ...r, title, dueAt: parseDueInput(editDue) }
          : r
      )
    );
    setEditingId(null);
  };

  if (compact) {
    return (
      <View style={styles.compactWrap}>
        {open.length === 0 ? (
          <Text style={styles.compactEmpty}>No reminders</Text>
        ) : (
          open.slice(0, 4).map((r) => (
            <Pressable
              key={r.id}
              style={styles.compactRow}
              onPress={() => toggleDone(r.id)}
              onLongPress={() => remove(r.id)}
            >
              <Ionicons name="alarm-outline" size={14} color={colors.accentLight} />
              <Text style={styles.compactText} numberOfLines={1}>
                {formatReminderLine(r)}
              </Text>
            </Pressable>
          ))
        )}
        {open.length > 4 ? (
          <Text style={styles.compactMore}>+{open.length - 4} more below</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View>
      <SectionHeader
        title="Reminders"
        subtitle={`${open.length} open`}
      />
      <Card>
        <View style={styles.addBlock}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="New reminder…"
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={add}
            returnKeyType="done"
          />
          <TextInput
            style={styles.dueInput}
            value={dueDraft}
            onChangeText={setDueDraft}
            placeholder="Due YYYY-MM-DD (optional)"
            placeholderTextColor={colors.textMuted}
          />
          <Pressable
            style={[styles.addBtn, !draft.trim() && styles.addDisabled]}
            onPress={add}
            disabled={!draft.trim()}
          >
            <Text style={styles.addText}>Add</Text>
          </Pressable>
        </View>

        {sorted.length === 0 ? (
          <Text style={styles.empty}>No reminders yet</Text>
        ) : (
          sorted.map((r, i) => {
            const editing = editingId === r.id;
            return (
              <View key={r.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                <Pressable onPress={() => toggleDone(r.id)} style={styles.check}>
                  <Ionicons
                    name={r.done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={r.done ? colors.success : colors.textMuted}
                  />
                </Pressable>
                <View style={styles.content}>
                  {editing ? (
                    <>
                      <TextInput
                        style={styles.input}
                        value={editTitle}
                        onChangeText={setEditTitle}
                        autoFocus
                      />
                      <TextInput
                        style={[styles.dueInput, { marginTop: 6 }]}
                        value={editDue}
                        onChangeText={setEditDue}
                        placeholder="Due YYYY-MM-DD"
                        placeholderTextColor={colors.textMuted}
                      />
                    </>
                  ) : (
                    <>
                      <Text style={[styles.title, r.done && styles.titleDone]}>
                        {r.title}
                      </Text>
                      {r.dueAt ? (
                        <Text style={styles.due}>{formatReminderLine(r).split(' · ')[1]}</Text>
                      ) : null}
                    </>
                  )}
                </View>
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => (editing ? saveEdit(r.id) : startEdit(r))}
                    hitSlop={8}
                  >
                    <Text style={styles.editLink}>{editing ? 'Save' : 'Edit'}</Text>
                  </Pressable>
                  <Pressable onPress={() => remove(r.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </Card>
    </View>
  );
}

function parseDueInput(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  // Accept YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    return new Date(`${t}T09:00:00.000Z`).toISOString();
  }
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function toDateInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

const styles = StyleSheet.create({
  compactWrap: {
    marginTop: 14,
    gap: 6,
  },
  compactEmpty: {
    color: colors.textMuted,
    fontSize: 12,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.22)',
  },
  compactText: {
    color: colors.text,
    fontSize: 13,
    flex: 1,
  },
  compactMore: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  addBlock: { gap: 8, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
    fontSize: 14,
  },
  dueInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
    fontSize: 13,
  },
  addBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  addDisabled: { opacity: 0.4 },
  addText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  check: { paddingTop: 2 },
  content: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 15 },
  titleDone: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  due: { color: colors.accentLight, fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 2 },
  editLink: { color: colors.accentLight, fontSize: 13, fontWeight: '600' },
});
