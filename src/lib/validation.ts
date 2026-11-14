import { isValidISODate } from './dates';
import { parseAmountInput } from './money';
import type { LocationType, SavingInput } from './types';

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

export interface SavingFormValues {
  purpose: string;
  locationType: LocationType | null;
  institution: string;
  notes?: string;
  /** Present only when creating a saving. Empty string means zero. */
  openingInput?: string;
}

export function validateSavingForm(v: SavingFormValues): ValidationResult<SavingInput & { openingAgorot?: number }> {
  const errors: Record<string, string> = {};
  const purpose = v.purpose.trim();
  const institution = v.institution.trim();
  const notes = v.notes?.trim() ? v.notes.trim() : null;

  if (!purpose) errors.purpose = 'נא לכתוב למה החיסכון';
  if (!v.locationType) errors.locationType = 'נא לבחור סוג';
  if (!institution) errors.institution = 'נא לכתוב איפה הכסף נמצא';

  let openingAgorot: number | undefined;
  if (v.openingInput !== undefined) {
    const raw = v.openingInput.replace(/₪/g, '').trim();
    if (raw === '' || /^0+(\.0{1,2})?$/.test(raw)) {
      openingAgorot = 0;
    } else {
      const parsed = parseAmountInput(raw);
      if (parsed.ok) openingAgorot = parsed.agorot;
      else errors.opening = parsed.error;
    }
  }

  if (Object.keys(errors).length > 0 || !v.locationType) return { ok: false, errors };

  const value: SavingInput & { openingAgorot?: number } = {
    purpose,
    location_type: v.locationType,
    institution,
    notes,
  };
  if (openingAgorot !== undefined) value.openingAgorot = openingAgorot;
  return { ok: true, value };
}

export interface TransactionFormValues {
  kind: 'deposit' | 'withdrawal';
  amountInput: string;
  occurredOn: string;
  balanceAgorot: number;
  /** Local today, YYYY-MM-DD. */
  today: string;
}

export function validateTransactionForm(
  v: TransactionFormValues,
): ValidationResult<{ amountAgorot: number; occurredOn: string }> {
  const errors: Record<string, string> = {};
  const parsed = parseAmountInput(v.amountInput);
  if (!parsed.ok) errors.amount = parsed.error;
  else if (v.kind === 'withdrawal' && parsed.agorot > v.balanceAgorot) errors.amount = 'אין מספיק כסף בחיסכון';

  if (!isValidISODate(v.occurredOn)) errors.occurredOn = 'תאריך לא תקין';
  else if (v.occurredOn > v.today) errors.occurredOn = 'אי אפשר לבחור תאריך עתידי';

  if (Object.keys(errors).length > 0 || !parsed.ok) return { ok: false, errors };
  return { ok: true, value: { amountAgorot: parsed.agorot, occurredOn: v.occurredOn } };
}
