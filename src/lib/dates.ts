const pad = (n: number) => String(n).padStart(2, '0');

/** Today's date as YYYY-MM-DD in the device's local time zone. */
export function todayLocalISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** True only for real calendar dates written as YYYY-MM-DD. */
export function isValidISODate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
}

const formatter = new Intl.DateTimeFormat('he-IL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** "2026-11-03" → "3 בנוב׳ 2026". Parsed as a local date so the day never shifts. */
export function formatDateHe(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return formatter.format(new Date(y, m - 1, d));
}
