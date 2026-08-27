import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { colors, radius } from '@/src/theme/colors';

export type ScanResultAction = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  done?: boolean;
};

type ScanResultCardProps = {
  title: string;
  emoji?: string;
  category?: string | null;
  bullets: string[];
  memoryBanner?: string | null;
  heroImageUrl?: string | null;
  eyebrow?: string;
  footerNote?: string | null;
  actions: ScanResultAction[];
  children?: ReactNode;
};

export function ScanResultCard({
  title,
  emoji,
  category,
  bullets,
  memoryBanner,
  heroImageUrl,
  eyebrow = 'Ei Vision',
  footerNote,
  actions,
  children,
}: ScanResultCardProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>

      {memoryBanner ? (
        <View style={styles.memoryBanner}>
          <Ionicons name="time-outline" size={14} color={colors.accentLight} />
          <Text style={styles.memoryText}>{memoryBanner}</Text>
        </View>
      ) : null}

      {heroImageUrl ? (
        <Image source={{ uri: heroImageUrl }} style={styles.hero} resizeMode="contain" />
      ) : null}

      <Text style={styles.title} selectable>
        {emoji ? `${emoji} ` : ''}
        {title}
      </Text>

      {category ? (
        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>Category</Text>
          <Text style={styles.metaValue}>{category}</Text>
        </View>
      ) : null}

      {bullets.length ? (
        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>Information</Text>
          {bullets.map((b) => (
            <Text key={b} style={styles.bullet}>
              • {b}
            </Text>
          ))}
        </View>
      ) : null}

      {children}

      {actions.length ? (
        <View style={styles.actionsBlock}>
          <Text style={styles.metaLabel}>Actions</Text>
          <View style={styles.actionsRow}>
            {actions.map((a) => (
              <Pressable
                key={a.id}
                style={[
                  styles.actionBtn,
                  a.primary ? styles.actionPrimary : null,
                  a.done ? styles.actionDone : null,
                  a.disabled ? styles.actionDisabled : null,
                ]}
                onPress={a.onPress}
                disabled={a.disabled}
              >
                <Ionicons
                  name={a.done ? 'checkmark-circle' : a.icon}
                  size={15}
                  color={colors.text}
                />
                <Text style={styles.actionLabel}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {footerNote ? <Text style={styles.footer}>{footerNote}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    paddingVertical: 16,
  },
  eyebrow: {
    color: colors.accentLight,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  memoryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(94, 184, 255, 0.12)',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(94, 184, 255, 0.25)',
  },
  memoryText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  hero: {
    width: '100%',
    height: 140,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  metaBlock: {
    gap: 4,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  metaValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  bullet: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  actionsBlock: {
    gap: 8,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  actionDone: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    borderColor: 'rgba(74, 222, 128, 0.35)',
  },
  actionDisabled: {
    opacity: 0.5,
  },
  actionLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
});
