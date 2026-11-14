const NETWORK = 'אין חיבור לשרת. בדוק את האינטרנט ונסה שוב';
const GENERIC = 'משהו השתבש. נסה שוב';

/** Ordered: first matching fragment wins. */
const MESSAGES: [fragment: string, hebrew: string][] = [
  ['INSUFFICIENT_BALANCE', 'אין מספיק כסף בחיסכון'],
  ['INVALID_INVITE_CODE', 'קוד ההזמנה לא נמצא'],
  ['ALREADY_IN_HOUSEHOLD', 'אתה כבר חבר במשק בית'],
  ['NOT_OWNER', 'רק מנהל משק הבית יכול לעשות את זה'],
  ['CANNOT_REMOVE_SELF', 'אי אפשר להסיר את עצמך. אפשר לעזוב את משק הבית בהגדרות'],
  ['INVALID_DATE', 'תאריך לא תקין'],
  ['NOT_IN_HOUSEHOLD', 'אינך חבר במשק בית'],
  ['NOT_AUTHENTICATED', 'צריך להתחבר מחדש'],
  ['Invalid login credentials', 'אימייל או סיסמה שגויים'],
  ['User already registered', 'כבר קיים משתמש עם האימייל הזה'],
  ['Password should be at least', 'הסיסמה צריכה להיות לפחות 6 תווים'],
  ['invalid format', 'כתובת האימייל לא תקינה'],
  ['Email address', 'כתובת האימייל לא תקינה'],
  ['rate limit', 'יותר מדי ניסיונות. נסה שוב בעוד כמה דקות'],
  ['Network request failed', NETWORK],
  ['Failed to fetch', NETWORK],
  ['NetworkError', NETWORK],
  ['fetch failed', NETWORK],
];

/** Turns any Supabase / Postgres / network error into a friendly Hebrew sentence. */
export function toHebrewError(err: unknown): string {
  const message =
    typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string' ? err.message : '';
  const hit = MESSAGES.find(([fragment]) => message.includes(fragment));
  return hit ? hit[1] : GENERIC;
}
