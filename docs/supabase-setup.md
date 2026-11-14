# הגדרת Supabase

את ההגדרה עושים פעם אחת. זה לוקח בערך 5 דקות.

## 1. פתיחת פרויקט

1. נכנסים ל-https://supabase.com ונרשמים. אפשר להתחבר עם GitHub.
2. לוחצים **New project**.
   - **Name:** `tracking-savings`
   - **Database Password:** בוחרים סיסמה חזקה **ושומרים אותה**. היא תידרש כדי להעלות את מבנה מסד הנתונים.
   - **Region:** `Central EU (Frankfurt)`, הכי קרוב לישראל.
   - התוכנית: **Free**.
3. מחכים שהפרויקט יסיים לעלות, בערך דקה.

## 2. כיבוי אימות אימייל

**Authentication** ← **Sign In / Providers** ← **Email**: מכבים את **Confirm email** ושומרים (**Save**).

בלי זה, כל נרשם חדש צריך לאשר מייל, ושירות המיילים החינמי של Supabase מוגבל מאוד.

## 3. העתקת המפתחות

**Project Settings** (גלגל השיניים) ← **API Keys**. אם יש לשונית **Legacy API Keys**, משתמשים בה.

| מה מעתיקים | לאן |
|---|---|
| **Project URL**: מופיע ב-**Data API**, או בכפתור **Connect** בראש העמוד | `EXPO_PUBLIC_SUPABASE_URL` בקובץ `.env` |
| **anon** / **publishable** key | `EXPO_PUBLIC_SUPABASE_ANON_KEY` בקובץ `.env` |
| **service_role** / **secret** key | `SUPABASE_SERVICE_ROLE_KEY` בקובץ `.env.local` |

יוצרים בתיקיית הפרויקט את שני הקבצים:

`.env`
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

`.env.local`
```
SUPABASE_SERVICE_ROLE_KEY=...
```

⚠️ את המפתח הסודי (service_role / secret) **לא שולחים לאף אחד ולא מעלים ל-GitHub**. שני הקבצים כבר מוחרגים מ-git. מספיק שתיצור את הקבצים, ולא צריך להדביק את המפתחות בצ'אט.

## 4. העלאת מבנה מסד הנתונים

**אפשרות א' (מומלצת): דרך הטרמינל**
```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push
```
- `npx supabase login` פותח דפדפן לאישור.
- את `<ref>` מחליפים במזהה הפרויקט: החלק שבין `https://` ל-`.supabase.co` בכתובת הפרויקט.
- `link` מבקש את סיסמת מסד הנתונים מסעיף 1.

**אפשרות ב': העתק-הדבק**
ב-**SQL Editor** ← **New query** מדביקים את כל התוכן של `supabase/migrations/0001_init.sql` ולוחצים **Run**.

## הערה על התוכנית החינמית

אם אף אחד לא נכנס לאפליקציה **7 ימים**, הפרויקט עובר להשהיה. הנתונים לא נמחקים. כדי להחזיר אותו, נכנסים ל-supabase.com ולוחצים **Restore project**.
