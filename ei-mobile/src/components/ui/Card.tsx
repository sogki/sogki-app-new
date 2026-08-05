import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, radius } from '@/src/theme/colors';

type CardProps = ViewProps & {
  elevated?: boolean;
};

export function Card({ style, elevated, children, ...props }: CardProps) {
  return (
    <View
      style={[styles.card, elevated && styles.elevated, style]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    overflow: 'hidden',
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
  },
});
