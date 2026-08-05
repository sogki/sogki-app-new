import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '@/src/theme/colors';

export type SectionMenuAction = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  hint?: string;
};

type SectionMenuContextValue = {
  openMenu: () => void;
};

const SectionMenuContext = createContext<SectionMenuContextValue | null>(null);

export function useSectionMenu() {
  return useContext(SectionMenuContext);
}

type SectionMenuProps = {
  label: string;
  subtitle?: string;
  children: ReactNode;
  actions: SectionMenuAction[];
};

/** Long-press or header ⋯ opens the widget context menu. */
export function SectionMenu({ label, subtitle, children, actions }: SectionMenuProps) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const visibleActions = useMemo(
    () => actions.filter((a) => !a.disabled),
    [actions]
  );

  const openMenu = () => {
    Keyboard.dismiss();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOpen(true);
  };

  const close = () => setOpen(false);

  const run = (action: SectionMenuAction) => {
    close();
    requestAnimationFrame(() => action.onPress());
  };

  const ctx = useMemo(() => ({ openMenu }), []);

  return (
    <SectionMenuContext.Provider value={ctx}>
      <Pressable onLongPress={openMenu} delayLongPress={420} style={styles.wrap}>
        <View pointerEvents="box-none">{children}</View>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons name="grid-outline" size={18} color={colors.accentLight} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>{label}</Text>
                <Text style={styles.subtitle}>{subtitle ?? 'Widget options'}</Text>
              </View>
              <Pressable onPress={close} hitSlop={10} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              {visibleActions.map((action, i) => (
                <Pressable
                  key={action.id}
                  onPress={() => run(action)}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                    action.destructive && styles.rowDestructive,
                  ]}
                >
                  <View
                    style={[
                      styles.rowIcon,
                      action.destructive && styles.rowIconDestructive,
                    ]}
                  >
                    <Ionicons
                      name={action.icon}
                      size={18}
                      color={action.destructive ? colors.danger : colors.accentLight}
                    />
                  </View>
                  <View style={styles.rowText}>
                    <Text
                      style={[
                        styles.rowLabel,
                        action.destructive && styles.rowLabelDestructive,
                      ]}
                    >
                      {action.label}
                    </Text>
                    {action.hint ? (
                      <Text style={styles.rowHint}>{action.hint}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SectionMenuContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#12121a',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    paddingTop: 10,
    paddingHorizontal: 14,
    maxHeight: '72%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(139,92,246,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  list: { maxHeight: 420 },
  listContent: {
    gap: 6,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rowPressed: {
    backgroundColor: 'rgba(139,92,246,0.16)',
    borderColor: 'rgba(139,92,246,0.35)',
  },
  rowDestructive: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.2)',
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDestructive: {
    backgroundColor: 'rgba(239,68,68,0.14)',
  },
  rowText: { flex: 1 },
  rowLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  rowLabelDestructive: {
    color: colors.danger,
  },
  rowHint: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
});
