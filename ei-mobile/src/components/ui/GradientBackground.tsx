import { StyleSheet, View, type ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/src/theme/colors';

export function GradientBackground({ children, style, ...props }: ViewProps) {
  return (
    <View style={[styles.container, style]} {...props}>
      <LinearGradient
        colors={['rgba(99,102,241,0.15)', 'transparent', 'rgba(139,92,246,0.1)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  glowTop: {
    position: 'absolute',
    top: -80,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(99,102,241,0.12)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: 100,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(139,92,246,0.08)',
  },
});
