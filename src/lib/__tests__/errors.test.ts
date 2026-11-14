import { toHebrewError } from '../errors';

describe('toHebrewError', () => {
  it.each([
    ['INSUFFICIENT_BALANCE', 'אין מספיק כסף בחיסכון'],
    ['INVALID_INVITE_CODE', 'קוד ההזמנה לא נמצא'],
    ['ALREADY_IN_HOUSEHOLD', 'אתה כבר חבר במשק בית'],
    ['NOT_OWNER', 'רק מנהל משק הבית יכול לעשות את זה'],
    ['CANNOT_REMOVE_SELF', 'אי אפשר להסיר את עצמך. אפשר לעזוב את משק הבית בהגדרות'],
    ['INVALID_DATE', 'תאריך לא תקין'],
    ['NOT_FOUND', 'הפריט לא נמצא. ייתכן שנמחק'],
    ['NOT_IN_HOUSEHOLD', 'אינך חבר במשק בית'],
    ['Invalid login credentials', 'אימייל או סיסמה שגויים'],
    ['User already registered', 'כבר קיים משתמש עם האימייל הזה'],
    ['Password should be at least 6 characters.', 'הסיסמה צריכה להיות לפחות 6 תווים'],
    ['Unable to validate email address: invalid format', 'כתובת האימייל לא תקינה'],
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
