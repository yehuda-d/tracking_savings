import { validateSavingForm, validateTransactionForm } from '../validation';

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
      value: { purpose: 'דירה', location_type: 'study_fund', institution: 'מיטב', notes: null, openingAgorot: 0 },
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
      value: { purpose: 'חופשה', location_type: 'bank_account', institution: 'לאומי', notes: null, openingAgorot: 0 },
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
      openingAgorot: 100000,
    });
  });

  it('omits opening when editing (no openingInput)', () => {
    const r = validateSavingForm({ purpose: 'דירה', locationType: 'other', institution: 'בית' });
    expect(r.ok && r.value).toEqual({ purpose: 'דירה', location_type: 'other', institution: 'בית', notes: null });
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
