import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LOCATION_TYPES, locationIcon, locationLabel } from '@/lib/locationTypes';
import type { LocationType, SavingInput, SavingWithBalance } from '@/lib/types';
import { validateSavingForm } from '@/lib/validation';
import { row } from '@/theme/rtl';
import { colors, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Button } from './Button';
import { Chip } from './Chip';
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit() {
    const result = validateSavingForm({
      purpose,
      locationType,
      institution,
      notes,
      ...(mode === 'create' ? { openingInput: opening } : {}),
    });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    onSubmit(result.value);
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

      {serverError ? <AppText color={colors.negative}>{serverError}</AppText> : null}

      <Button title={mode === 'create' ? 'שמירת החיסכון' : 'שמירת שינויים'} onPress={submit} loading={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space(5) },
  group: { gap: space(2) },
  chips: { flexDirection: row, flexWrap: 'wrap', gap: space(2) },
});
