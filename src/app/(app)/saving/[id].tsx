import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { AmountText } from '@/components/AmountText';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Screen } from '@/components/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { TransactionSheet } from '@/components/TransactionSheet';
import { useDeleteSaving, useSaving } from '@/data/savings';
import { useDeleteTransaction, useTransactions } from '@/data/transactions';
import { formatDateHe } from '@/lib/dates';
import { toHebrewError } from '@/lib/errors';
import { locationIcon, locationLabel } from '@/lib/locationTypes';
import { formatSignedAgorot } from '@/lib/money';
import type { Transaction } from '@/lib/types';
import { row } from '@/theme/rtl';
import { colors, radius, space } from '@/theme/tokens';

const HOME = '/' as Href;

export default function SavingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const saving = useSaving(id);
  const transactions = useTransactions(id);
  const deleteSaving = useDeleteSaving();
  const deleteTx = useDeleteTransaction();

  const [sheet, setSheet] = useState<'deposit' | 'withdrawal' | null>(null);
  const [confirmDeleteSaving, setConfirmDeleteSaving] = useState(false);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

  const goHome = () => (router.canGoBack() ? router.back() : router.replace(HOME));

  if (saving.isPending) {
    return (
      <Screen onBack={goHome}>
        <LoadingState />
      </Screen>
    );
  }
  if (saving.isError) {
    return (
      <Screen onBack={goHome}>
        <ErrorState message={toHebrewError(saving.error)} onRetry={() => saving.refetch()} />
      </Screen>
    );
  }
  if (!saving.data) {
    return (
      <Screen onBack={goHome}>
        <EmptyState
          icon="delete-empty-outline"
          title="החיסכון נמחק"
          subtitle="ייתכן שמישהו אחר במשק הבית מחק אותו"
          action={<Button title="חזרה לרשימה" variant="secondary" onPress={() => router.replace(HOME)} />}
        />
      </Screen>
    );
  }

  const s = saving.data;

  const actions = (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="עריכה"
        hitSlop={10}
        onPress={() => router.push({ pathname: '/saving/edit/[id]', params: { id: s.id } })}
      >
        <MaterialCommunityIcons name="pencil-outline" size={24} color={colors.text} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="מחיקת החיסכון" hitSlop={10} onPress={() => setConfirmDeleteSaving(true)}>
        <MaterialCommunityIcons name="trash-can-outline" size={24} color={colors.negative} />
      </Pressable>
    </>
  );

  return (
    <Screen
      title={s.purpose}
      onBack={goHome}
      right={actions}
      scroll
      refreshControl={
        <RefreshControl
          refreshing={saving.isRefetching || transactions.isRefetching}
          onRefresh={() => {
            void saving.refetch();
            void transactions.refetch();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <Card style={styles.hero}>
        <AppText color={colors.textMuted} weight="medium">
          יתרה נוכחית
        </AppText>
        <AmountText agorot={s.balance_agorot} size="xl" />
        <View style={styles.metaRow}>
          <View style={styles.iconBubble}>
            <MaterialCommunityIcons name={locationIcon(s.location_type)} size={18} color={colors.primary} />
          </View>
          <AppText color={colors.textMuted} style={styles.flex}>
            {locationLabel(s.location_type)} · {s.institution}
          </AppText>
        </View>
        {s.notes ? (
          <AppText size="sm" color={colors.textMuted}>
            {s.notes}
          </AppText>
        ) : null}
      </Card>

      <View style={styles.buttons}>
        <View style={styles.flex}>
          <Button title="הוסף כסף" icon="plus" onPress={() => setSheet('deposit')} />
        </View>
        <View style={styles.flex}>
          <Button
            title="משוך"
            icon="minus"
            variant="secondary"
            disabled={s.balance_agorot <= 0}
            onPress={() => setSheet('withdrawal')}
          />
        </View>
      </View>

      <View style={styles.historyHeader}>
        <AppText size="lg" weight="bold">
          היסטוריה
        </AppText>
        <AppText size="xs" color={colors.textMuted}>
          לחיצה ארוכה על פעולה מוחקת אותה
        </AppText>
      </View>

      {transactions.isPending ? (
        <LoadingState />
      ) : transactions.isError ? (
        <ErrorState message={toHebrewError(transactions.error)} onRetry={() => transactions.refetch()} />
      ) : (
        <Card style={styles.historyCard}>
          {(transactions.data ?? []).map((t, i) => (
            <TransactionRow key={t.id} tx={t} first={i === 0} onLongPress={() => setTxToDelete(t)} />
          ))}
        </Card>
      )}

      <TransactionSheet
        visible={sheet !== null}
        savingId={s.id}
        kind={sheet ?? 'deposit'}
        balanceAgorot={s.balance_agorot}
        onClose={() => setSheet(null)}
      />

      <ConfirmDialog
        visible={confirmDeleteSaving}
        title="למחוק את החיסכון?"
        message="כל ההיסטוריה שלו תימחק, ואי אפשר לשחזר אותה."
        confirmText="מחיקה"
        destructive
        loading={deleteSaving.isPending}
        error={deleteSaving.error ? toHebrewError(deleteSaving.error) : null}
        onCancel={() => {
          setConfirmDeleteSaving(false);
          deleteSaving.reset();
        }}
        onConfirm={() =>
          deleteSaving.mutate(s.id, {
            onSuccess: () => {
              setConfirmDeleteSaving(false);
              router.replace(HOME);
            },
          })
        }
      />

      <ConfirmDialog
        visible={txToDelete !== null}
        title="למחוק את הפעולה?"
        message={
          txToDelete
            ? `‎${formatSignedAgorot(txToDelete.amount_agorot, txToDelete.kind)}‎ · ${formatDateHe(txToDelete.occurred_on)}`
            : undefined
        }
        confirmText="מחיקה"
        destructive
        loading={deleteTx.isPending}
        error={deleteTx.error ? toHebrewError(deleteTx.error) : null}
        onCancel={() => {
          setTxToDelete(null);
          deleteTx.reset();
        }}
        onConfirm={() =>
          txToDelete &&
          deleteTx.mutate({ id: txToDelete.id, savingId: s.id }, { onSuccess: () => setTxToDelete(null) })
        }
      />
    </Screen>
  );
}

const KIND_LABEL: Record<Transaction['kind'], string> = {
  opening: 'יתרת פתיחה',
  deposit: 'הפקדה',
  withdrawal: 'משיכה',
};

function TransactionRow({ tx, first, onLongPress }: { tx: Transaction; first: boolean; onLongPress: () => void }) {
  const icon = tx.kind === 'deposit' ? 'arrow-down' : tx.kind === 'withdrawal' ? 'arrow-up' : 'flag-outline';
  const tint = tx.kind === 'deposit' ? colors.positive : tx.kind === 'withdrawal' ? colors.negative : colors.primary;
  return (
    <Pressable
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`${KIND_LABEL[tx.kind]} ${formatDateHe(tx.occurred_on)}`}
      accessibilityHint="לחיצה ארוכה למחיקה"
      style={({ pressed }) => [styles.txRow, !first && styles.txDivider, pressed && styles.txPressed]}
    >
      <View style={[styles.txIcon, { backgroundColor: `${tint}1A` }]}>
        <MaterialCommunityIcons name={icon} size={18} color={tint} />
      </View>
      <View style={styles.flex}>
        <AppText weight="medium">{tx.note || KIND_LABEL[tx.kind]}</AppText>
        <AppText size="xs" color={colors.textMuted}>
          {formatDateHe(tx.occurred_on)} · {tx.author_name ?? 'משתמש לשעבר'}
        </AppText>
      </View>
      <AmountText agorot={tx.amount_agorot} kind={tx.kind} size="md" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { gap: space(2), alignItems: 'stretch', paddingVertical: space(6) },
  metaRow: { flexDirection: row, alignItems: 'center', gap: space(2), marginTop: space(1) },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttons: { flexDirection: row, gap: space(3) },
  historyHeader: { flexDirection: row, alignItems: 'baseline', justifyContent: 'space-between', marginTop: space(2) },
  historyCard: { paddingVertical: space(1), paddingHorizontal: space(4) },
  txRow: { flexDirection: row, alignItems: 'center', gap: space(3), paddingVertical: space(3.5) },
  txDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  txPressed: { opacity: 0.6 },
  txIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
