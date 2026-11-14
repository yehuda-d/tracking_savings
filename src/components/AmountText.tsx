import { formatAgorot, formatSignedAgorot } from '@/lib/money';
import type { TransactionKind } from '@/lib/types';
import { colors } from '@/theme/tokens';

import { AppText, type AppTextProps } from './AppText';

const sizes = { sm: 'sm', md: 'md', lg: 'lg', xl: 'xxl' } as const;

export interface AmountTextProps extends Omit<AppTextProps, 'size' | 'children'> {
  agorot: number;
  size?: keyof typeof sizes;
  kind?: TransactionKind;
}

export function AmountText({ agorot, size = 'md', kind, color, weight = 'bold', ...rest }: AmountTextProps) {
  // LRM marks keep sign, digits and ₪ in one left-to-right run inside Hebrew text ("−500 ₪", not "500−").
  const text = `‎${kind ? formatSignedAgorot(agorot, kind) : formatAgorot(agorot)}‎`;
  const tint =
    color ?? (kind === 'deposit' ? colors.positive : kind === 'withdrawal' ? colors.negative : colors.text);
  return (
    <AppText {...rest} weight={weight} size={sizes[size]} color={tint}>
      {text}
    </AppText>
  );
}
