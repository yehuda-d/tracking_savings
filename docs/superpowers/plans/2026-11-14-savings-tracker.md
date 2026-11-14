# Savings Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An Android app (Expo) where a couple shares a household and tracks savings (purpose, location, institution, balance computed from deposits/withdrawals), synced in real time via Supabase.

**Architecture:** Expo + expo-router app talks directly to Supabase (Auth, Postgres with RLS, Realtime). All money rules (no negative balance, household isolation, joining by code) are enforced in the database; the app mirrors them for friendly validation. TanStack Query caches server state; one Realtime channel per household invalidates it.

**Tech Stack:** Expo (latest SDK, must match the Expo Go on the Play Store), TypeScript, expo-router, @supabase/supabase-js, @tanstack/react-query, @expo-google-fonts/heebo, @expo/vector-icons, @react-native-community/datetimepicker, jest-expo, tsx (scripts).

**Spec:** `docs/superpowers/specs/2026-11-14-savings-tracker-design.md` (Hebrew). Read it before starting any task.

## Global Constraints

- UI copy is Hebrew only; no English strings visible to the user. Layout is RTL everywhere.
- Money is stored and passed as integer agorot (`bigint` in DB, `number` in TS). Never use floats for money arithmetic.
- Max single amount: 999,999,999.99 ₪ (99,999,999,999 agorot).
- Currency display format: `184,250 ₪` (whole) / `12,345.50 ₪` (with agorot); signed history entries `+500 ₪` / `−500 ₪` (U+2212 minus).
- Only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` may reach app code. `SUPABASE_SERVICE_ROLE_KEY` lives only in `.env.local` and is read only by `scripts/`.
- `.env` and `.env.local` are git-ignored; `.env.example` lists variable names only.
- Every mutation button is disabled while its mutation is pending (no double deposits).
- Every screen that loads data has a loading, empty (where relevant), and error state; the error state shows a Hebrew message and a "נסה שוב" button.
- Email confirmation is off in Supabase; no forgot-password flow in this version.
- GitHub remote: `origin` = `https://github.com/yehuda-d/tracking_savings.git` (added in Task 1). Do not push unless the user asks.
- After each task, run the `code-reviewer` agent (created in Task 1) on that task's changes and fix what it finds before moving on.

## Review Focus

1. **Amount typed with separators** (`"1,000"`, `"1,000.5"`, `" 250 "`, `"₪300"`, `"12,5"`): accept the first four, reject ambiguous `"12,5"` with a Hebrew error; never silently mis-parse. → tests in Task 2.
2. **Late-night entries**: a deposit dated "today" in Israel at 00:30 (UTC is still yesterday) must be accepted; dates more than one day ahead of UTC rejected. → DB check `occurred_on <= current_date + 1`; client caps at local today. Tests in Task 3 and Task 2.
3. **Balance going negative by deletion or by two phones at once**: deleting a deposit or opening balance that would make the balance negative is rejected; concurrent inserts serialize on a row lock. → Task 3 trigger + RLS script cases.
4. **Deleting a saving that has withdrawals**: cascade delete must succeed even though deleting deposits first would transiently make the balance negative. → Task 3 trigger skips check when parent saving is gone; RLS script case.
5. **User removed from household (or household deleted) while app is open**: the app routes them to onboarding instead of showing broken screens; removed member reads zero savings. → Task 3 RLS case + Task 5 `resolveRoute` tests.

---

## File Structure

```
app/
  _layout.tsx                 Providers (QueryClient, Auth), fonts, RTL bootstrap, route guard
  +html.tsx                   Web root with <html dir="rtl" lang="he">
  (auth)/sign-in.tsx
  (auth)/sign-up.tsx
  onboarding.tsx              Create household / join with code
  (app)/_layout.tsx           Stack for signed-in users with a household; starts realtime
  (app)/index.tsx             Home: total card + savings list + FAB
  (app)/saving/new.tsx        Create saving form
  (app)/saving/[id]/index.tsx Saving detail + history + add/withdraw
  (app)/saving/[id]/edit.tsx  Edit saving form
  (app)/settings.tsx          Household, invite code, members, leave, sign out
src/
  lib/supabase.ts             Supabase client
  lib/types.ts                DB row types
  lib/money.ts                Parse/format agorot
  lib/dates.ts                Local ISO date helpers, Hebrew date formatting
  lib/validation.ts           Form validators
  lib/locationTypes.ts        Enum values, Hebrew labels, icons
  lib/errors.ts               Map Supabase/Postgres errors to Hebrew
  lib/routing.ts              resolveRoute()
  auth/AuthProvider.tsx       Session context
  data/queryKeys.ts
  data/household.ts           Household/members queries and mutations
  data/savings.ts             Savings queries and mutations
  data/transactions.ts        Transactions queries and mutations
  data/realtime.ts            useHouseholdRealtime()
  theme/tokens.ts             Colors, spacing, radii, typography
  components/                 Screen, Button, TextField, Card, Chip, AmountText,
                              LoadingState, ErrorState, EmptyState, ConfirmDialog,
                              TransactionSheet, SavingForm
supabase/migrations/0001_init.sql
scripts/rls-test.ts
.claude/agents/code-reviewer.md
.claude/skills/preview/SKILL.md
```

---

### Task 1: Project scaffold, tooling, reviewer agent, preview skill

**Files:**
- Create: Expo project in repo root (via `create-expo-app`), `.gitignore` additions, `.env.example`, `.claude/agents/code-reviewer.md`, `.claude/skills/preview/SKILL.md`, `src/lib/__tests__/smoke.test.ts`
- Modify: `package.json` scripts, `app.json`

**Interfaces:**
- Produces: npm scripts `test`, `typecheck`, `lint`, `test:rls`; the `code-reviewer` agent; the `/preview` skill.

- [ ] **Step 1:** `git init -b main`; `git remote add origin https://github.com/yehuda-d/tracking_savings.git`; commit the existing `docs/` folder alone (`docs: add design spec and plan`).
- [ ] **Step 2:** Scaffold with `npx create-expo-app@latest` (default TypeScript + expo-router template) into a temp folder inside the scratchpad and move its contents into the repo root (the root is not empty). Remove the template's example screens/components (`reset-project` script if present).
- [ ] **Step 3:** Install: `@supabase/supabase-js @tanstack/react-query @expo-google-fonts/heebo expo-font @react-native-community/datetimepicker` via `npx expo install` (plus whatever Supabase's current Expo guide requires for session storage), and dev deps `jest-expo jest @types/jest tsx`.
- [ ] **Step 4:** `package.json` scripts: `"test": "jest"`, `"typecheck": "tsc --noEmit"`, `"lint": "expo lint"`, `"test:rls": "tsx --env-file=.env --env-file=.env.local scripts/rls-test.ts"`; jest `"preset": "jest-expo"`.
- [ ] **Step 5:** `app.json`: name `מעקב חסכונות`, slug `tracking-savings`, `android.package` `com.trackingsavings.app`, `extra.supportsRTL: true`, `extra.forcesRTL: true`, `userInterfaceStyle: "light"`.
- [ ] **Step 6:** `.gitignore` adds `.env`, `.env.local`. `.env.example` contains `EXPO_PUBLIC_SUPABASE_URL=`, `EXPO_PUBLIC_SUPABASE_ANON_KEY=` and a comment that `SUPABASE_SERVICE_ROLE_KEY=` goes in `.env.local` only.
- [ ] **Step 7:** Write `.claude/agents/code-reviewer.md` with frontmatter `name: code-reviewer`, a description saying it reviews changes in this project after each task, `tools: Read, Grep, Glob, Bash`. Body: review the files changed since a given commit (`git diff <base>..HEAD`), checking exactly the spec's list: money correctness (agorot only, parse/format), security (RLS on every table, `security_invoker` view, no service key outside `scripts/`, no secrets committed), TypeScript (no unjustified `any`, types match `src/lib/types.ts`), RTL/Hebrew (no visible English, no hard-coded left/right where start/end is meant), loading/empty/error states, pending-disabled buttons. It must run `npm run typecheck`, `npm run lint`, `npm test` and report failures verbatim. Output: findings ranked Critical / Important / Minor with `file:line`, then a one-line verdict (approve / changes needed). It does not edit files.
- [ ] **Step 8:** Write `.claude/skills/preview/SKILL.md` (`name: preview`, description: start the app so the user can view it in Expo Go and the browser). Steps it instructs: if a dev server is already running on 8081, reuse it; else start `npx expo start --lan` in the background; read the log for the `exp://` URL; generate a QR PNG with `npx --yes qrcode -o .expo/preview-qr.png "<exp url>"` and open it with `start`; tell the user (in Hebrew) the `exp://` URL, the web link `http://localhost:8081`, that changes hot-reload, and that if the phone can't connect (different Wi-Fi / firewall) to rerun with `--tunnel`.
- [ ] **Step 9:** Write `src/lib/__tests__/smoke.test.ts` (`expect(1 + 1).toBe(2)`). Run `npm run typecheck && npm run lint && npm test` → all pass. Run `npx expo export --platform web` → succeeds (delete `dist/`, add `dist/` to `.gitignore`).
- [ ] **Step 10:** Commit `chore: scaffold expo app, reviewer agent, preview skill`.

---

### Task 2: Money, dates, validation (pure logic, TDD)

**Files:**
- Create: `src/lib/money.ts`, `src/lib/dates.ts`, `src/lib/validation.ts`, `src/lib/locationTypes.ts`, `src/lib/types.ts`
- Test: `src/lib/__tests__/money.test.ts`, `dates.test.ts`, `validation.test.ts`
- Delete: `src/lib/__tests__/smoke.test.ts`

**Interfaces:**
- Produces:
  - `parseAmountInput(input: string): { ok: true; agorot: number } | { ok: false; error: string }`
  - `formatAgorot(agorot: number): string` and `formatSignedAgorot(agorot: number, kind: TransactionKind): string`
  - `MAX_AGOROT = 99_999_999_999`
  - `todayLocalISO(now?: Date): string` (`YYYY-MM-DD`, device local time), `isValidISODate(s: string): boolean`, `formatDateHe(iso: string): string`
  - `validateSavingForm(v: { purpose: string; locationType: LocationType | null; institution: string; openingInput?: string }): ValidationResult<SavingInput & { openingAgorot?: number }>`
  - `validateTransactionForm(v: { kind: 'deposit' | 'withdrawal'; amountInput: string; occurredOn: string; balanceAgorot: number; today: string }): ValidationResult<{ amountAgorot: number; occurredOn: string }>`
  - `type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> }`
  - `LOCATION_TYPES: readonly LocationType[]`, `locationLabel(t): string`, `locationIcon(t): MaterialCommunityIcons name`
  - `types.ts`: `LocationType = 'bank_account' | 'deposit' | 'money_market_fund' | 'provident_fund' | 'study_fund' | 'other'`; `TransactionKind = 'opening' | 'deposit' | 'withdrawal'`; `Household {id; name; invite_code; created_by; created_at}`; `Member {user_id; role: 'owner' | 'member'; display_name; joined_at}`; `SavingInput {purpose; location_type; institution; notes: string | null}`; `SavingWithBalance extends SavingInput {id; household_id; created_by; created_at; updated_at; balance_agorot: number}`; `Transaction {id; saving_id; kind; amount_agorot; occurred_on; note: string | null; created_by; created_at; author_name: string | null}`

- [ ] **Step 1: Write failing tests** in `money.test.ts`:
  - `parseAmountInput('250')` → `{ok:true, agorot:25000}`; `'1,000'` → 100000; `'1,000.5'` → 100050; `' 250 '` → 25000; `'₪300'` → 30000; `'0.01'` → 1; `'999999999.99'` → 99999999999.
  - Rejected (ok false, error non-empty Hebrew): `''`, `'abc'`, `'12,5'`, `'1.234'`, `'-5'`, `'0'` (but see opening below), `'1000000000'`.
  - `formatAgorot(18425000)` → `'184,250 ₪'`; `formatAgorot(1234550)` → `'12,345.50 ₪'`; `formatAgorot(5)` → `'0.05 ₪'`; `formatAgorot(0)` → `'0 ₪'`.
  - `formatSignedAgorot(50000,'deposit')` → `'+500 ₪'`; `(50000,'withdrawal')` → `'−500 ₪'`; `(50000,'opening')` → `'500 ₪'`.
- [ ] **Step 2:** Run `npx jest src/lib/__tests__/money.test.ts` → FAIL (module not found).
- [ ] **Step 3:** Implement `money.ts`. Parsing: trim, strip `₪` and spaces; commas allowed only as thousands separators (regex `^\d{1,3}(,\d{3})*(\.\d{1,2})?$` or `^\d+(\.\d{1,2})?$`); convert by string split, not float multiply. Formatting: manual thousands grouping, no `Intl` (deterministic across Hermes/Node).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Failing tests** `dates.test.ts`: `todayLocalISO(new Date(2026, 10, 15, 0, 30))` → `'2026-11-15'`; `isValidISODate('2026-02-30')` → false, `('2026-11-14')` → true, `('14/11/2026')` → false; `formatDateHe('2026-11-03')` contains `'3'` and `'2026'`.
- [ ] **Step 6:** Implement `dates.ts` (`formatDateHe` via `Intl.DateTimeFormat('he-IL', {day:'numeric', month:'short', year:'numeric'})`, parse the ISO as a local date, not `new Date(iso)`). Run → PASS.
- [ ] **Step 7: Failing tests** `validation.test.ts`:
  - `validateSavingForm({purpose:'', locationType:null, institution:'', openingInput:'abc'})` → errors on `purpose`, `locationType`, `institution`, `opening`.
  - Valid with `openingInput: '0'` → ok, `openingAgorot: 0` (opening allows zero); with `openingInput: ''` → ok, `openingAgorot: 0`; purpose/institution are trimmed; empty notes → `null`.
  - `validateTransactionForm({kind:'withdrawal', amountInput:'600', occurredOn:'2026-11-14', balanceAgorot:50000, today:'2026-11-14'})` → error on `amount` = `'אין מספיק כסף בחיסכון'`.
  - Same with `kind:'deposit'` → ok `{amountAgorot:60000}`.
  - `occurredOn:'2026-11-15'` with `today:'2026-11-14'` → error on `occurredOn`; `occurredOn:'bad'` → error.
- [ ] **Step 8:** Implement `validation.ts` and `locationTypes.ts` (labels: חשבון בנק, פיקדון, קרן כספית, קופת גמל, קרן השתלמות, אחר; icons: `bank`, `safe`, `chart-line`, `piggy-bank`, `school`, `wallet`), plus `types.ts`. Run all tests → PASS; `npm run typecheck` → pass.
- [ ] **Step 9:** Commit `feat: money, date and form validation helpers`.

---

### Task 3: Database schema, RLS, functions, and RLS test script

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `scripts/rls-test.ts`, `docs/supabase-setup.md`

**Interfaces:**
- Produces (Postgres, all in `public`):
  - enums `location_type` (values as in `types.ts`), `transaction_kind` (`opening`,`deposit`,`withdrawal`), `member_role` (`owner`,`member`)
  - tables per spec: `profiles`, `households` (`invite_code text unique not null default generate_invite_code()`), `household_members` (`user_id unique`, both FKs `on delete cascade`), `savings` (`household_id` FK cascade), `transactions` (`saving_id` FK cascade; check `amount_agorot >= 0 and (kind = 'opening' or amount_agorot > 0)`; check `amount_agorot <= 99999999999`; check `occurred_on <= current_date + 1`; unique partial index one `opening` per saving)
  - view `savings_with_balance` with `security_invoker = true`: savings columns + `balance_agorot bigint` (opening + deposits − withdrawals, coalesce 0)
  - view `transactions_with_author` with `security_invoker = true`: transactions + `author_name` from profiles
  - `my_household_id() returns uuid` — `security definer`, `stable`, `set search_path = public`; used by every policy (avoids RLS recursion on `household_members`)
  - RPCs (all `security definer`, `set search_path = public`, check `auth.uid()` not null): `create_household(p_name text) returns households`; `join_household(p_code text) returns households` (case-insensitive, trims); `create_saving(p_purpose text, p_location_type location_type, p_institution text, p_notes text, p_opening_agorot bigint) returns uuid` (inserts saving + opening transaction atomically, `occurred_on = current_date`); `regenerate_invite_code() returns text` (owner only); `remove_member(p_user_id uuid)` (owner only, not self); `leave_household()` (deletes household if last member; else promotes the earliest-joined remaining member to owner if leaver was owner)
  - Error messages raised (exact strings, used by `src/lib/errors.ts`): `INSUFFICIENT_BALANCE`, `INVALID_INVITE_CODE`, `ALREADY_IN_HOUSEHOLD`, `NOT_OWNER`, `NOT_IN_HOUSEHOLD`
  - Realtime publication includes `savings`, `transactions`, `household_members`, `households`

- [ ] **Step 1: USER CHECKPOINT.** Write `docs/supabase-setup.md` (Hebrew): create project at supabase.com (region Frankfurt/EU), Authentication → Providers → Email → turn off "Confirm email"; copy Project URL + anon key into `.env`, service_role key into `.env.local`; how to apply migrations (Step 4). Ask the user to do it and confirm. Do not continue until `.env` and `.env.local` exist.
- [ ] **Step 2: Write `scripts/rls-test.ts`** (fails now: tables don't exist). Uses service client to create users A, B, C with `auth.admin.createUser({email: 'rls-test-<random>-a@example.com', password, email_confirm: true, user_metadata: {display_name}})`, then anon clients signed in as each. Tracks created user ids and household ids; `finally` block deletes the households (service client) then the users, even on failure. Each case prints `✓`/`✗ <name>`; exit code 1 if any fail. Cases:
  1. A `create_household('A')`, `create_saving(..., 50000)`; A sees 1 row in `savings_with_balance` with `balance_agorot = 50000`.
  2. B `create_household('B')`; B selects `savings_with_balance` → 0 rows; B selects A's saving by id → 0 rows.
  3. B inserts a deposit into A's saving → error; B updates A's saving purpose → 0 rows affected (A re-reads unchanged); B deletes A's saving → A still sees it.
  4. B inserts directly into `household_members` with A's household id → error.
  5. C `join_household('WRONG123')` → `INVALID_INVITE_CODE`; C `join_household(lower(A.invite_code))` → ok; C sees A's saving.
  6. B `join_household(A.invite_code)` → `ALREADY_IN_HOUSEHOLD`.
  7. A inserts withdrawal 60000 → `INSUFFICIENT_BALANCE`; withdrawal 50000 → ok (balance 0); A deletes the opening transaction → `INSUFFICIENT_BALANCE`.
  8. A inserts deposit with `occurred_on = today(UTC)+1` → ok; `+2` → error.
  9. A: new saving via `create_saving(..., 0)`, deposit 10000, withdrawal 10000, then delete the saving → ok and its transactions are gone.
  10. C `regenerate_invite_code()` → `NOT_OWNER`; C `remove_member(A)` → `NOT_OWNER`.
  11. A `remove_member(C)`; C selects `savings_with_balance` → 0 rows; C `my_household_id()` → null.
  12. C can read profiles only of own household members: C (now householdless) reading A's profile → 0 rows.
  13. A `leave_household()` (last member) → A's household row gone (verified via service client).
- [ ] **Step 3:** Write `0001_init.sql`. Key logic the tests don't fully determine:
  - `generate_invite_code()`: 8 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, using `gen_random_bytes`.
  - `profiles` row created by trigger on `auth.users` insert, `display_name = coalesce(raw_user_meta_data->>'display_name', split_part(email,'@',1))`.
  - Balance guard: `BEFORE INSERT OR DELETE ON transactions FOR EACH ROW`:
    ```
    select id into v from savings where id = coalesce(new.saving_id, old.saving_id) for update;
    if not found then return coalesce(new, old); end if;   -- cascade from saving delete
    current := sum(opening+deposit) - sum(withdrawal) for that saving;
    delta := insert withdrawal → -amount; insert other → +amount;
             delete withdrawal → +amount; delete other → -amount;
    if current + delta < 0 then raise exception 'INSUFFICIENT_BALANCE'; end if;
    ```
  - No UPDATE policy on `transactions` (edit = delete + add).
  - Policies: `savings` select/insert/update/delete where `household_id = my_household_id()`; `transactions` select/insert/delete where saving belongs to `my_household_id()` and on insert `created_by = auth.uid()` (default `auth.uid()`) and `kind <> 'opening'`; `households` select where `id = my_household_id()`, update only if caller is owner; `household_members` select where `household_id = my_household_id()`, no insert/update/delete policies; `profiles` select where `id = auth.uid()` or id is in my household's members, update own.
  - `savings.updated_at` maintained by a trigger.
- [ ] **Step 4:** Apply: `npx supabase login`, `npx supabase link --project-ref <ref>` (user enters DB password), `npx supabase db push`. If the user prefers, they paste the file into the SQL Editor instead.
- [ ] **Step 5:** Run `npm run test:rls` → all 13 cases `✓`, exit 0. Then in the Supabase dashboard (or via service client) confirm no `rls-test-` users remain.
- [ ] **Step 6:** Commit `feat: database schema, RLS and RLS test script`.

---

### Task 4: Theme, base components, RTL and fonts

**Files:**
- Create: `src/theme/tokens.ts`, `src/components/{Screen,Button,TextField,Card,Chip,AmountText,LoadingState,ErrorState,EmptyState,ConfirmDialog}.tsx`, `app/+html.tsx`
- Modify: `app/_layout.tsx`
- Test: `src/components/__tests__/Button.test.tsx`

**Interfaces:**
- Produces: `tokens` `{ colors: { bg, surface, primary, primaryText, text, textMuted, positive, negative, border }, space: (n: number) => number, radius: { sm, md, lg }, font: { regular: 'Heebo_400Regular', medium: 'Heebo_500Medium', bold: 'Heebo_700Bold' } }`
- `<Button title onPress variant?: 'primary'|'secondary'|'danger' loading?: boolean disabled?: boolean icon?: string />` — when `loading` or `disabled`, presses are ignored and a spinner replaces the title while loading
- `<TextField label value onChangeText error?: string keyboardType? secureTextEntry? autoFocus? />` (`textAlign: 'right'`)
- `<AmountText agorot size?: 'sm'|'md'|'xl' kind?: TransactionKind />` (uses `formatAgorot`/`formatSignedAgorot`, green/red for deposit/withdrawal)
- `<ErrorState message onRetry />` (button text `נסה שוב`), `<LoadingState />`, `<EmptyState title subtitle? action? />`
- `<ConfirmDialog visible title message confirmText destructive? onConfirm onCancel loading? />`
- `<Screen title? right? children scroll? />` (safe area, background)

- [ ] **Step 1: Failing test** `Button.test.tsx` (@testing-library/react-native, add as dev dep): pressing calls `onPress`; with `loading` pressing does not call it; with `disabled` pressing does not call it.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement tokens and components. Visual direction: warm, calm finance look — light background, white rounded cards with soft shadow, one strong primary (deep teal/emerald), generous spacing, large numerals for balances. Use `marginStart/End`, `paddingStart/End`, never left/right.
- [ ] **Step 4:** `app/_layout.tsx`: load Heebo fonts (hold splash until loaded); RTL bootstrap — on native, if `!I18nManager.isRTL` call `I18nManager.allowRTL(true); I18nManager.forceRTL(true)` then reload once (`expo-updates` `reloadAsync`, or `DevSettings.reload()` in dev); `app/+html.tsx` sets `<html lang="he" dir="rtl">`.
- [ ] **Step 5:** Run `npm test`, `npm run typecheck`, `npm run lint` → pass; `npx expo export --platform web` → succeeds.
- [ ] **Step 6:** Commit `feat: theme, base components, RTL and fonts`.

---

### Task 5: Supabase client, auth, routing guard, sign-in/up

**Files:**
- Create: `src/lib/supabase.ts`, `src/lib/errors.ts`, `src/lib/routing.ts`, `src/auth/AuthProvider.tsx`, `src/data/queryKeys.ts`, `src/data/household.ts` (only `useMyHousehold` in this task), `app/(auth)/sign-in.tsx`, `app/(auth)/sign-up.tsx`
- Modify: `app/_layout.tsx`
- Test: `src/lib/__tests__/routing.test.ts`, `src/lib/__tests__/errors.test.ts`

**Interfaces:**
- Produces:
  - `supabase` (typed client, session persisted per Supabase's current Expo guide, `detectSessionInUrl: false`, auto-refresh tied to `AppState`)
  - `useAuth(): { session: Session | null; loading: boolean; signIn(email, password): Promise<void>; signUp(email, password, displayName): Promise<void>; signOut(): Promise<void> }`
  - `toHebrewError(err: unknown): string` — maps: `INSUFFICIENT_BALANCE` → `אין מספיק כסף בחיסכון`; `INVALID_INVITE_CODE` → `קוד ההזמנה לא נמצא`; `ALREADY_IN_HOUSEHOLD` → `אתה כבר חבר במשק בית`; `NOT_OWNER` → `רק מנהל משק הבית יכול לעשות את זה`; `Invalid login credentials` → `אימייל או סיסמה שגויים`; `User already registered` → `כבר קיים משתמש עם האימייל הזה`; password-length error → `הסיסמה צריכה להיות לפחות 6 תווים`; fetch/network failures → `אין חיבור לשרת. בדוק את האינטרנט ונסה שוב`; anything else → `משהו השתבש. נסה שוב`
  - `resolveRoute(s: { authLoading: boolean; hasSession: boolean; household: 'loading' | 'none' | 'some' | 'error'; currentGroup: 'auth' | 'onboarding' | 'app' }): '/sign-in' | '/onboarding' | '/' | null` (`null` = stay)
  - `queryKeys = { household: ['household'], members: ['members'], savings: ['savings'], saving: (id: string) => ['saving', id], transactions: (savingId: string) => ['transactions', savingId] }`
  - `useMyHousehold(): UseQueryResult<Household | null>` (via `my_household_id()` then select `households`)

- [ ] **Step 1: Failing tests** `routing.test.ts`: authLoading → null; no session in group app → `/sign-in`; no session in auth → null; session + household loading → null; session + `none` in app → `/onboarding`; session + `none` in onboarding → null; session + `some` in auth or onboarding → `/`; session + `some` in app → null; session + `error` → null (screen shows error state). `errors.test.ts`: each mapping above using `{ message: 'INSUFFICIENT_BALANCE' }`, `new TypeError('Network request failed')`, and an unknown error.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement the interfaces. `_layout.tsx` wraps in `QueryClientProvider` + `AuthProvider`, computes `resolveRoute` with `useSegments()` and redirects with `router.replace`. On sign-out, `queryClient.clear()`.
- [ ] **Step 4:** Sign-in screen: email, password, `התחבר` button, link `אין לך חשבון? הרשמה`. Sign-up: display name (`שם`), email, password, `הרשמה`. Errors shown via `toHebrewError` under the button. Buttons `loading` while pending.
- [ ] **Step 5:** Run unit tests, typecheck, lint → pass. Run `/preview`; manually sign up a throwaway account in the browser, confirm it lands on onboarding (placeholder screen OK), sign out, sign back in. Delete the throwaway user in the dashboard afterwards.
- [ ] **Step 6:** Commit `feat: auth flow and route guard`.

---

### Task 6: Onboarding — create or join household

**Files:**
- Create: `app/onboarding.tsx`
- Modify: `src/data/household.ts`

**Interfaces:**
- Consumes: `useMyHousehold`, `queryKeys`, `toHebrewError`
- Produces: `useCreateHousehold(): UseMutationResult<Household, Error, string>`, `useJoinHousehold(): UseMutationResult<Household, Error, string>` — both set `queryKeys.household` data on success so the guard routes to `/`.

- [ ] **Step 1:** Implement the two mutations (RPCs `create_household`, `join_household`).
- [ ] **Step 2:** Onboarding screen: friendly header `ברוכים הבאים!`, two cards: `צור משק בית חדש` (name field, default `הבית שלנו`) and `הצטרף עם קוד הזמנה` (code field, auto-uppercase, 8 chars). Errors inline in Hebrew.
- [ ] **Step 3:** Typecheck, lint, tests → pass. Via `/preview`: create a household with one throwaway user; join with a second throwaway user using the code; wrong code shows `קוד ההזמנה לא נמצא`. Clean up throwaway users/households.
- [ ] **Step 4:** Commit `feat: onboarding create/join household`.

---

### Task 7: Home screen, savings list, realtime

**Files:**
- Create: `app/(app)/_layout.tsx`, `app/(app)/index.tsx`, `src/data/savings.ts` (queries only in this task), `src/data/realtime.ts`

**Interfaces:**
- Consumes: `useMyHousehold`, `AmountText`, `Card`, `locationLabel`, `locationIcon`
- Produces: `useSavings(): UseQueryResult<SavingWithBalance[]>` (from `savings_with_balance`, ordered `created_at asc`); `useSaving(id: string): UseQueryResult<SavingWithBalance | null>`; `useHouseholdRealtime(householdId: string | undefined): void` — one channel `household:<id>`, listens to `postgres_changes` `*` on `savings`, `transactions`, `household_members`, `households`; on any event invalidates `savings`, `saving`, `transactions`, `members`, `household` query families; removes channel on unmount/id change.

- [ ] **Step 1:** Implement queries and realtime hook; call `useHouseholdRealtime` in `(app)/_layout.tsx`. Also refetch on app foreground (`focusManager` with `AppState`).
- [ ] **Step 2:** Home: header with household name and settings icon; total card (`סה״כ חסכונות`, sum of balances, `AmountText size="xl"`); list of saving cards (icon by location type, purpose bold, `<location label> · <institution>` muted, balance on the end side); pull-to-refresh; FAB `+` → `/saving/new`; empty state `עדיין אין חסכונות` + `הוסף חיסכון ראשון`; loading and error states.
- [ ] **Step 3:** Typecheck, lint, tests → pass. `/preview`: with a test household, insert a saving via SQL Editor/RPC and see it appear on the open home screen without refresh (realtime).
- [ ] **Step 4:** Commit `feat: home screen with savings list and realtime sync`.

---

### Task 8: Create, edit, delete saving

**Files:**
- Create: `src/components/SavingForm.tsx`, `app/(app)/saving/new.tsx`, `app/(app)/saving/[id]/edit.tsx`
- Modify: `src/data/savings.ts`

**Interfaces:**
- Consumes: `validateSavingForm`, `LOCATION_TYPES`, `Chip`, `TextField`, `useSaving`
- Produces: `useCreateSaving(): UseMutationResult<string, Error, SavingInput & { openingAgorot: number }>` (RPC `create_saving`, returns id); `useUpdateSaving(): UseMutationResult<void, Error, { id: string } & SavingInput>`; `useDeleteSaving(): UseMutationResult<void, Error, string>`. All invalidate `savings` (and `saving(id)`).
- `<SavingForm mode: 'create' | 'edit' initial?: SavingWithBalance submitting: boolean onSubmit(value) />` — fields: `למה החיסכון?` (purpose), location type chips with icons, `איפה הכסף? (בנק / קרן)` (institution), `סכום התחלתי` (create only, numeric keyboard), `הערה` (optional).

- [ ] **Step 1:** Implement mutations and `SavingForm` (validation errors under each field from `validateSavingForm`).
- [ ] **Step 2:** `new.tsx` → on success `router.replace('/saving/<id>')`. `edit.tsx` → on success `router.back()`. Delete is triggered from the detail screen (Task 9) via `ConfirmDialog` (`למחוק את החיסכון?` / `כל ההיסטוריה שלו תימחק`), then `router.replace('/')`.
- [ ] **Step 3:** Typecheck, lint, tests → pass. `/preview`: create a saving with opening `1,000`, edit its institution, confirm home shows `1,000 ₪`.
- [ ] **Step 4:** Commit `feat: create and edit savings`.

---

### Task 9: Saving detail, add/withdraw, history, delete

**Files:**
- Create: `app/(app)/saving/[id]/index.tsx`, `src/components/TransactionSheet.tsx`, `src/data/transactions.ts`

**Interfaces:**
- Consumes: `useSaving`, `useDeleteSaving`, `validateTransactionForm`, `todayLocalISO`, `formatDateHe`, `AmountText`, `ConfirmDialog`
- Produces: `useTransactions(savingId: string): UseQueryResult<Transaction[]>` (from `transactions_with_author`, ordered `occurred_on desc, created_at desc`); `useAddTransaction(): UseMutationResult<void, Error, { savingId: string; kind: 'deposit' | 'withdrawal'; amountAgorot: number; occurredOn: string; note: string | null }>`; `useDeleteTransaction(): UseMutationResult<void, Error, { id: string; savingId: string }>` — both invalidate `transactions(savingId)`, `saving(savingId)`, `savings`.
- `<TransactionSheet visible kind balanceAgorot onClose />` — bottom sheet (RN `Modal`, slide), large amount field autofocused with numeric keyboard, date (default today; Android: datetimepicker with `maximumDate` today; web: text field `YYYY-MM-DD`), note; title `הוספת כסף` / `משיכה`; submit `הוסף` / `משוך`; server errors via `toHebrewError`.

- [ ] **Step 1: Failing test** `src/components/__tests__/TransactionSheet.test.tsx` (mock `useAddTransaction`): withdrawal of `600` with `balanceAgorot=50000` shows `אין מספיק כסף בחיסכון` and does not call `mutate`; while `isPending`, pressing submit again does not call `mutate` a second time.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement hooks and sheet. Run test → PASS.
- [ ] **Step 4:** Detail screen: big balance, purpose, `<location> · <institution>`, notes; two prominent buttons `הוסף כסף` (primary) and `משוך` (secondary, disabled at zero balance); history list rows: date (`formatDateHe`), author name, note, signed amount colored, `יתרת פתיחה` label for opening; long-press a row → `ConfirmDialog` `למחוק את הפעולה?`; header menu `עריכה` / `מחיקה`. Empty history impossible (opening exists) — still handle loading/error. If the saving disappears (deleted by partner via realtime), show `החיסכון נמחק` and a button back home.
- [ ] **Step 5:** Typecheck, lint, tests → pass. `/preview` in two browser windows signed in as two members of the same household: deposit in one shows up in the other; withdrawing more than the balance shows the Hebrew error; deleting a deposit that would go negative shows the Hebrew error.
- [ ] **Step 6:** Commit `feat: saving detail with deposits, withdrawals and history`.

---

### Task 10: Settings — household, invite, members, leave, sign out

**Files:**
- Create: `app/(app)/settings.tsx`
- Modify: `src/data/household.ts`

**Interfaces:**
- Consumes: `useMyHousehold`, `useAuth`
- Produces: `useMembers(): UseQueryResult<Member[]>`; `useRenameHousehold()` (`string`); `useRegenerateInviteCode()` (→ `string`); `useRemoveMember()` (`userId`); `useLeaveHousehold()` — on success clears household query so the guard routes to onboarding.

- [ ] **Step 1:** Implement hooks.
- [ ] **Step 2:** Settings screen sections: `משק הבית` (name, editable by owner); `הזמנת בן/בת זוג` (code large and spaced, `שתף` via RN `Share` with Hebrew text including the code, `צור קוד חדש` for owner with confirm); `חברים` (list with `מנהל` badge; owner sees `הסר` on others with confirm); `עזוב את משק הבית` (danger; if last member, double confirm stating all data will be deleted); `התנתק`.
- [ ] **Step 3:** Typecheck, lint, tests → pass; `npm run test:rls` still passes. `/preview`: owner removes a member → the member's open app routes to onboarding.
- [ ] **Step 4:** Commit `feat: settings with invite, members and leave`.

---

### Task 11: Android build

**Files:**
- Create: `eas.json`

No README (user's decision). Build instructions are given to the user in chat.

- [ ] **Step 1:** `eas.json` with a `preview` profile: `android.buildType: "apk"`, `distribution: "internal"`; env vars referenced from EAS secrets/environment (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
- [ ] **Step 2:** Tell the user in chat (Hebrew): `npx eas-cli login`, `npx eas-cli build -p android --profile preview`, how to install the APK link on both phones.
- [ ] **Step 3: USER CHECKPOINT.** With the user, run the preview build; user installs on both phones and confirms sign-in and a deposit sync between them.
- [ ] **Step 4:** Full check: `npm run typecheck && npm run lint && npm test && npm run test:rls` → all pass. Run `code-reviewer` on the whole branch from the first commit.
- [ ] **Step 5:** Commit `chore: eas preview build config`.
