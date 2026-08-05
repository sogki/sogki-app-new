import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card } from '@/src/components/ui/Card';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { clampPct } from '@/src/lib/format';
import type { LifeReading } from '@/src/lib/types';
import { colors, radius } from '@/src/theme/colors';

type ReadingCardProps = {
  reading: LifeReading;
  onChange: (reading: LifeReading) => void;
  /** Bump from widget menu to open editor. */
  editRequest?: number;
};

export function ReadingCard({ reading, onChange, editRequest }: ReadingCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(reading);

  const pct = clampPct(reading.currentPage, reading.totalPages || 1);

  const startEdit = () => {
    setDraft(reading);
    setEditing(true);
  };

  useEffect(() => {
    if (editRequest && editRequest > 0) startEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRequest]);

  const save = () => {
    onChange({
      ...draft,
      currentPage: Math.max(0, Number(draft.currentPage) || 0),
      totalPages: Math.max(1, Number(draft.totalPages) || 1),
      booksCompleted: Math.max(0, Number(draft.booksCompleted) || 0),
    });
    setEditing(false);
  };

  return (
    <View>
      <SectionHeader
        title="Reading"
        subtitle={`${reading.booksCompleted} books completed`}
        action={
          editing ? (
            <Pressable onPress={save} hitSlop={8}>
              <Text style={styles.editLink}>Save</Text>
            </Pressable>
          ) : null
        }
      />
      <Card>
        {editing ? (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              value={draft.currentBook}
              onChangeText={(t) => setDraft({ ...draft, currentBook: t })}
              placeholder="Book title"
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={styles.input}
              value={draft.author}
              onChangeText={(t) => setDraft({ ...draft, author: t })}
              placeholder="Author"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.half]}
                value={String(draft.currentPage)}
                onChangeText={(t) =>
                  setDraft({ ...draft, currentPage: Number(t.replace(/[^\d]/g, '')) || 0 })
                }
                keyboardType="number-pad"
                placeholder="Page"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={[styles.input, styles.half]}
                value={String(draft.totalPages)}
                onChangeText={(t) =>
                  setDraft({ ...draft, totalPages: Number(t.replace(/[^\d]/g, '')) || 1 })
                }
                keyboardType="number-pad"
                placeholder="Total"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <TextInput
              style={styles.input}
              value={String(draft.booksCompleted)}
              onChangeText={(t) =>
                setDraft({
                  ...draft,
                  booksCompleted: Number(t.replace(/[^\d]/g, '')) || 0,
                })
              }
              keyboardType="number-pad"
              placeholder="Books completed"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        ) : reading.currentBook ? (
          <>
            <Text style={styles.title}>{reading.currentBook}</Text>
            <Text style={styles.author}>{reading.author}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.pages}>
              p.{reading.currentPage} / {reading.totalPages} · {Math.round(pct)}%
            </Text>
          </>
        ) : (
          <Text style={styles.empty}>No book set — use ⋯ → Edit reading</Text>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  editLink: { color: colors.accentLight, fontSize: 13, fontWeight: '600' },
  form: { gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
  },
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  title: { color: colors.text, fontSize: 16, fontWeight: '600' },
  author: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  track: {
    height: 6,
    backgroundColor: colors.borderSubtle,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 12,
  },
  fill: { height: '100%', backgroundColor: colors.accent, borderRadius: 3 },
  pages: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
    textAlign: 'right',
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
