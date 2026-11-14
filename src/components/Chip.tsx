import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet } from 'react-native';

import type { IconName } from '@/lib/locationTypes';
import { row } from '@/theme/rtl';
import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';

export interface ChipProps {
  label: string;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ label, icon, selected, onPress }: ChipProps) {
  const fg = selected ? colors.primaryText : colors.text;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.chip, selected ? styles.selected : styles.idle]}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={18} color={selected ? fg : colors.primary} /> : null}
      <AppText size="sm" weight="medium" color={fg}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: row,
    alignItems: 'center',
    gap: space(1.5),
    paddingVertical: space(2.5),
    paddingHorizontal: space(3.5),
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  idle: { backgroundColor: colors.surface, borderColor: colors.border },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
});
