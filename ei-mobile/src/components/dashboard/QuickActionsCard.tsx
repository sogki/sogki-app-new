import { Linking, Pressable, StyleSheet, Text, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/ui/Card';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { adminApi } from '@/src/lib/adminApi';
import { colors, radius } from '@/src/theme/colors';

type QuickActionsCardProps = {
  links: {
    portfolio: string;
    github: string;
    linkedin: string;
  };
};

export function QuickActionsCard({ links }: QuickActionsCardProps) {
  const router = useRouter();

  const emailCv = async () => {
    try {
      const result = await adminApi.sendCvEmail({ includeAll: true });
      Alert.alert('Email sent', `Sent ${result.count} CV(s) to ${result.sent_to}`);
    } catch (e) {
      Alert.alert('Email failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const actions = [
    {
      id: 'cvs',
      label: 'Open CVs',
      icon: 'briefcase-outline' as const,
      onPress: () => router.push('/tools/cvs'),
    },
    {
      id: 'email',
      label: 'Email CV',
      icon: 'mail-outline' as const,
      onPress: () => void emailCv(),
    },
    {
      id: 'portfolio',
      label: 'Portfolio',
      icon: 'globe-outline' as const,
      onPress: () => Linking.openURL(links.portfolio || 'https://sogki.dev'),
    },
    {
      id: 'github',
      label: 'GitHub',
      icon: 'logo-github' as const,
      onPress: () => Linking.openURL(links.github || 'https://github.com/sogki'),
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      icon: 'logo-linkedin' as const,
      onPress: () =>
        Linking.openURL(links.linkedin || 'https://www.linkedin.com/in/jasonsws/'),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'settings-outline' as const,
      onPress: () => router.push('/tools/settings'),
    },
  ];

  return (
    <View>
      <SectionHeader title="Quick Actions" />
      <Card>
        <View style={styles.grid}>
          {actions.map((action) => (
            <Pressable key={action.id} style={styles.btn} onPress={action.onPress}>
              <Ionicons name={action.icon} size={18} color={colors.accentLight} />
              <Text style={styles.label}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  btn: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
});
