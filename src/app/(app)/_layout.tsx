import { Stack } from 'expo-router';

import { useMyHousehold } from '@/data/household';
import { useAppFocusRefetch, useHouseholdRealtime } from '@/data/realtime';
import { colors } from '@/theme/tokens';

export default function AppLayout() {
  const household = useMyHousehold();
  useHouseholdRealtime(household.data?.id);
  useAppFocusRefetch();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
