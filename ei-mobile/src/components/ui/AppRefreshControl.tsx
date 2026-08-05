import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type RefreshControlProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '@/src/theme/colors';

type AppRefreshControlProps = Pick<RefreshControlProps, 'refreshing' | 'onRefresh'> & {
  /** Extra top offset for Android spinner under status bar / headers. */
  progressViewOffset?: number;
};

/**
 * Native pull-to-refresh spinner only (no iOS title text — that duplicates RefreshBanner).
 */
export function AppRefreshControl({
  refreshing,
  onRefresh,
  progressViewOffset,
}: AppRefreshControlProps) {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.accentLight}
      colors={[colors.accent, colors.accentLight, '#c4b5fd']}
      progressBackgroundColor="#1c1c28"
      progressViewOffset={
        progressViewOffset ?? (Platform.OS === 'android' ? 12 : undefined)
      }
    />
  );
}

type RefreshBannerProps = {
  visible: boolean;
  label?: string;
};

/**
 * Floating refresh chip pinned below the Dynamic Island / status bar.
 * Place as a sibling of ScrollView (not inside it).
 */
export function RefreshBanner({
  visible,
  label = 'Refreshing…',
}: RefreshBannerProps) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.overlay, { top: insets.top + 10 }]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.banner}>
        <ActivityIndicator size="small" color={colors.accentLight} />
        <Text style={styles.bannerText}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 50,
    elevation: 50,
    alignItems: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.45)',
    backgroundColor: 'rgba(18,18,28,0.94)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  bannerText: {
    color: colors.accentLight,
    fontSize: 13,
    fontWeight: '600',
  },
});
