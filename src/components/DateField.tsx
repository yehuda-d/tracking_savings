import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { formatDateHe, todayLocalISO } from '@/lib/dates';
import { row } from '@/theme/rtl';
import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { TextField } from './TextField';

export interface DateFieldProps {
  label: string;
  /** YYYY-MM-DD, or '' for "not set". */
  value: string;
  onChange: (iso: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
  error?: string;
}

const isoToDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Native date picker on Android; a plain text field (YYYY-MM-DD) on web. */
export function DateField({ label, value, onChange, minimumDate, maximumDate, placeholder, error }: DateFieldProps) {
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <TextField
        label={label}
        value={value}
        onChangeText={onChange}
        placeholder="שנה-חודש-יום, למשל 2027-06-30"
        error={error}
      />
    );
  }

  const shown = value
    ? value === todayLocalISO()
      ? `היום, ${formatDateHe(value)}`
      : formatDateHe(value)
    : (placeholder ?? 'בחירת תאריך');

  return (
    <View style={styles.group}>
      <AppText size="sm" weight="medium" color={colors.textMuted}>
        {label}
      </AppText>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${shown}`}
        style={[styles.button, error ? { borderColor: colors.negative } : null]}
      >
        <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.primary} />
        <AppText color={value ? colors.text : colors.textMuted}>{shown}</AppText>
      </Pressable>
      {error ? (
        <AppText size="sm" color={colors.negative}>
          {error}
        </AppText>
      ) : null}
      {open ? (
        <DateTimePicker
          value={value ? isoToDate(value) : (minimumDate ?? new Date())}
          mode="date"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event, date) => {
            setOpen(false);
            if (event.type === 'set' && date) onChange(todayLocalISO(date));
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space(1.5) },
  button: {
    flexDirection: row,
    alignItems: 'center',
    gap: space(2),
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: space(4),
  },
});
