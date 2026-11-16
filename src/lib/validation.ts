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
  /** Optional goal amount; empty or missing means no goal. */
  goalInput?: string;
  /** Optional goal date YYYY-MM-DD; only allowed with a goal. */
  goalDateInput?: string;
}

/** "", "0", "0.00" (with or without ₪) mean zero; otherwise the normal amount rules apply. */
function parseZeroOrAmount(input: string): { ok: true; agorot: number } | { ok: false; error: string } {
  const raw = input.replace(/₪/g, '').trim();
  if (raw === '' || /^0+(\.0{1,2})?$/.test(raw)) return { ok: true, agorot: 0 };
  return parseAmountInput(raw);
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
    const parsed = parseZeroOrAmount(v.openingInput);
    if (parsed.ok) openingAgorot = parsed.agorot;
    else errors.opening = parsed.error;
  }

  let goalAgorot: number | null = null;
  const goalRaw = v.goalInput?.trim() ?? '';
  if (goalRaw !== '') {
    const parsed = parseAmountInput(goalRaw);
    if (parsed.ok) goalAgorot = parsed.agorot;
    else errors.goal = parsed.error;
  }
  const goalDateRaw = v.goalDateInput?.trim() ?? '';
  let goalDate: string | null = null;
  if (goalDateRaw !== '') {
    if (goalRaw === '') errors.goalDate = 'אפשר לבחור תאריך רק אם יש סכום יעד';
    else if (!isValidISODate(goalDateRaw)) errors.goalDate = 'תאריך לא תקין';
    else goalDate = goalDateRaw;
  }

  if (Object.keys(errors).length > 0 || !v.locationType) return { ok: false, errors };

  const value: SavingInput & { openingAgorot?: number } = {
    purpose,
    location_type: v.locationType,
    institution,
    notes,
    goal_agorot: goalAgorot,
    goal_date: goalDate,
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

export interface RevaluationFormValues {
  /** What the saving is worth today, in shekels. May be zero. */
  valueInput: string;
  occurredOn: string;
  balanceAgorot: number;
  today: string;
}

/** Turns "it's worth X today" into a gain or loss transaction for the difference. */
export function validateRevaluationForm(
  v: RevaluationFormValues,
): ValidationResult<{ kind: 'gain' | 'loss'; amountAgorot: number; occurredOn: string }> {
  const errors: Record<string, string> = {};
  const parsed =
    v.valueInput.trim() === '' ? { ok: false as const, error: 'נא להזין סכום' } : parseZeroOrAmount(v.valueInput);
  if (!parsed.ok) errors.value = parsed.error;
  else if (parsed.agorot === v.balanceAgorot) errors.value = 'השווי זהה ליתרה הנוכחית';

  if (!isValidISODate(v.occurredOn)) errors.occurredOn = 'תאריך לא תקין';
  else if (v.occurredOn > v.today) errors.occurredOn = 'אי אפשר לבחור תאריך עתידי';

  if (Object.keys(errors).length > 0 || !parsed.ok) return { ok: false, errors };
  const diff = parsed.agorot - v.balanceAgorot;
  return {
    ok: true,
    value: { kind: diff > 0 ? 'gain' : 'loss', amountAgorot: Math.abs(diff), occurredOn: v.occurredOn },
  };
}

export interface PasswordResetValues {
  code: string;
  password: string;
  confirm: string;
}

/** The emailed recovery code (6–8 digits; spaces ignored) plus a new password typed twice. */
export function validatePasswordReset(v: PasswordResetValues): ValidationResult<{ code: string; password: string }> {
  const errors: Record<string, string> = {};
  const code = v.code.replace(/\s+/g, '');
  if (!/^\d{6,8}$/.test(code)) errors.code = 'נא להזין את הקוד מהמייל (6 ספרות)';
  if (v.password.length < 6) errors.password = 'הסיסמה צריכה להיות לפחות 6 תווים';
  else if (v.password !== v.confirm) errors.confirm = 'הסיסמאות לא תואמות';
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { code, password: v.password } };
}
