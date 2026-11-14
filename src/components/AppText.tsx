import { StyleSheet, Text, type TextProps } from 'react-native';

import { textStart } from '@/theme/rtl';
import { colors, font, fontSize } from '@/theme/tokens';

export interface AppTextProps extends TextProps {
  weight?: keyof typeof font;
  size?: keyof typeof fontSize;
  color?: string;
  align?: 'start' | 'center' | 'end';
}

export function AppText({ weight = 'regular', size = 'md', color = colors.text, align = 'start', style, ...rest }: AppTextProps) {
  const textAlign = align === 'center' ? 'center' : align === 'start' ? textStart : textStart === 'right' ? 'left' : 'right';
  return (
    <Text
      {...rest}
      style={[styles.base, { fontFamily: font[weight], fontSize: fontSize[size], color, textAlign }, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: { writingDirection: 'rtl' },
});
