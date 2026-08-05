import { StyleSheet, View, type ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Rect, FeTurbulence, Filter } from 'react-native-svg';
import { colors } from '@/src/theme/colors';

type GradientBackgroundProps = ViewProps & {
  /** Stronger brand wash for login / hero screens. */
  vivid?: boolean;
};

/**
 * Atmospheric backdrop: soft vertical wash + film grain.
 * No decorative blobs/circles.
 */
export function GradientBackground({
  children,
  style,
  vivid,
  ...props
}: GradientBackgroundProps) {
  return (
    <View style={[styles.container, style]} {...props}>
      <LinearGradient
        colors={
          vivid
            ? ['#0b0618', '#12101f', '#08060f', '#050508']
            : ['#0a0a12', '#07070c', '#050508']
        }
        locations={vivid ? [0, 0.35, 0.7, 1] : [0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={
          vivid
            ? ['rgba(99,102,241,0.22)', 'transparent', 'rgba(139,92,246,0.12)']
            : ['rgba(99,102,241,0.1)', 'transparent', 'rgba(139,92,246,0.06)']
        }
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.15)', 'transparent', 'rgba(0,0,0,0.55)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.grain} pointerEvents="none">
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <Filter id="eiGrain">
              <FeTurbulence
                type="fractalNoise"
                baseFrequency="0.85"
                numOctaves="3"
                stitchTiles="stitch"
              />
            </Filter>
          </Defs>
          <Rect width="100%" height="100%" filter="url(#eiGrain)" opacity={0.045} />
        </Svg>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  grain: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1,
  },
});
