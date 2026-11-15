import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { AmountText } from '@/components/AmountText';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { GoalLine } from '@/components/GoalProgress';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useMyHousehold } from '@/data/household';
import { useSavings } from '@/data/savings';
import { toHebrewError } from '@/lib/errors';
import { locationIcon, locationLabel } from '@/lib/locationTypes';
import type { SavingWithBalance } from '@/lib/types';
import { physicalLeft, row } from '@/theme/rtl';
import { colors, radius, shadow, space } from '@/theme/tokens';

export default function Home() {
  const router = useRouter();
  const household = useMyHousehold();
  const savings = useSavings();

  const list = savings.data ?? [];
  const total = list.reduce((sum, s) => sum + s.balance_agorot, 0);
  const openNew = () => router.push('/saving/new');

  const settingsButton = (
    <Pressable
      onPress={() => router.push('/settings')}
      accessibilityRole="button"
      accessibilityLabel="הגדרות"
      hitSlop={12}
      style={styles.iconButton}
    >
      <MaterialCommunityIcons name="cog-outline" size={24} color={colors.text} />
    </Pressable>
  );

  let body;
  if (savings.isPending) body = <LoadingState />;
  else if (savings.isError && !savings.data)
    body = <ErrorState message={toHebrewError(savings.error)} onRetry={() => savings.refetch()} />;
  else
    body = (
      <FlatList
        data={list}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={savings.isRefetching}
            onRefresh={() => {
              void savings.refetch();
              void household.refetch();
            }}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={<TotalCard total={total} count={list.length} />}
        ListEmptyComponent={
          <EmptyState
            title="עדיין אין חסכונות"
            subtitle="מוסיפים חיסכון ראשון ומתחילים לעקוב"
            action={<Button title="הוספת חיסכון ראשון" icon="plus" onPress={openNew} />}
          />
        }
        renderItem={({ item }) => (
          <SavingCard
            saving={item}
            onPress={() => router.push({ pathname: '/saving/[id]', params: { id: item.id } })}
          />
        )}
      />
    );

  return (
    <Screen title={household.data?.name ?? 'החסכונות שלנו'} right={settingsButton}>
      {body}
      {list.length > 0 ? (
        <Pressable
          onPress={openNew}
          accessibilityRole="button"
          accessibilityLabel="חיסכון חדש"
          style={({ pressed }) => [styles.fab, physicalLeft(space(5)), pressed && styles.fabPressed]}
        >
          <MaterialCommunityIcons name="plus" size={30} color={colors.primaryText} />
        </Pressable>
      ) : null}
    </Screen>
  );
}

function TotalCard({ total, count }: { total: number; count: number }) {
  return (
    <View style={styles.total}>
      <View style={styles.totalDecor} />
      <AppText color={colors.primarySoft} weight="medium">
        סה״כ חסכונות
      </AppText>
      <AmountText agorot={total} size="xl" color={colors.primaryText} />
      <AppText color={colors.primarySoft} size="sm">
        {count === 1 ? 'חיסכון אחד' : `${count} חסכונות`}
      </AppText>
    </View>
  );
}

function SavingCard({ saving, onPress }: { saving: SavingWithBalance; onPress: () => void }) {
  return (
    <Card onPress={onPress} accessibilityLabel={saving.purpose} style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.iconBubble}>
          <MaterialCommunityIcons name={locationIcon(saving.location_type)} size={24} color={colors.primary} />
        </View>
        <View style={styles.cardText}>
          <AppText weight="bold" size="lg">
            {saving.purpose}
          </AppText>
          <AppText color={colors.textMuted} size="sm">
            {locationLabel(saving.location_type)} · {saving.institution}
          </AppText>
        </View>
        <AmountText agorot={saving.balance_agorot} size="lg" />
      </View>
      {saving.goal_agorot ? <GoalLine balanceAgorot={saving.balance_agorot} goalAgorot={saving.goal_agorot} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: space(28), gap: space(3), flexGrow: 1 },
  iconButton: { padding: space(1) },
  total: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: space(6),
    gap: space(1),
    marginBottom: space(3),
    overflow: 'hidden',
    ...shadow,
  },
  totalDecor: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -60,
    ...physicalLeft(-50),
  },
  card: { paddingVertical: space(4) },
  cardRow: { flexDirection: row, alignItems: 'center', gap: space(3) },
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, gap: 2 },
  fab: {
    position: 'absolute',
    bottom: space(8),
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
    shadowOpacity: 0.2,
    elevation: 6,
  },
  fabPressed: { transform: [{ scale: 0.95 }] },
});
