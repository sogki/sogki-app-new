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
import type { LifeNote } from '@/src/lib/types';
import { colors, radius } from '@/src/theme/colors';
import { relativeDate } from '@/src/lib/format';

type NotesCardProps = {
  notes: LifeNote[];
  onChange: (notes: LifeNote[]) => void;
};

export function NotesCard({ notes, onChange }: NotesCardProps) {
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');

  const sorted = [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const addNote = () => {
    const body = draft.trim();
    if (!body) return;
    const note: LifeNote = {
      id: `note-${Date.now()}`,
      title: body.slice(0, 40) + (body.length > 40 ? '…' : ''),
      body,
      pinned: false,
      updatedAt: new Date().toISOString(),
    };
    onChange([note, ...notes]);
    setDraft('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const togglePin = (id: string) => {
    onChange(
      notes.map((n) =>
        n.id === id
          ? { ...n, pinned: !n.pinned, updatedAt: new Date().toISOString() }
          : n
      )
    );
  };

  const startEdit = (note: LifeNote) => {
    setEditingId(note.id);
    setEditBody(note.body);
  };

  const saveEdit = (id: string) => {
    const body = editBody.trim();
    if (!body) return;
    onChange(
      notes.map((n) =>
        n.id === id
          ? {
              ...n,
              body,
              title: body.slice(0, 40) + (body.length > 40 ? '…' : ''),
              updatedAt: new Date().toISOString(),
            }
          : n
      )
    );
    setEditingId(null);
  };

  const removeNote = (id: string) => {
    Alert.alert('Delete note', 'Remove this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onChange(notes.filter((n) => n.id !== id)),
      },
    ]);
  };

  return (
    <View>
      <SectionHeader title="Notes" subtitle={`${notes.length} total`} />
      <Card>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Quick note…"
          placeholderTextColor={colors.textMuted}
          multiline
        />
        <Pressable
          style={[styles.addBtn, !draft.trim() && styles.addDisabled]}
          onPress={addNote}
          disabled={!draft.trim()}
        >
          <Text style={styles.addText}>Add note</Text>
        </Pressable>

        {sorted.length === 0 ? (
          <Text style={styles.empty}>No notes yet</Text>
        ) : (
          sorted.map((note, i) => {
            const editing = editingId === note.id;
            return (
              <View key={note.id} style={[styles.note, i > 0 && styles.noteBorder]}>
                <View style={styles.noteHeader}>
                  {editing ? (
                    <TextInput
                      style={[styles.input, styles.editInput]}
                      value={editBody}
                      onChangeText={setEditBody}
                      multiline
                      autoFocus
                    />
                  ) : (
                    <Text style={styles.noteBody}>{note.body}</Text>
                  )}
                  <View style={styles.noteActions}>
                    <Pressable
                      onPress={() => (editing ? saveEdit(note.id) : startEdit(note))}
                      hitSlop={8}
                    >
                      <Text style={styles.editLink}>{editing ? 'Save' : 'Edit'}</Text>
                    </Pressable>
                    <Pressable onPress={() => togglePin(note.id)} hitSlop={8}>
                      <Ionicons
                        name={note.pinned ? 'pin' : 'pin-outline'}
                        size={16}
                        color={note.pinned ? colors.accentLight : colors.textMuted}
                      />
                    </Pressable>
                    <Pressable onPress={() => removeNote(note.id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.date}>{relativeDate(note.updatedAt)}</Text>
              </View>
            );
          })
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 64,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    color: colors.text,
    fontSize: 14,
    textAlignVertical: 'top',
    backgroundColor: colors.surfaceElevated,
  },
  editInput: { flex: 1, minHeight: 56, marginRight: 8 },
  addBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 8,
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
  note: { paddingVertical: 10 },
  noteBorder: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  noteHeader: { flexDirection: 'row', gap: 8 },
  noteBody: { color: colors.text, fontSize: 14, lineHeight: 20, flex: 1 },
  noteActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editLink: { color: colors.accentLight, fontSize: 12, fontWeight: '600' },
  date: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
});
