import { shouldResyncHousehold, toHebrewError } from '../errors';

describe('toHebrewError', () => {
  it.each([
    ['INSUFFICIENT_BALANCE', 'אין מספיק כסף בחיסכון'],
    ['INVALID_INVITE_CODE', 'קוד ההזמנה לא נמצא'],
    ['ALREADY_IN_HOUSEHOLD', 'אתה כבר חבר במשק בית'],
    ['NOT_OWNER', 'רק מנהל משק הבית יכול לעשות את זה'],
    ['CANNOT_REMOVE_SELF', 'אי אפשר להסיר את עצמך. אפשר לעזוב את משק הבית בהגדרות'],
    ['INVALID_DATE', 'תאריך לא תקין'],
    ['NOT_FOUND', 'הפריט לא נמצא. ייתכן שנמחק'],
    ['ALREADY_APPLIED', 'העדכון הזה כבר נרשם (אולי מהטלפון השני)'],
    ['LAST_MEMBER', 'אתה החבר האחרון. עזיבה תמחק את משק הבית'],
    ['NOT_IN_HOUSEHOLD', 'אינך חבר במשק בית'],
    ['Invalid login credentials', 'אימייל או סיסמה שגויים'],
    ['User already registered', 'כבר קיים משתמש עם האימייל הזה'],
    ['Password should be at least 6 characters.', 'הסיסמה צריכה להיות לפחות 6 תווים'],
    ['Unable to validate email address: invalid format', 'כתובת האימייל לא תקינה'],
    ['Token has expired or is invalid', 'הקוד שגוי או שפג תוקפו. אפשר לבקש קוד חדש'],
    ['For security purposes, you can only request this after 42 seconds.', 'אפשר לבקש קוד חדש רק אחרי דקה'],
    ['New password should be different from the old password.', 'הסיסמה החדשה חייבת להיות שונה מהקודמת'],
    ['Error sending recovery email', 'שליחת המייל נכשלה. נסה שוב מאוחר יותר'],
  ])('maps %p', (message, hebrew) => {
    expect(toHebrewError({ message })).toBe(hebrew);
  });

  it('maps codes embedded in a longer Postgres message', () => {
    expect(toHebrewError({ message: 'P0001: INSUFFICIENT_BALANCE', code: 'P0001' })).toBe('אין מספיק כסף בחיסכון');
  });

  it('maps network failures', () => {
    expect(toHebrewError(new TypeError('Network request failed'))).toBe('אין חיבור לשרת. בדוק את האינטרנט ונסה שוב');
    expect(toHebrewError(new TypeError('Failed to fetch'))).toBe('אין חיבור לשרת. בדוק את האינטרנט ונסה שוב');
  });

  it('falls back to a generic message', () => {
    expect(toHebrewError(new Error('boom'))).toBe('משהו השתבש. נסה שוב');
    expect(toHebrewError(undefined)).toBe('משהו השתבש. נסה שוב');
  });
});

describe('shouldResyncHousehold', () => {
  it.each([
    [{ message: 'NOT_IN_HOUSEHOLD' }, true],
    [{ message: 'new row violates row-level security policy for table "transactions"' }, true],
    [{ message: 'INSUFFICIENT_BALANCE' }, false],
    [new TypeError('Network request failed'), false],
    [undefined, false],
  ])('%p → %p', (err, expected) => {
    expect(shouldResyncHousehold(err)).toBe(expected);
  });
});

describe('gemelnet errors', () => {
  it('distinguishes the data source being down from no internet', () => {
    expect(toHebrewError(new Error('GEMELNET_UNAVAILABLE'))).toBe('מאגר גמל-נט לא זמין כרגע. נסו שוב מאוחר יותר');
  });
});
