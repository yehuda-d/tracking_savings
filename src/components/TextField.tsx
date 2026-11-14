import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { textStart } from '@/theme/rtl';
import { colors, font, fontSize, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  large?: boolean;
}

export function TextField({ label, error, large, onFocus, onBlur, ...rest }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <AppText size="sm" weight="medium" color={colors.textMuted}>
        {label}
      </AppText>
      <TextInput
        placeholderTextColor="#94A3B8"
        {...rest}
        accessibilityLabel={label}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          large && styles.large,
          { borderColor: error ? colors.negative : focused ? colors.primary : colors.border },
        ]}
      />
      {error ? (
        <AppText size="sm" color={colors.negative}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space(1.5) },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: space(4),
    fontFamily: font.regular,
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: textStart,
    writingDirection: 'rtl',
  },
  large: { minHeight: 72, fontFamily: font.bold, fontSize: fontSize.xl, textAlign: 'center' },
});
