import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

import type { LocationType } from './types';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export const LOCATION_TYPES: readonly LocationType[] = [
  'bank_account',
  'deposit',
  'money_market_fund',
  'provident_fund',
  'study_fund',
  'other',
];

const LABELS: Record<LocationType, string> = {
  bank_account: 'חשבון בנק',
  deposit: 'פיקדון',
  money_market_fund: 'קרן כספית',
  provident_fund: 'קופת גמל',
  study_fund: 'קרן השתלמות',
  other: 'אחר',
};

const ICONS: Record<LocationType, IconName> = {
  bank_account: 'bank',
  deposit: 'safe',
  money_market_fund: 'chart-line',
  provident_fund: 'piggy-bank',
  study_fund: 'school',
  other: 'wallet',
};

export const locationLabel = (t: LocationType): string => LABELS[t];
export const locationIcon = (t: LocationType): IconName => ICONS[t];
