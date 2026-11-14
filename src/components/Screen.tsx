import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ReactElement, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type RefreshControlProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { backIcon, row } from '@/theme/rtl';
import { colors, space } from '@/theme/tokens';

import { AppText } from './AppText';

export interface ScreenProps {
  title?: string;
  onBack?: () => void;
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
}

/** Safe-area page with an RTL header: back button on the right, actions on the left. */
export function Screen({ title, onBack, right, children, scroll, refreshControl }: ScreenProps) {
  const header =
    title || onBack || right ? (
      <View style={styles.header}>
        <View style={styles.headerSide}>
          {onBack ? (
            <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="חזרה" hitSlop={12}>
              <MaterialCommunityIcons name={backIcon} size={28} color={colors.text} />
            </Pressable>
          ) : null}
          {title ? (
            <AppText size="lg" weight="bold" numberOfLines={1} style={styles.title}>
              {title}
            </AppText>
          ) : null}
        </View>
        <View style={styles.actions}>{right}</View>
      </View>
    ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.body}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: row,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space(5),
    paddingVertical: space(3),
    gap: space(3),
  },
  headerSide: { flexDirection: row, alignItems: 'center', gap: space(2), flexShrink: 1 },
  title: { flexShrink: 1 },
  actions: { flexDirection: row, alignItems: 'center', gap: space(3) },
  body: { flex: 1, paddingHorizontal: space(5) },
  scrollContent: { paddingHorizontal: space(5), paddingBottom: space(28), gap: space(4) },
});
