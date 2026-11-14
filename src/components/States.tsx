import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { IconName } from '@/lib/locationTypes';
import { colors, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Button } from './Button';

export function LoadingState() {
  return (
    <View style={styles.center} accessibilityLabel="טוען">
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <MaterialCommunityIcons name="cloud-off-outline" size={48} color={colors.textMuted} />
      <AppText align="center" color={colors.textMuted}>
        {message}
      </AppText>
      <Button title="נסה שוב" variant="secondary" onPress={onRetry} compact />
    </View>
  );
}

export function EmptyState({
  title,
  subtitle,
  icon = 'piggy-bank-outline',
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  action?: ReactNode;
}) {
  return (
    <View style={styles.center}>
      <View style={styles.iconBubble}>
        <MaterialCommunityIcons name={icon} size={44} color={colors.primary} />
      </View>
      <AppText size="lg" weight="bold" align="center">
        {title}
      </AppText>
      {subtitle ? (
        <AppText align="center" color={colors.textMuted}>
          {subtitle}
        </AppText>
      ) : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space(3), padding: space(8) },
  iconBubble: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
