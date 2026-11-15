import { goalProgress } from '../goals';

describe('goalProgress', () => {
  it('computes percent and remaining', () => {
    const p = goalProgress(18800000, 40000000, null, '2026-11-15');
    expect(p).toEqual({
      percent: 47,
      remainingAgorot: 21200000,
      reached: false,
      monthsLeft: null,
      monthlyAgorot: null,
      overdue: false,
    });
  });

  it('caps at 100% and marks reached', () => {
    const p = goalProgress(500000, 400000, '2027-01-01', '2026-11-15');
    expect(p.percent).toBe(100);
    expect(p.reached).toBe(true);
    expect(p.remainingAgorot).toBe(0);
    expect(p.monthlyAgorot).toBeNull();
    expect(p.overdue).toBe(false);
  });

  it('counts whole months to the date', () => {
    const p = goalProgress(0, 1200000, '2027-11-15', '2026-11-15');
    expect(p.monthsLeft).toBe(12);
    expect(p.monthlyAgorot).toBe(100000);
  });

  it('rounds partial months up and never below one', () => {
    expect(goalProgress(0, 1000, '2026-11-20', '2026-11-15').monthsLeft).toBe(1);
    expect(goalProgress(0, 1000, '2026-11-15', '2026-11-15').monthsLeft).toBe(1);
    expect(goalProgress(0, 1000, '2027-01-16', '2026-11-15').monthsLeft).toBe(3);
  });

  it('rounds the monthly amount up to the agora', () => {
    expect(goalProgress(0, 1000, '2027-02-15', '2026-11-15').monthlyAgorot).toBe(334);
  });

  it('flags an overdue goal and gives no monthly amount', () => {
    const p = goalProgress(100, 1000, '2026-10-01', '2026-11-15');
    expect(p.overdue).toBe(true);
    expect(p.monthsLeft).toBeNull();
    expect(p.monthlyAgorot).toBeNull();
  });

  it('treats a negative-looking balance as zero progress', () => {
    expect(goalProgress(0, 1000, null, '2026-11-15').percent).toBe(0);
  });
});
