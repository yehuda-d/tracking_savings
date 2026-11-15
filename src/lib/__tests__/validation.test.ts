import { validateRevaluationForm, validateSavingForm, validateTransactionForm } from '../validation';

describe('validateSavingForm', () => {
  it('reports every missing or invalid field', () => {
    const r = validateSavingForm({ purpose: '', locationType: null, institution: '  ', openingInput: 'abc' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual(['institution', 'locationType', 'opening', 'purpose']);
    }
  });

  it('allows a zero opening balance', () => {
    const r = validateSavingForm({ purpose: 'דירה', locationType: 'study_fund', institution: 'מיטב', openingInput: '0' });
    expect(r).toEqual({
      ok: true,
      value: { purpose: 'דירה', location_type: 'study_fund', institution: 'מיטב', notes: null, goal_agorot: null, goal_date: null, openingAgorot: 0 },
    });
  });

  it('treats an empty opening as zero and trims text', () => {
    const r = validateSavingForm({
      purpose: '  חופשה ',
      locationType: 'bank_account',
      institution: ' לאומי ',
      openingInput: '',
      notes: '   ',
    });
    expect(r).toEqual({
      ok: true,
      value: { purpose: 'חופשה', location_type: 'bank_account', institution: 'לאומי', notes: null, goal_agorot: null, goal_date: null, openingAgorot: 0 },
    });
  });

  it('parses the opening amount', () => {
    const r = validateSavingForm({
      purpose: 'דירה',
      locationType: 'deposit',
      institution: 'הפועלים',
      openingInput: '1,000',
      notes: 'ריבית קבועה',
    });
    expect(r.ok && r.value).toEqual({
      purpose: 'דירה',
      location_type: 'deposit',
      institution: 'הפועלים',
      notes: 'ריבית קבועה',
      goal_agorot: null,
      goal_date: null,
      openingAgorot: 100000,
    });
  });

  it('omits opening when editing (no openingInput)', () => {
    const r = validateSavingForm({ purpose: 'דירה', locationType: 'other', institution: 'בית' });
    expect(r.ok && r.value).toEqual({
      purpose: 'דירה',
      location_type: 'other',
      institution: 'בית',
      notes: null,
      goal_agorot: null,
      goal_date: null,
    });
  });
});

describe('validateTransactionForm', () => {
  const base = { occurredOn: '2026-11-14', today: '2026-11-14', balanceAgorot: 50000 };

  it('blocks a withdrawal larger than the balance', () => {
    const r = validateTransactionForm({ ...base, kind: 'withdrawal', amountInput: '600' });
    expect(r).toEqual({ ok: false, errors: { amount: 'אין מספיק כסף בחיסכון' } });
  });

  it('allows withdrawing the exact balance', () => {
    const r = validateTransactionForm({ ...base, kind: 'withdrawal', amountInput: '500' });
    expect(r).toEqual({ ok: true, value: { amountAgorot: 50000, occurredOn: '2026-11-14' } });
  });

  it('allows a deposit regardless of balance', () => {
    const r = validateTransactionForm({ ...base, kind: 'deposit', amountInput: '600' });
    expect(r).toEqual({ ok: true, value: { amountAgorot: 60000, occurredOn: '2026-11-14' } });
  });

  it('rejects a future date', () => {
    const r = validateTransactionForm({ ...base, kind: 'deposit', amountInput: '10', occurredOn: '2026-11-15' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.occurredOn).toBeTruthy();
  });

  it('rejects an invalid date', () => {
    const r = validateTransactionForm({ ...base, kind: 'deposit', amountInput: '10', occurredOn: 'bad' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.occurredOn).toBeTruthy();
  });

  it('rejects a bad amount', () => {
    const r = validateTransactionForm({ ...base, kind: 'deposit', amountInput: '12,5' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.amount).toBeTruthy();
  });
});

describe('validateSavingForm goals', () => {
  const base = { purpose: 'דירה', locationType: 'study_fund' as const, institution: 'מיטב' };

  it('accepts a goal with a date', () => {
    const r = validateSavingForm({ ...base, goalInput: '400,000', goalDateInput: '2028-06-01' });
    expect(r.ok && r.value).toMatchObject({ goal_agorot: 40000000, goal_date: '2028-06-01' });
  });
  it('accepts a goal without a date', () => {
    const r = validateSavingForm({ ...base, goalInput: '5000', goalDateInput: '' });
    expect(r.ok && r.value).toMatchObject({ goal_agorot: 500000, goal_date: null });
  });
  it('rejects a date without a goal', () => {
    const r = validateSavingForm({ ...base, goalInput: '', goalDateInput: '2028-06-01' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.goalDate).toBeTruthy();
  });
  it('rejects an invalid goal amount', () => {
    const r = validateSavingForm({ ...base, goalInput: 'abc' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.goal).toBeTruthy();
  });
  it('rejects an invalid goal date', () => {
    const r = validateSavingForm({ ...base, goalInput: '100', goalDateInput: '2028-02-30' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.goalDate).toBeTruthy();
  });
});

describe('validateRevaluationForm', () => {
  const base = { occurredOn: '2026-11-15', today: '2026-11-15', balanceAgorot: 50000 };

  it('records a gain when the new value is higher', () => {
    expect(validateRevaluationForm({ ...base, valueInput: '512.40' })).toEqual({
      ok: true,
      value: { kind: 'gain', amountAgorot: 1240, occurredOn: '2026-11-15' },
    });
  });
  it('records a loss when the new value is lower', () => {
    expect(validateRevaluationForm({ ...base, valueInput: '470' })).toEqual({
      ok: true,
      value: { kind: 'loss', amountAgorot: 3000, occurredOn: '2026-11-15' },
    });
  });
  it('allows revaluing to zero', () => {
    expect(validateRevaluationForm({ ...base, valueInput: '0' })).toEqual({
      ok: true,
      value: { kind: 'loss', amountAgorot: 50000, occurredOn: '2026-11-15' },
    });
  });
  it('rejects the same value', () => {
    expect(validateRevaluationForm({ ...base, valueInput: '500' })).toEqual({
      ok: false,
      errors: { value: 'השווי זהה ליתרה הנוכחית' },
    });
  });
  it('rejects bad input and future dates', () => {
    const bad = validateRevaluationForm({ ...base, valueInput: '' });
    expect(bad.ok).toBe(false);
    const future = validateRevaluationForm({ ...base, valueInput: '600', occurredOn: '2026-11-16' });
    expect(future.ok).toBe(false);
    if (!future.ok) expect(future.errors.occurredOn).toBeTruthy();
  });
});
