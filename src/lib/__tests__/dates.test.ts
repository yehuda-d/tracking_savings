import { formatDateHe, isValidISODate, todayLocalISO } from '../dates';

describe('todayLocalISO', () => {
  it('uses local time, not UTC, just after midnight', () => {
    expect(todayLocalISO(new Date(2026, 10, 15, 0, 30))).toBe('2026-11-15');
  });
  it('pads month and day', () => {
    expect(todayLocalISO(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05');
  });
});

describe('isValidISODate', () => {
  it.each(['2026-11-14', '2024-02-29'])('accepts %p', (s) => {
    expect(isValidISODate(s)).toBe(true);
  });
  it.each(['2026-02-30', '2025-02-29', '14/11/2026', '2026-1-5', '', 'bad', '2026-13-01'])(
    'rejects %p',
    (s) => {
      expect(isValidISODate(s)).toBe(false);
    },
  );
});

describe('formatDateHe', () => {
  it('shows day and year', () => {
    const text = formatDateHe('2026-11-03');
    expect(text).toContain('3');
    expect(text).toContain('2026');
  });
  it('does not shift the day by timezone', () => {
    expect(formatDateHe('2026-11-01')).toMatch(/(^|\D)1(\D|$)/);
  });
});
