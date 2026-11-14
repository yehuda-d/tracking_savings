import { formatAgorot, formatSignedAgorot, MAX_AGOROT, parseAmountInput } from '../money';

describe('parseAmountInput', () => {
  it.each([
    ['250', 25000],
    ['1,000', 100000],
    ['1,000.5', 100050],
    [' 250 ', 25000],
    ['₪300', 30000],
    ['300 ₪', 30000],
    ['0.01', 1],
    ['12.34', 1234],
    ['1,234,567.89', 123456789],
    ['999999999.99', 99999999999],
  ])('parses %p to %p agorot', (input, agorot) => {
    expect(parseAmountInput(input)).toEqual({ ok: true, agorot });
  });

  it.each(['', '   ', 'abc', '12,5', '1.234', '-5', '0', '0.00', '1000000000', '1,00', '1..2', '.5.'])(
    'rejects %p with a Hebrew error',
    (input) => {
      const r = parseAmountInput(input);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/[֐-׿]/);
    },
  );

  it('exposes the max', () => {
    expect(MAX_AGOROT).toBe(99_999_999_999);
  });
});

describe('formatAgorot', () => {
  it.each([
    [18425000, '184,250 ₪'],
    [1234550, '12,345.50 ₪'],
    [5, '0.05 ₪'],
    [0, '0 ₪'],
    [100, '1 ₪'],
    [99999999999, '999,999,999.99 ₪'],
  ])('formats %p as %p', (agorot, text) => {
    expect(formatAgorot(agorot)).toBe(text);
  });
});

describe('formatSignedAgorot', () => {
  it('prefixes deposits with +', () => {
    expect(formatSignedAgorot(50000, 'deposit')).toBe('+500 ₪');
  });
  it('prefixes withdrawals with a real minus sign', () => {
    expect(formatSignedAgorot(50000, 'withdrawal')).toBe('−500 ₪');
  });
  it('leaves opening unsigned', () => {
    expect(formatSignedAgorot(50000, 'opening')).toBe('500 ₪');
  });
});
