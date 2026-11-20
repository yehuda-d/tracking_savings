import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LOCATION_TYPES, locationIcon, locationLabel } from '@/lib/locationTypes';
import { fundFieldsToSave } from '@/lib/fundYield';
import { agorotToInput } from '@/lib/money';
import type { LocationType, SavingInput, SavingWithBalance } from '@/lib/types';
import { validateSavingForm } from '@/lib/validation';
import { row } from '@/theme/rtl';
import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Button } from './Button';
import { Chip } from './Chip';
import { DateField } from './DateField';
import { FundPicker, type PickedFund } from './FundPicker';
import { TextField } from './TextField';

export type SavingFormValue = SavingInput & { openingAgorot?: number };

export interface SavingFormProps {
  mode: 'create' | 'edit';
  initial?: SavingWithBalance;
  submitting: boolean;
  serverError?: string | null;
  onSubmit: (value: SavingFormValue) => void;
}

export function SavingForm({ mode, initial, submitting, serverError, onSubmit }: SavingFormProps) {
  const [purpose, setPurpose] = useState(initial?.purpose ?? '');
  const [locationType, setLocationType] = useState<LocationType | null>(initial?.location_type ?? null);
  const [institution, setInstitution] = useState(initial?.institution ?? '');
  const [opening, setOpening] = useState('');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [hasGoal, setHasGoal] = useState(initial?.goal_agorot != null);
  const [goal, setGoal] = useState(initial?.goal_agorot != null ? agorotToInput(initial.goal_agorot) : '');
  const [goalDate, setGoalDate] = useState(initial?.goal_date ?? '');
  const [fund, setFund] = useState<{ id: number; name: string; syncedThrough: number | null } | null>(
    initial?.fund_id
      ? { id: initial.fund_id, name: initial.fund_name ?? '', syncedThrough: initial.fund_synced_through ?? null }
      : null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const canLinkFund = locationType === 'provident_fund' || locationType === 'study_fund';
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit() {
    const result = validateSavingForm({
      purpose,
      locationType,
      institution,
      notes,
      goalInput: hasGoal ? goal : '',
      goalDateInput: hasGoal ? goalDate : '',
      ...(mode === 'create' ? { openingInput: opening } : {}),
    });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    // Official returns exist only for provident/study funds; other types are unlinked.
    onSubmit({ ...result.value, ...fundFieldsToSave(initial?.fund_id ?? null, fund, canLinkFund) });
  }

  return (
    <View style={styles.form}>
      <TextField
        label="למה החיסכון?"
        value={purpose}
        onChangeText={setPurpose}
        placeholder="למשל: דירה, חופשה, קרן חירום"
        maxLength={80}
        error={errors.purpose}
      />

      <View style={styles.group}>
        <AppText size="sm" weight="medium" color={colors.textMuted}>
          איפה הכסף שמור?
        </AppText>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {LOCATION_TYPES.map((t) => (
            <Chip
              key={t}
              label={locationLabel(t)}
              icon={locationIcon(t)}
              selected={locationType === t}
              onPress={() => setLocationType(t)}
            />
          ))}
        </View>
        {errors.locationType ? (
          <AppText size="sm" color={colors.negative}>
            {errors.locationType}
          </AppText>
        ) : null}
      </View>

      <TextField
        label="שם הבנק / הקרן"
        value={institution}
        onChangeText={setInstitution}
        placeholder="למשל: לאומי, מגדל קרן כספית שקלית"
        maxLength={80}
        error={errors.institution}
      />

      {mode === 'create' ? (
        <TextField
          label="כמה יש בו כרגע? (₪)"
          value={opening}
          onChangeText={setOpening}
          keyboardType="decimal-pad"
          placeholder="0"
          large
          error={errors.opening}
        />
      ) : null}

      <TextField
        label="הערה (לא חובה)"
        value={notes}
        onChangeText={setNotes}
        maxLength={500}
        multiline
        placeholder="למשל: ריבית קבועה עד 2027"
      />

      {canLinkFund ? (
        <View style={styles.goalBox}>
          <AppText weight="bold">קישור לקרן (לא חובה)</AppText>
          {fund ? (
            <>
              <AppText>{fund.name}</AppText>
              <AppText size="xs" color={colors.textMuted}>
                {`מס׳ קופה ${fund.id} · האפליקציה תציע לעדכן את השווי כשתתפרסם תשואה חודשית חדשה`}
              </AppText>
              <View style={styles.goalHeader}>
                <Button title="החלפת קרן" variant="ghost" compact onPress={() => setPickerOpen(true)} />
                <Button title="הסרת קישור" variant="ghost" compact onPress={() => setFund(null)} />
              </View>
            </>
          ) : (
            <>
              <AppText size="sm" color={colors.textMuted}>
                מקשרים את החיסכון לקרן, והאפליקציה תציע לעדכן את השווי לפי התשואה הרשמית שמתפרסמת כל חודש.
              </AppText>
              <Button title="קישור לקרן" icon="link-variant" variant="secondary" onPress={() => setPickerOpen(true)} />
            </>
          )}
        </View>
      ) : null}
      <FundPicker
        visible={pickerOpen}
        initialQuery={fund ? '' : institution}
        onClose={() => setPickerOpen(false)}
        onPick={(p: PickedFund) => {
          // The value entered now is assumed to include every month published so far.
          setFund({ id: p.fundId, name: p.name, syncedThrough: p.period });
          setPickerOpen(false);
        }}
      />

      {hasGoal ? (
        <View style={styles.goalBox}>
          <View style={styles.goalHeader}>
            <AppText weight="bold">יעד</AppText>
            <Button
              title="הסרת יעד"
              variant="ghost"
              compact
              onPress={() => {
                setHasGoal(false);
                setGoal('');
                setGoalDate('');
              }}
            />
          </View>
          <TextField
            label="סכום היעד (₪)"
            value={goal}
            onChangeText={setGoal}
            keyboardType="decimal-pad"
            placeholder="למשל: 400,000"
            error={errors.goal}
          />
          <DateField
            label="עד מתי? (לא חובה)"
            value={goalDate}
            onChange={setGoalDate}
            minimumDate={new Date()}
            placeholder="בלי תאריך"
            error={errors.goalDate}
          />
          {goalDate ? <Button title="בלי תאריך" variant="ghost" compact onPress={() => setGoalDate('')} /> : null}
        </View>
      ) : (
        <Button
          title="הוספת יעד (לא חובה)"
          icon="flag-checkered"
          variant="secondary"
          onPress={() => setHasGoal(true)}
        />
      )}

      {serverError ? <AppText color={colors.negative}>{serverError}</AppText> : null}

      <Button title={mode === 'create' ? 'שמירת החיסכון' : 'שמירת שינויים'} onPress={submit} loading={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space(5) },
  group: { gap: space(2) },
  chips: { flexDirection: row, flexWrap: 'wrap', gap: space(2) },
  goalBox: {
    gap: space(3),
    padding: space(4),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  goalHeader: { flexDirection: row, justifyContent: 'space-between', alignItems: 'center' },
});
