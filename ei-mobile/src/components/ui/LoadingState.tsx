import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/src/theme/colors';

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: colors.background,
  },
  text: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
