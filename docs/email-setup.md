# הגדרת שליחת מיילים: Brevo ו-Supabase

כדי ש"שכחתי סיסמה" יעבוד לכולם, Supabase צריך שירות שליחת מיילים. השירות המובנה שלו שולח מיילים רק לחברי הצוות של הפרויקט. ההגדרה נעשית פעם אחת, ולוקחת בערך 10 דקות.

> את פרטי ה-SMTP (במיוחד את המפתח) מדביקים **רק בלוח הבקרה של Supabase**. לא שולחים אותם בצ'אט ולא שומרים אותם בקבצי הפרויקט.

## חלק א': Brevo

### 1. הרשמה
https://www.brevo.com ← **Sign up free**. ממלאים את הפרטים. אם Brevo שואל על "חברה", אפשר לכתוב את השם שלך.

### 2. אימות כתובת שולח
זו הכתובת שתופיע אצל המקבל בשדה "מאת".

1. מימין למעלה: **שם המשתמש** ← **Senders, Domains & Dedicated IPs** ← לשונית **Senders** ← **Add sender**.
2. ממלאים:
   - **From name:** `מעקב חסכונות`
   - **From email:** כתובת המייל שלך
3. שומרים. Brevo שולח לכתובת קוד או קישור לאימות, ומאשרים אותו.

### 3. יצירת מפתח SMTP
1. מימין למעלה: **שם המשתמש** ← **SMTP & API** ← לשונית **SMTP**.
2. לוחצים **Generate a new SMTP key**, נותנים שם (למשל `supabase`), ו**מעתיקים את המפתח מיד**. אחרי סגירת החלון הוא לא יוצג שוב.
3. באותו מסך רושמים לעצמכם עוד שני פרטים:
   - **SMTP Server:** `smtp-relay.brevo.com`
   - **Login:** כתובת שנראית בערך כך: `xxxxxx@smtp-brevo.com`

## חלק ב': Supabase

### 4. חיבור ה-SMTP
**Authentication** ← **Emails** ← לשונית **SMTP Settings** ← מפעילים **Enable Custom SMTP**:

| שדה | מה לכתוב |
|---|---|
| Sender email | הכתובת שאימתתם ב-Brevo בשלב 2 |
| Sender name | `מעקב חסכונות` |
| Host | `smtp-relay.brevo.com` |
| Port number | `587` |
| Username | ה-**Login** משלב 3 (`...@smtp-brevo.com`) |
| Password | **המפתח** שיצרתם בשלב 3 |

לוחצים **Save changes**.

### 5. תבנית המייל עם הקוד
**Authentication** ← **Emails** ← לשונית **Templates** ← **Reset Password**:

- **Subject:**
  ```
  קוד לאיפוס הסיסמה – מעקב חסכונות
  ```
- **Body:** מוחקים את כל מה שיש שם ומדביקים:
  ```html
  <div dir="rtl" style="font-family: Arial, sans-serif; text-align: right;">
    <h2>איפוס סיסמה</h2>
    <p>הקוד שלך לאיפוס הסיסמה באפליקציה "מעקב חסכונות":</p>
    <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; direction: ltr; text-align: center;">{{ .Token }}</p>
    <p>מקלידים את הקוד באפליקציה ובוחרים סיסמה חדשה. הקוד תקף לשעה.</p>
    <p style="color: #888;">אם לא ביקשת לאפס סיסמה, אפשר להתעלם מהמייל הזה.</p>
  </div>
  ```

לוחצים **Save changes**.

## בדיקה
באפליקציה: **שכחתי סיסמה** ← מזינים אימייל ← אמור להגיע מייל עם קוד בן 6 ספרות. אם המייל לא מגיע, כדאי לבדוק בספאם.
