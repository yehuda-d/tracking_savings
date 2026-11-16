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
  ['NOT_FOUND', 'הפריט לא נמצא. ייתכן שנמחק'],
  ['LAST_MEMBER', 'אתה החבר האחרון. עזיבה תמחק את משק הבית'],
  ['Invalid login credentials', 'אימייל או סיסמה שגויים'],
  ['User already registered', 'כבר קיים משתמש עם האימייל הזה'],
  ['Password should be at least', 'הסיסמה צריכה להיות לפחות 6 תווים'],
  ['invalid format', 'כתובת האימייל לא תקינה'],
  ['Token has expired or is invalid', 'הקוד שגוי או שפג תוקפו. אפשר לבקש קוד חדש'],
  ['For security purposes', 'אפשר לבקש קוד חדש רק אחרי דקה'],
  ['should be different from the old password', 'הסיסמה החדשה חייבת להיות שונה מהקודמת'],
  ['Error sending', 'שליחת המייל נכשלה. נסה שוב מאוחר יותר'],
  ['Email address', 'כתובת האימייל לא תקינה'],
  ['rate limit', 'יותר מדי ניסיונות. נסה שוב בעוד כמה דקות'],
  ['Network request failed', NETWORK],
  ['Failed to fetch', NETWORK],
  ['NetworkError', NETWORK],
  ['fetch failed', NETWORK],
];

function messageOf(err: unknown): string {
  return typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string'
    ? err.message
    : '';
}

/** True when an error means our idea of the household is stale (e.g. we were removed). */
export function shouldResyncHousehold(err: unknown): boolean {
  const message = messageOf(err);
  return message.includes('NOT_IN_HOUSEHOLD') || message.includes('row-level security');
}

/** Turns any Supabase / Postgres / network error into a friendly Hebrew sentence. */
export function toHebrewError(err: unknown): string {
  const message = messageOf(err);
  const hit = MESSAGES.find(([fragment]) => message.includes(fragment));
  return hit ? hit[1] : GENERIC;
}
