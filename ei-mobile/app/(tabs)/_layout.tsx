import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors } from '@/src/theme/colors';

const SIDE_TABS: {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}[] = [
  { name: 'camera', label: 'Camera', icon: 'camera-outline', iconActive: 'camera' },
  { name: 'projects', label: 'Projects', icon: 'code-slash-outline', iconActive: 'code-slash' },
  { name: 'tools', label: 'Tools', icon: 'construct-outline', iconActive: 'construct' },
  { name: 'settings', label: 'Settings', icon: 'settings-outline', iconActive: 'settings' },
];

function EiTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const focused = state.routes[state.index]?.name;

  const go = (name: string) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      navigation.navigate(name);
    }
  };

  const left = SIDE_TABS.slice(0, 2);
  const right = SIDE_TABS.slice(2);

  return (
    <View style={[styles.barWrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.bar}>
        <View style={styles.side}>
          {left.map((tab) => {
            const active = focused === tab.name;
            return (
              <Pressable key={tab.name} style={styles.sideItem} onPress={() => go(tab.name)}>
                <Ionicons
                  name={active ? tab.iconActive : tab.icon}
                  size={22}
                  color={active ? colors.accentLight : colors.textMuted}
                />
                <Text style={[styles.sideLabel, active && styles.sideLabelActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.centerSlot}>
          <Pressable
            onPress={() => go('index')}
            style={[styles.centerBtn, focused === 'index' && styles.centerBtnActive]}
          >
            <Ionicons name="grid" size={26} color={colors.text} />
          </Pressable>
          <Text style={[styles.centerLabel, focused === 'index' && styles.sideLabelActive]}>
            Dashboard
          </Text>
        </View>

        <View style={styles.side}>
          {right.map((tab) => {
            const active = focused === tab.name;
            return (
              <Pressable key={tab.name} style={styles.sideItem} onPress={() => go(tab.name)}>
                <Ionicons
                  name={active ? tab.iconActive : tab.icon}
                  size={22}
                  color={active ? colors.accentLight : colors.textMuted}
                />
                <Text style={[styles.sideLabel, active && styles.sideLabelActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {/* silence unused */}
      {descriptors ? null : null}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <EiTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="camera" options={{ title: 'Camera' }} />
      <Tabs.Screen name="projects" options={{ title: 'Projects' }} />
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="tools" options={{ title: 'Tools' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.tabBar,
    borderTopColor: colors.tabBarBorder,
    borderTopWidth: 1,
    paddingTop: 6,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    minHeight: Platform.OS === 'ios' ? 56 : 58,
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-end',
    paddingBottom: 4,
  },
  sideItem: {
    alignItems: 'center',
    gap: 2,
    minWidth: 56,
    paddingVertical: 4,
  },
  sideLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  sideLabelActive: {
    color: colors.accentLight,
  },
  centerSlot: {
    width: 88,
    alignItems: 'center',
    marginTop: -28,
  },
  centerBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.tabBar,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  centerBtnActive: {
    backgroundColor: '#7C3AED',
  },
  centerLabel: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
});
