import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { useAddTransaction } from '@/data/transactions';
import { formatDateHe, todayLocalISO } from '@/lib/dates';
import { toHebrewError } from '@/lib/errors';
import { balanceAsOf, formatAgorot, formatSignedAgorot } from '@/lib/money';
import type { Transaction } from '@/lib/types';
import { validateRevaluationForm, validateTransactionForm } from '@/lib/validation';
import { row } from '@/theme/rtl';
import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { DateField } from './DateField';
import { Button } from './Button';
import { TextField } from './TextField';

export interface TransactionSheetProps {
  visible: boolean;
  savingId: string;
  /** 'revalue' asks for today's value and records the difference as a gain or loss. */
  kind: 'deposit' | 'withdrawal' | 'revalue';
  balanceAgorot: number;
  /** History of this saving; lets a backdated revaluation compare against that day's balance. */
  transactions?: readonly Pick<Transaction, 'kind' | 'amount_agorot' | 'occurred_on'>[];
  /** Initial date (YYYY-MM-DD); defaults to today. */
  initialDate?: string;
  onClose: () => void;
}

const COPY = {
  deposit: { title: 'הוספת כסף', amountLabel: 'סכום (₪)', submit: 'הוסף', icon: 'arrow-down-bold', tint: 'positive' },
  withdrawal: { title: 'משיכה', amountLabel: 'סכום (₪)', submit: 'משוך', icon: 'arrow-up-bold', tint: 'negative' },
  revalue: {
    title: 'עדכון שווי',
    amountLabel: 'כמה שווה היום? (₪)',
    submit: 'עדכון',
    icon: 'chart-line',
    tint: 'primary',
  },
} as const;

export function TransactionSheet({ visible, onClose, ...rest }: TransactionSheetProps) {
  const add = useAddTransaction();
  const { reset } = add;
  // Closing (and Android back) is blocked while a request is in flight, so a hanging
  // deposit can't be followed by a second one. Mutation state is cleared on close.
  const done = () => {
    reset();
    onClose();
  };
  const close = () => {
    if (add.isPending) return;
    done();
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      {/* Form mounted only while open, so every opening starts clean. */}
      {visible ? <SheetForm {...rest} add={add} onClose={close} onDone={done} /> : null}
    </Modal>
  );
}

type SheetFormProps = Omit<TransactionSheetProps, 'visible'> & {
  add: ReturnType<typeof useAddTransaction>;
  /** Closes after a successful save (no pending guard: the closure still sees isPending). */
  onDone: () => void;
};

function SheetForm({ savingId, kind, balanceAgorot, transactions, initialDate, onClose, onDone, add }: SheetFormProps) {
  const [amount, setAmount] = useState('');
  const [occurredOn, setOccurredOn] = useState(initialDate ?? todayLocalISO());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const copy = COPY[kind];
  const today = todayLocalISO();

  // A revaluation compares to the balance on its own date (a backdated report must not be
  // measured against deposits made after it). Without history, fall back to the current balance.
  const isBackdated = kind === 'revalue' && occurredOn !== today && !!transactions;
  const baseAgorot = isBackdated ? balanceAsOf(transactions!, occurredOn) : balanceAgorot;

  // Live preview for revaluation: what difference will be recorded (or why it can't be).
  const preview =
    kind === 'revalue' && amount.trim() !== ''
      ? validateRevaluationForm({ valueInput: amount, occurredOn: today, balanceAgorot: baseAgorot, today })
      : null;

  function submit() {
    if (add.isPending) return;
    let tx: { kind: 'deposit' | 'withdrawal' | 'gain' | 'loss'; amountAgorot: number; occurredOn: string };
    if (kind === 'revalue') {
      const r = validateRevaluationForm({ valueInput: amount, occurredOn, balanceAgorot: baseAgorot, today });
      if (!r.ok) {
        const { value, ...rest } = r.errors;
        setErrors(value ? { ...rest, amount: value } : rest);
        return;
      }
      tx = r.value;
    } else {
      const r = validateTransactionForm({ kind, amountInput: amount, occurredOn, balanceAgorot, today });
      if (!r.ok) {
        setErrors(r.errors);
        return;
      }
      tx = { kind, ...r.value };
    }
    setErrors({});
    add.mutate({ savingId, ...tx, note: note.trim() || null }, { onSuccess: onDone });
  }

  const tint = colors[copy.tint];
  const tintSoft = copy.tint === 'negative' ? colors.negativeSoft : colors.primarySoft;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="סגירה" />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.titleRow}>
          <View style={[styles.badge, { backgroundColor: tintSoft }]}>
            <MaterialCommunityIcons name={copy.icon} size={22} color={tint} />
          </View>
          <View style={styles.flex}>
            <AppText size="lg" weight="bold">
              {copy.title}
            </AppText>
            <AppText size="sm" color={colors.textMuted}>
              {isBackdated
                ? `יתרה ב-${formatDateHe(occurredOn)}: ‎${formatAgorot(baseAgorot)}‎`
                : `יתרה נוכחית: ‎${formatAgorot(balanceAgorot)}‎`}
            </AppText>
          </View>
        </View>
        <TextField
          label={copy.amountLabel}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0"
          autoFocus
          large
          error={errors.amount}
          onSubmitEditing={submit}
        />
        {preview?.ok ? (
          <AppText weight="bold" color={preview.value.kind === 'gain' ? colors.positive : colors.negative}>
            {`${preview.value.kind === 'gain' ? 'רווח של' : 'הפסד של'} ‎${formatSignedAgorot(preview.value.amountAgorot, preview.value.kind)}‎`}
          </AppText>
        ) : preview && !preview.ok && preview.errors.value && !errors.amount ? (
          <AppText color={colors.textMuted}>{preview.errors.value}</AppText>
        ) : null}
        <DateField
          label="תאריך"
          value={occurredOn}
          onChange={setOccurredOn}
          maximumDate={new Date()}
          error={errors.occurredOn}
        />
        <TextField
          label="הערה (לא חובה)"
          value={note}
          onChangeText={setNote}
          maxLength={200}
          placeholder={kind === 'revalue' ? 'למשל: לפי דוח רבעוני' : 'למשל: משכורת נובמבר'}
        />
        {add.error ? <AppText color={colors.negative}>{toHebrewError(add.error)}</AppText> : null}
        <Button
          title={copy.submit}
          variant={kind === 'withdrawal' ? 'danger' : 'primary'}
          onPress={submit}
          loading={add.isPending}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space(5),
    paddingBottom: space(8),
    gap: space(4),
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border },
  titleRow: { flexDirection: row, alignItems: 'center', gap: space(3) },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
