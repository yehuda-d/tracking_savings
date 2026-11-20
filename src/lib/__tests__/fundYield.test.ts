import { formatPeriodHe, formatPeriodsHe, yieldSuggestion } from '../fundYield';

describe('formatPeriodHe', () => {
  it('names the month in Hebrew', () => {
    expect(formatPeriodHe(202609)).toBe('ספטמבר 2026');
    expect(formatPeriodHe(202601)).toBe('ינואר 2026');
    expect(formatPeriodHe(202512)).toBe('דצמבר 2025');
  });
  it('describes a range of months', () => {
    expect(formatPeriodsHe([202609])).toBe('ספטמבר 2026');
    expect(formatPeriodsHe([202608, 202609])).toBe('אוגוסט–ספטמבר 2026');
    expect(formatPeriodsHe([202512, 202601])).toBe('דצמבר 2025–ינואר 2026');
  });
});

describe('yieldSuggestion', () => {
  it('returns null when nothing new was published', () => {
    expect(yieldSuggestion(1000000, [{ period: 202609, yieldPct: 1 }], 202609)).toBeNull();
    expect(yieldSuggestion(1000000, [], 202608)).toBeNull();
  });

  it('applies one month', () => {
    expect(yieldSuggestion(1910000, [{ period: 202609, yieldPct: 0.8 }], 202608)).toEqual({
      periods: [202609],
      throughPeriod: 202609,
      totalPct: 0.8,
      newValueAgorot: 1925280,
      deltaAgorot: 15280,
      kind: 'gain',
    });
  });

  it('compounds several months in order, ignoring already-applied ones', () => {
    const s = yieldSuggestion(
      1000000,
      [
        { period: 202609, yieldPct: -1 },
        { period: 202607, yieldPct: 5 },
        { period: 202608, yieldPct: 2 },
      ],
      202607,
    );
    // 1.02 * 0.99 = 1.0098
    expect(s).toMatchObject({ periods: [202608, 202609], throughPeriod: 202609, newValueAgorot: 1009800, deltaAgorot: 9800, kind: 'gain' });
    expect(s!.totalPct).toBeCloseTo(0.98, 10);
  });

  it('reports a loss', () => {
    expect(yieldSuggestion(1000000, [{ period: 202609, yieldPct: -2.5 }], 202608)).toMatchObject({
      newValueAgorot: 975000,
      deltaAgorot: -25000,
      kind: 'loss',
    });
  });

  it('marks a zero change as no kind (advance only)', () => {
    expect(yieldSuggestion(1000000, [{ period: 202609, yieldPct: 0 }], 202608)).toMatchObject({
      deltaAgorot: 0,
      kind: null,
    });
  });

  it('treats a null synced period as "apply everything"', () => {
    expect(yieldSuggestion(100000, [{ period: 202609, yieldPct: 1 }], null)).toMatchObject({ deltaAgorot: 1000 });
  });

  it('skips months with a missing yield', () => {
    expect(
      yieldSuggestion(
        100000,
        [
          { period: 202608, yieldPct: null },
          { period: 202609, yieldPct: 1 },
        ],
        202607,
      ),
    ).toMatchObject({ periods: [202609], throughPeriod: 202609 });
  });
});
