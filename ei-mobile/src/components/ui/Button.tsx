import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '@/src/theme/colors';

type ButtonProps = PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
};

export function Button({
  label,
  variant = 'primary',
  loading,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <Pressable
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.base,
          isDisabled && styles.disabled,
          pressed && !isDisabled && styles.pressed,
          style as ViewStyle,
        ]}
        {...props}
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <Text style={styles.primaryText}>{loading ? 'Please wait...' : label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style as ViewStyle,
      ]}
      {...props}
    >
      <Text
        style={[
          styles.text,
          variant === 'secondary' ? styles.secondaryText : null,
          variant === 'ghost' ? styles.ghostText : null,
        ]}
      >
        {loading ? 'Please wait...' : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  primaryText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  secondary: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  secondaryText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  ghost: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  ghostText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  text: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
