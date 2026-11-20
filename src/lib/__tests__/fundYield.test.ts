import { formatPeriodHe, formatPeriodsHe, fundFieldsToSave, rankFunds, yieldSuggestion } from '../fundYield';

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

describe('rankFunds', () => {
  const f = (fundId: number, name: string, manager = 'מיטב גמל ופנסיה') => ({ fundId, name, manager, classification: 'קרנות השתלמות' });
  it('puts funds whose own name matches more query words first', () => {
    const ranked = rankFunds(
      [f(289, 'קרן השתלמות לעובדי בנק ישראל'), f(1487, 'מיטב השתלמות בניהול אישי'), f(880, 'מיטב השתלמות כללי')],
      'מיטב השתלמות כללי',
    );
    expect(ranked.map((x) => x.fundId)).toEqual([880, 1487, 289]);
  });
  it('keeps the original order for ties', () => {
    expect(rankFunds([f(1, 'א ב'), f(2, 'א ג')], 'א').map((x) => x.fundId)).toEqual([1, 2]);
  });
});

describe('fundFieldsToSave', () => {
  const linked = { id: 880, name: 'מיטב השתלמות כללי', syncedThrough: 202610 };
  it('sends nothing when the link did not change (keeps the server marker)', () => {
    expect(fundFieldsToSave(880, { ...linked, syncedThrough: 202608 }, true)).toEqual({});
    expect(fundFieldsToSave(null, null, true)).toEqual({});
    expect(fundFieldsToSave(null, null, false)).toEqual({});
  });
  it('sends the new fund when linking or switching', () => {
    expect(fundFieldsToSave(null, linked, true)).toEqual({ fund_id: 880, fund_name: 'מיטב השתלמות כללי', fund_synced_through: 202610 });
    expect(fundFieldsToSave(111, linked, true)).toEqual({ fund_id: 880, fund_name: 'מיטב השתלמות כללי', fund_synced_through: 202610 });
  });
  it('unlinks when removed or when the type no longer supports funds', () => {
    const cleared = { fund_id: null, fund_name: null, fund_synced_through: null };
    expect(fundFieldsToSave(880, null, true)).toEqual(cleared);
    expect(fundFieldsToSave(880, linked, false)).toEqual(cleared);
  });
});
