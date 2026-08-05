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
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const addNote = () => {
    const body = draftBody.trim();
    const title = draftTitle.trim() || body.slice(0, 40) + (body.length > 40 ? '…' : '');
    if (!body && !draftTitle.trim()) return;
    const note: LifeNote = {
      id: `note-${Date.now()}`,
      title: title || 'Untitled',
      body: body || title,
      pinned: false,
      updatedAt: new Date().toISOString(),
    };
    onChange([note, ...notes]);
    setDraftTitle('');
    setDraftBody('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    setEditTitle(note.title);
    setEditBody(note.body);
    setExpandedId(note.id);
  };

  const saveEdit = (id: string) => {
    const body = editBody.trim();
    const title = editTitle.trim() || body.slice(0, 40) + (body.length > 40 ? '…' : '');
    if (!body && !title) return;
    onChange(
      notes.map((n) =>
        n.id === id
          ? {
              ...n,
              title: title || 'Untitled',
              body: body || title,
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
      <SectionHeader title="Notes" subtitle={`${notes.length} total · pin · expand · edit`} />
      <Card>
        <TextInput
          style={styles.titleInput}
          value={draftTitle}
          onChangeText={setDraftTitle}
          placeholder="Title (optional)"
          placeholderTextColor={colors.textMuted}
        />
        <TextInput
          style={styles.input}
          value={draftBody}
          onChangeText={setDraftBody}
          placeholder="Write a note…"
          placeholderTextColor={colors.textMuted}
          multiline
        />
        <Pressable
          style={[styles.addBtn, !draftBody.trim() && !draftTitle.trim() && styles.addDisabled]}
          onPress={addNote}
          disabled={!draftBody.trim() && !draftTitle.trim()}
        >
          <Text style={styles.addText}>Add note</Text>
        </Pressable>

        {sorted.length === 0 ? (
          <Text style={styles.empty}>No notes yet</Text>
        ) : (
          sorted.map((note, i) => {
            const editing = editingId === note.id;
            const expanded = expandedId === note.id || editing;
            return (
              <View key={note.id} style={[styles.note, i > 0 && styles.noteBorder]}>
                {editing ? (
                  <View style={styles.editBlock}>
                    <TextInput
                      style={styles.titleInput}
                      value={editTitle}
                      onChangeText={setEditTitle}
                      placeholder="Title"
                      placeholderTextColor={colors.textMuted}
                    />
                    <TextInput
                      style={styles.input}
                      value={editBody}
                      onChangeText={setEditBody}
                      multiline
                      autoFocus
                    />
                    <View style={styles.editActions}>
                      <Pressable onPress={() => setEditingId(null)}>
                        <Text style={styles.linkMuted}>Cancel</Text>
                      </Pressable>
                      <Pressable onPress={() => saveEdit(note.id)}>
                        <Text style={styles.link}>Save</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <>
                    <Pressable
                      onPress={() =>
                        setExpandedId((id) => (id === note.id ? null : note.id))
                      }
                      style={styles.noteMain}
                    >
                      <View style={styles.noteHeader}>
                        <Text style={styles.noteTitle} numberOfLines={expanded ? 3 : 1}>
                          {note.pinned ? '📌 ' : ''}
                          {note.title}
                        </Text>
                        <Ionicons
                          name={expanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={colors.textMuted}
                        />
                      </View>
                      <Text
                        style={styles.noteBody}
                        numberOfLines={expanded ? undefined : 2}
                      >
                        {note.body}
                      </Text>
                    </Pressable>
                    <View style={styles.footer}>
                      <Text style={styles.date}>{relativeDate(note.updatedAt)}</Text>
                      <View style={styles.noteActions}>
                        <Pressable onPress={() => startEdit(note)} hitSlop={8}>
                          <Text style={styles.link}>Edit</Text>
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
  titleInput: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: colors.surfaceElevated,
    marginBottom: 8,
  },
  input: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    color: colors.text,
    fontSize: 14,
    textAlignVertical: 'top',
    backgroundColor: colors.surfaceElevated,
  },
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
  note: { paddingVertical: 12 },
  noteBorder: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  noteMain: { gap: 4 },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  noteTitle: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  noteBody: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  noteActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  link: { color: colors.accentLight, fontSize: 12, fontWeight: '600' },
  linkMuted: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  date: { color: colors.textMuted, fontSize: 11 },
  editBlock: { gap: 0 },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 10,
  },
});
