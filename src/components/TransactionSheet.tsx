import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { useAddTransaction } from '@/data/transactions';
import { formatDateHe, todayLocalISO } from '@/lib/dates';
import { toHebrewError } from '@/lib/errors';
import { formatAgorot } from '@/lib/money';
import { validateTransactionForm } from '@/lib/validation';
import { row } from '@/theme/rtl';
import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Button } from './Button';
import { TextField } from './TextField';

export interface TransactionSheetProps {
  visible: boolean;
  savingId: string;
  kind: 'deposit' | 'withdrawal';
  balanceAgorot: number;
  onClose: () => void;
}

const isoToDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export function TransactionSheet({ visible, ...rest }: TransactionSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={rest.onClose}>
      {/* Mounted only while open, so every opening starts with a clean form and mutation state. */}
      {visible ? <SheetForm {...rest} /> : null}
    </Modal>
  );
}

function SheetForm({ savingId, kind, balanceAgorot, onClose }: Omit<TransactionSheetProps, 'visible'>) {
  const add = useAddTransaction();
  const [amount, setAmount] = useState('');
  const [occurredOn, setOccurredOn] = useState(todayLocalISO());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pickerOpen, setPickerOpen] = useState(false);

  const isDeposit = kind === 'deposit';

  function submit() {
    if (add.isPending) return;
    const today = todayLocalISO();
    const result = validateTransactionForm({ kind, amountInput: amount, occurredOn, balanceAgorot, today });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    add.mutate(
      {
        savingId,
        kind,
        amountAgorot: result.value.amountAgorot,
        occurredOn: result.value.occurredOn,
        note: note.trim() || null,
      },
      { onSuccess: onClose },
    );
  }

  const dateField =
    Platform.OS === 'web' ? (
      <TextField
        label="תאריך"
        value={occurredOn}
        onChangeText={setOccurredOn}
        placeholder="YYYY-MM-DD"
        error={errors.occurredOn}
      />
    ) : (
      <View style={styles.group}>
        <AppText size="sm" weight="medium" color={colors.textMuted}>
          תאריך
        </AppText>
        <Pressable
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`תאריך: ${formatDateHe(occurredOn)}`}
          style={styles.dateButton}
        >
          <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.primary} />
          <AppText>
            {occurredOn === todayLocalISO() ? `היום, ${formatDateHe(occurredOn)}` : formatDateHe(occurredOn)}
          </AppText>
        </Pressable>
        {errors.occurredOn ? (
          <AppText size="sm" color={colors.negative}>
            {errors.occurredOn}
          </AppText>
        ) : null}
        {pickerOpen ? (
          <DateTimePicker
            value={isoToDate(occurredOn)}
            mode="date"
            maximumDate={new Date()}
            onChange={(event, date) => {
              setPickerOpen(false);
              if (event.type === 'set' && date) setOccurredOn(todayLocalISO(date));
            }}
          />
        ) : null}
      </View>
    );

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable style={styles.backdrop} onPress={add.isPending ? undefined : onClose} accessibilityLabel="סגירה" />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.titleRow}>
          <View style={[styles.badge, { backgroundColor: isDeposit ? colors.primarySoft : colors.negativeSoft }]}>
            <MaterialCommunityIcons
              name={isDeposit ? 'arrow-down-bold' : 'arrow-up-bold'}
              size={22}
              color={isDeposit ? colors.positive : colors.negative}
            />
          </View>
          <View style={styles.flex}>
            <AppText size="lg" weight="bold">
              {isDeposit ? 'הוספת כסף' : 'משיכה'}
            </AppText>
            <AppText size="sm" color={colors.textMuted}>
              {`יתרה נוכחית: ‎${formatAgorot(balanceAgorot)}‎`}
            </AppText>
          </View>
        </View>
        <TextField
          label="סכום (₪)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0"
          autoFocus
          large
          error={errors.amount}
          onSubmitEditing={submit}
        />
        {dateField}
        <TextField
          label="הערה (לא חובה)"
          value={note}
          onChangeText={setNote}
          maxLength={200}
          placeholder="למשל: משכורת נובמבר"
        />
        {add.error ? <AppText color={colors.negative}>{toHebrewError(add.error)}</AppText> : null}
        <Button
          title={isDeposit ? 'הוסף' : 'משוך'}
          variant={isDeposit ? 'primary' : 'danger'}
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
  group: { gap: space(1.5) },
  dateButton: {
    flexDirection: row,
    alignItems: 'center',
    gap: space(2),
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: space(4),
  },
});
