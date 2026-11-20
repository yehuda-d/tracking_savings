import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';

import { useFundYields } from '@/data/gemelnet';
import { useApplyFundYield } from '@/data/savings';
import { toHebrewError } from '@/lib/errors';
import { formatPeriodHe, formatPeriodsHe, yieldSuggestion } from '@/lib/fundYield';
import { formatAgorot, formatSignedAgorot } from '@/lib/money';
import type { SavingWithBalance } from '@/lib/types';
import { row } from '@/theme/rtl';
import { colors, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';

const ltr = (s: string) => `‎${s}‎`;
const pct = (p: number) => {
  const text = Math.abs(p).toFixed(2);
  const sign = text === '0.00' ? '' : p > 0 ? '+' : '−';
  return `${sign}${text}%`;
};

/** For a saving linked to a Gemel-Net fund: offers to apply newly published official returns. */
export function FundYieldCard({ saving }: { saving: SavingWithBalance }) {
  // Official returns exist only for provident/study funds.
  const supportsFund = saving.location_type === 'provident_fund' || saving.location_type === 'study_fund';
  const fundId = supportsFund ? (saving.fund_id ?? null) : null;
  const yields = useFundYields(fundId);
  const apply = useApplyFundYield();

  if (fundId === null || yields.isPending) return null;

  if (yields.isError && !yields.data) {
    return (
      <View style={styles.muted}>
        <AppText size="xs" color={colors.textMuted}>
          לא הצלחנו לבדוק תשואה עדכנית לקרן.
        </AppText>
        <Button title="נסה שוב" variant="ghost" compact onPress={() => void yields.refetch()} />
      </View>
    );
  }

  const s = yieldSuggestion(saving.balance_agorot, yields.data ?? [], saving.fund_synced_through ?? null);

  if (!s) {
    return (
      <View style={styles.muted}>
        <MaterialCommunityIcons name="link-variant" size={16} color={colors.textMuted} />
        <AppText size="xs" color={colors.textMuted} style={styles.flex}>
          {`מקושר לקרן · תשואה רשמית עודכנה עד ${saving.fund_synced_through ? formatPeriodHe(saving.fund_synced_through) : '—'}`}
        </AppText>
      </View>
    );
  }

  const periodsText = formatPeriodsHe(s.periods);
  const note = `תשואה רשמית ${periodsText}`;
  const tint = s.kind === 'loss' ? colors.negative : colors.positive;

  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <MaterialCommunityIcons name="chart-timeline-variant" size={22} color={colors.primary} />
        <AppText weight="bold" style={styles.flex}>
          תשואה רשמית חדשה
        </AppText>
      </View>
      <AppText>
        {`תשואת הקרן ב${periodsText}: `}
        <AppText weight="bold" color={tint}>
          {ltr(pct(s.totalPct))}
        </AppText>
      </AppText>
      {s.kind ? (
        <AppText color={colors.textMuted}>
          {`שווי מעודכן: ${ltr(formatAgorot(s.newValueAgorot))}`}
          {` · ${ltr(formatSignedAgorot(Math.abs(s.deltaAgorot), s.kind))}`}
        </AppText>
      ) : (
        <AppText color={colors.textMuted}>השווי לא משתנה בעקבות זה.</AppText>
      )}
      <AppText size="xs" color={colors.textMuted}>
        זו תשואת הקרן לפני דמי הניהול האישיים שלכם, אז ייתכן הבדל קטן מהדוח.
      </AppText>
      {apply.error ? <AppText color={colors.negative}>{toHebrewError(apply.error)}</AppText> : null}
      <View style={styles.buttons}>
        {s.kind ? (
          <View style={styles.flex}>
            <Button
              title="עדכון שווי"
              loading={apply.isPending}
              onPress={() =>
                apply.mutate({
                  savingId: saving.id,
                  through: s.throughPeriod,
                  kind: s.kind,
                  amountAgorot: Math.abs(s.deltaAgorot),
                  note,
                })
              }
            />
          </View>
        ) : null}
        <View style={styles.flex}>
          <Button
            title={s.kind ? 'כבר עדכנתי' : 'סימון כמעודכן'}
            variant="ghost"
            disabled={apply.isPending}
            onPress={() =>
              apply.mutate({ savingId: saving.id, through: s.throughPeriod, kind: null, amountAgorot: 0, note: null })
            }
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: space(2), borderWidth: 1.5, borderColor: colors.primarySoft },
  titleRow: { flexDirection: row, alignItems: 'center', gap: space(2) },
  buttons: { flexDirection: row, gap: space(2), marginTop: space(1) },
  muted: { flexDirection: row, alignItems: 'center', gap: space(1.5), paddingHorizontal: space(1) },
});
