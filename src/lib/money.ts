import type { TransactionKind } from './types';

/** Largest single amount allowed: 999,999,999.99 ₪. */
export const MAX_AGOROT = 99_999_999_999;

export type ParseAmountResult = { ok: true; agorot: number } | { ok: false; error: string };

const PLAIN = /^\d+(\.\d{1,2})?$/;
const GROUPED = /^\d{1,3}(,\d{3})+(\.\d{1,2})?$/;
const SPACE_GROUPED = /^\d{1,3}( \d{3})+(\.\d{1,2})?$/;

/**
 * Parses user-typed shekel amounts into integer agorot without float math.
 * Accepts "1,000", "1 000", "1,000.5", "₪300", " 250 ". Rejects zero, negatives,
 * more than two decimals and ambiguous commas such as "12,5".
 */
export function parseAmountInput(input: string): ParseAmountResult {
  // Internal spaces are kept so "12 5" is rejected instead of silently becoming 125.
  const cleaned = input.replace(/₪/g, '').replace(/\s+/g, ' ').trim();
  if (cleaned === '') return { ok: false, error: 'נא להזין סכום' };
  if (!PLAIN.test(cleaned) && !GROUPED.test(cleaned) && !SPACE_GROUPED.test(cleaned)) {
    return { ok: false, error: 'סכום לא תקין' };
  }
  const [whole, fraction = ''] = cleaned.replace(/[, ]/g, '').split('.');
  const wholeDigits = whole.replace(/^0+(?=\d)/, '');
  if (wholeDigits.length > 9) return { ok: false, error: 'הסכום גדול מדי' };
  const agorot = Number(wholeDigits) * 100 + Number(fraction.padEnd(2, '0'));
  if (agorot <= 0) return { ok: false, error: 'הסכום חייב להיות גדול מאפס' };
  if (agorot > MAX_AGOROT) return { ok: false, error: 'הסכום גדול מדי' };
  return { ok: true, agorot };
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 18425000 → "184,250 ₪", 1234550 → "12,345.50 ₪". */
export function formatAgorot(agorot: number): string {
  const abs = Math.abs(Math.trunc(agorot));
  const shekels = Math.floor(abs / 100);
  const rest = abs % 100;
  const sign = agorot < 0 ? '−' : '';
  const fraction = rest === 0 ? '' : `.${String(rest).padStart(2, '0')}`;
  return `${sign}${groupThousands(String(shekels))}${fraction} ₪`;
}

/** Kinds that reduce the balance. Must match guard_balance in the database. */
export function isNegativeKind(kind: TransactionKind): boolean {
  return kind === 'withdrawal' || kind === 'loss';
}

/** Deposits/gains get "+", withdrawals/losses get "−" (U+2212), opening is unsigned. */
export function formatSignedAgorot(agorot: number, kind: TransactionKind): string {
  const base = formatAgorot(Math.abs(agorot));
  if (kind === 'opening') return base;
  return isNegativeKind(kind) ? `−${base}` : `+${base}`;
}
