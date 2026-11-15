import { StyleSheet, View } from 'react-native';

import { formatDateHe, todayLocalISO } from '@/lib/dates';
import { goalProgress } from '@/lib/goals';
import { formatAgorot } from '@/lib/money';
import { row } from '@/theme/rtl';
import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';

const ltr = (s: string) => `‎${s}‎`;

/** Thin progress bar that fills from the right (RTL). */
export function ProgressBar({ percent, reached }: { percent: number; reached?: boolean }) {
  return (
    <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }}>
      <View
        style={[styles.fill, { width: `${percent}%`, backgroundColor: reached ? colors.positive : colors.primary }]}
      />
    </View>
  );
}

/** Compact line for the home card: bar + "47% מהיעד". */
export function GoalLine({ balanceAgorot, goalAgorot }: { balanceAgorot: number; goalAgorot: number }) {
  const p = goalProgress(balanceAgorot, goalAgorot, null, todayLocalISO());
  return (
    <View style={styles.line}>
      <ProgressBar percent={p.percent} reached={p.reached} />
      <AppText size="xs" color={p.reached ? colors.positive : colors.textMuted}>
        {p.reached ? '🎉 הגעתם ליעד!' : `${p.percent}% מהיעד של ${ltr(formatAgorot(goalAgorot))}`}
      </AppText>
    </View>
  );
}

/** Full goal summary for the saving screen. */
export function GoalDetails({
  balanceAgorot,
  goalAgorot,
  goalDate,
}: {
  balanceAgorot: number;
  goalAgorot: number;
  goalDate: string | null;
}) {
  const p = goalProgress(balanceAgorot, goalAgorot, goalDate, todayLocalISO());
  return (
    <View style={styles.details}>
      <View style={styles.headerRow}>
        <AppText weight="bold">יעד: {ltr(formatAgorot(goalAgorot))}</AppText>
        <AppText weight="bold" color={p.reached ? colors.positive : colors.primary}>
          {p.percent}%
        </AppText>
      </View>
      <ProgressBar percent={p.percent} reached={p.reached} />
      {p.reached ? (
        <AppText color={colors.positive} weight="medium">
          🎉 הגעתם ליעד!
        </AppText>
      ) : (
        <AppText color={colors.textMuted}>נשארו {ltr(formatAgorot(p.remainingAgorot))}</AppText>
      )}
      {goalDate ? (
        <AppText size="sm" color={p.overdue ? colors.negative : colors.textMuted}>
          {p.overdue
            ? `תאריך היעד (${formatDateHe(goalDate)}) עבר`
            : p.monthlyAgorot
              ? `כדי להגיע עד ${formatDateHe(goalDate)}: ${ltr(formatAgorot(p.monthlyAgorot))} לחודש`
              : `תאריך יעד: ${formatDateHe(goalDate)}`}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
    flexDirection: row,
  },
  fill: { height: '100%', borderRadius: radius.pill },
  line: { gap: space(1.5), marginTop: space(3) },
  details: { gap: space(2) },
  headerRow: { flexDirection: row, justifyContent: 'space-between', alignItems: 'center' },
});
