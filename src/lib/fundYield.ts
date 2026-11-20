/** A month's official return for a fund, as published on Gemel-Net. */
export interface MonthlyYield {
  /** YYYYMM */
  period: number;
  /** Percent, e.g. 0.8 for +0.8%. Null when the fund didn't report. */
  yieldPct: number | null;
}

export interface YieldSuggestion {
  periods: number[];
  /** Latest month included; becomes fund_synced_through once applied. */
  throughPeriod: number;
  /** Compounded return over all included months, in percent. */
  totalPct: number;
  newValueAgorot: number;
  deltaAgorot: number;
  /** null when the value doesn't change (just advance the sync marker). */
  kind: 'gain' | 'loss' | null;
}

const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

/** 202609 → "ספטמבר 2026" */
export function formatPeriodHe(period: number): string {
  const year = Math.floor(period / 100);
  const month = period % 100;
  return `${MONTHS[month - 1]} ${year}`;
}

/** [202608, 202609] → "אוגוסט–ספטמבר 2026"; across years keeps both years. */
export function formatPeriodsHe(periods: number[]): string {
  if (periods.length === 0) return '';
  const first = periods[0];
  const last = periods[periods.length - 1];
  if (first === last) return formatPeriodHe(first);
  const sameYear = Math.floor(first / 100) === Math.floor(last / 100);
  const firstText = sameYear ? MONTHS[(first % 100) - 1] : formatPeriodHe(first);
  return `${firstText}–${formatPeriodHe(last)}`;
}

/**
 * Proposes the value change from monthly returns published after `syncedThrough`.
 * Returns are compounded in month order. The estimate is rounded to whole agorot.
 */
export function yieldSuggestion(
  balanceAgorot: number,
  yields: readonly MonthlyYield[],
  syncedThrough: number | null,
): YieldSuggestion | null {
  const fresh = yields
    .filter((y): y is { period: number; yieldPct: number } => y.yieldPct !== null && (syncedThrough === null || y.period > syncedThrough))
    .sort((a, b) => a.period - b.period);
  if (fresh.length === 0) return null;

  const factor = fresh.reduce((f, y) => f * (1 + y.yieldPct / 100), 1);
  const newValueAgorot = Math.round(balanceAgorot * factor);
  const deltaAgorot = newValueAgorot - balanceAgorot;
  return {
    periods: fresh.map((y) => y.period),
    throughPeriod: fresh[fresh.length - 1].period,
    totalPct: Math.round((factor - 1) * 1_000_000) / 10_000, // percent, 4 decimals (display only)
    newValueAgorot,
    deltaAgorot,
    kind: deltaAgorot > 0 ? 'gain' : deltaAgorot < 0 ? 'loss' : null,
  };
}

/** Orders search results so funds whose own name contains more of the query words come first (stable). */
export function rankFunds<T extends { name: string }>(results: readonly T[], query: string): T[] {
  const words = query.trim().split(/\s+/).filter(Boolean);
  const score = (name: string) => words.filter((w) => name.includes(w)).length;
  return results
    .map((r, i) => ({ r, i, s: score(r.name) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.r);
}
