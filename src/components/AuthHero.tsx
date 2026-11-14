import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme/tokens';

import { AppText } from './AppText';

export function AuthHero({ subtitle }: { subtitle: string }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.logo}>
        <MaterialCommunityIcons name="piggy-bank" size={48} color={colors.primaryText} />
      </View>
      <AppText size="xl" weight="bold" align="center">
        מעקב חסכונות
      </AppText>
      <AppText align="center" color={colors.textMuted}>
        {subtitle}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space(2), marginTop: space(10), marginBottom: space(6) },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space(2),
  },
});
