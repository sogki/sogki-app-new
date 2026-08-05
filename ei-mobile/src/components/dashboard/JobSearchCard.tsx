import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card } from '@/src/components/ui/Card';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { formatShortDate } from '@/src/lib/format';
import type { LifeJobSearch } from '@/src/lib/types';
import { colors, radius } from '@/src/theme/colors';

type JobSearchCardProps = {
  jobSearch: LifeJobSearch;
  onChange: (jobSearch: LifeJobSearch) => void;
  editRequest?: number;
};

const FIELDS: Array<{ key: keyof LifeJobSearch; label: string }> = [
  { key: 'applicationsSent', label: 'Applied' },
  { key: 'interviews', label: 'Interviews' },
  { key: 'offers', label: 'Offers' },
  { key: 'rejected', label: 'Rejected' },
];

export function JobSearchCard({ jobSearch, onChange, editRequest }: JobSearchCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(jobSearch);
  const [ucDraft, setUcDraft] = useState(
    jobSearch.upcomingUcAppointment
      ? jobSearch.upcomingUcAppointment.slice(0, 10)
      : ''
  );

  const startEdit = () => {
    setDraft(jobSearch);
    setUcDraft(
      jobSearch.upcomingUcAppointment
        ? jobSearch.upcomingUcAppointment.slice(0, 10)
        : ''
    );
    setEditing(true);
  };

  useEffect(() => {
    if (editRequest && editRequest > 0) startEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRequest]);

  const save = () => {
    const upcomingUcAppointment = /^\d{4}-\d{2}-\d{2}$/.test(ucDraft.trim())
      ? new Date(`${ucDraft.trim()}T10:00:00.000Z`).toISOString()
      : null;
    onChange({ ...draft, upcomingUcAppointment });
    setEditing(false);
  };

  const bump = (key: keyof LifeJobSearch, delta: number) => {
    if (key === 'upcomingUcAppointment') return;
    const next = Math.max(0, Number(jobSearch[key]) + delta);
    onChange({ ...jobSearch, [key]: next });
  };

  return (
    <View>
      <SectionHeader
        title="Job Search"
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
          <View style={styles.editGrid}>
            {FIELDS.map((field) => (
              <View key={field.key} style={styles.editField}>
                <Text style={styles.label}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  value={String(draft[field.key] ?? 0)}
                  onChangeText={(t) =>
                    setDraft({
                      ...draft,
                      [field.key]: Math.max(0, Number(t.replace(/[^\d]/g, '')) || 0),
                    })
                  }
                  keyboardType="number-pad"
                />
              </View>
            ))}
            <View style={styles.ucField}>
              <Text style={styles.label}>Next UC appointment (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={ucDraft}
                onChangeText={setUcDraft}
                placeholder="2026-08-12"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>
        ) : (
          <View style={styles.grid}>
            {FIELDS.map((field) => (
              <View key={field.key} style={styles.stat}>
                <View style={styles.bumpRow}>
                  <Pressable onPress={() => bump(field.key, -1)} hitSlop={6}>
                    <Text style={styles.bump}>−</Text>
                  </Pressable>
                  <Text style={styles.value}>{jobSearch[field.key] as number}</Text>
                  <Pressable onPress={() => bump(field.key, 1)} hitSlop={6}>
                    <Text style={styles.bump}>+</Text>
                  </Pressable>
                </View>
                <Text style={styles.label}>{field.label}</Text>
              </View>
            ))}
          </View>
        )}
        {!editing && jobSearch.upcomingUcAppointment ? (
          <Text style={styles.appointment}>
            Next UC appointment · {formatShortDate(jobSearch.upcomingUcAppointment)}
          </Text>
        ) : null}
        {!editing && !jobSearch.upcomingUcAppointment ? (
          <Text style={styles.appointmentMuted}>No UC appointment set — use ⋯ → Edit</Text>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  editLink: { color: colors.accentLight, fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', gap: 8 },
  editGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  editField: { width: '47%', flexGrow: 1 },
  ucField: { width: '100%', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
    marginTop: 4,
    fontFamily: 'SpaceMono',
    fontSize: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
  },
  bumpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bump: {
    color: colors.accentLight,
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  value: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
    minWidth: 28,
    textAlign: 'center',
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  appointment: {
    color: colors.accentLight,
    fontSize: 12,
    marginTop: 12,
  },
  appointmentMuted: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 12,
  },
});
