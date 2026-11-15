# Revaluation & Goals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** Add "עדכון שווי" (gain/loss transactions) and optional per-saving goals.

**Architecture:** New enum values `gain`/`loss` (positive amounts, direction by kind) reuse the balance trigger and views; goals are two nullable columns on `savings`. All math lives in pure TS functions under `src/lib` with unit tests; UI composes them.

**Tech Stack:** as before (Expo SDK 58, Supabase, TanStack Query, jest-expo).

**Spec:** `docs/superpowers/specs/2026-11-15-revaluation-and-goals-design.md` (and the original spec for global rules).

## Global Constraints

- Every constraint from `docs/superpowers/plans/2026-11-14-savings-tracker.md` still applies: agorot integers, Hebrew-only UI, RTL helpers, pending-disabled buttons, loading/error states.
- Negative kinds are exactly `withdrawal` and `loss`. Everything else (`opening`, `deposit`, `gain`) adds to the balance.
- Migration 0002 must be safe to run on the live DB with existing data and must not delete data.

## Review Focus

1. Revaluation to the same value → Hebrew error, no row written. → Task 1 test.
2. Revaluation to 0 (fund wiped out) → accepted as a loss equal to the balance. → Task 1 test.
3. Goal date set without goal amount → rejected in the form and by a DB check. → Task 1 test + RLS case.
4. Goal date in the past / this month → monthly amount never divides by zero; past date shows "תאריך היעד עבר". → Task 1 tests.
5. Deleting a `gain` that would make the balance negative → `INSUFFICIENT_BALANCE`. → RLS case.

---

### Task 1: Pure logic (TDD)

**Files:**
- Modify: `src/lib/types.ts`, `src/lib/money.ts`, `src/lib/validation.ts`
- Create: `src/lib/goals.ts`
- Test: `src/lib/__tests__/money.test.ts`, `validation.test.ts`, `goals.test.ts`

**Interfaces (produced):**
- `TransactionKind = 'opening' | 'deposit' | 'withdrawal' | 'gain' | 'loss'`
- `isNegativeKind(kind: TransactionKind): boolean` in `money.ts`
- `formatSignedAgorot`: `gain` → `+`, `loss` → `−`
- `SavingInput` gains `goal_agorot: number | null; goal_date: string | null`
- `SavingWithBalance` gains `gains_agorot: number`
- `validateSavingForm` accepts `goalInput?: string; goalDateInput?: string`. Errors use the keys `goal` and `goalDate`.
- `validateRevaluationForm({ valueInput, occurredOn, balanceAgorot, today }): ValidationResult<{ kind: 'gain' | 'loss'; amountAgorot: number; occurredOn: string }>`. `valueInput` may be `"0"`. If the value equals the balance → `errors.value = 'השווי זהה ליתרה הנוכחית'`.
- `goalProgress(balanceAgorot: number, goalAgorot: number, goalDate: string | null, today: string): { percent: number; remainingAgorot: number; reached: boolean; monthsLeft: number | null; monthlyAgorot: number | null; overdue: boolean }`
  - `percent` = floor(balance / goal × 100), capped at 100.
  - `monthsLeft` = whole calendar months from `today` to `goalDate`, rounded up, minimum 1. It is `null` when there is no date or when the date has passed.
  - `monthlyAgorot` = ceil(remaining / monthsLeft). It is `null` when reached or when `monthsLeft` is null.
  - `overdue` = the date has passed and the goal is not reached.

- [ ] Write failing tests:
  - **money:** `formatSignedAgorot(124000, 'gain') === '+1,240 ₪'`, `(30000, 'loss') === '−300 ₪'`; `isNegativeKind`.
  - **validation:** revaluation gain, loss, to-zero, same-value, bad input and future date; saving goal with 400,000 + date `2028-06-01`; empty goal → `null`s; date without goal → `goalDate` error; goal `abc` → `goal` error.
  - **goals:** 47% case; reached (balance ≥ goal → percent 100, monthly null); `today='2026-11-15'`, `date='2027-11-15'` → 12 months; `date='2026-11-20'` → 1 month; past date → overdue; `monthlyAgorot` rounding up.
- [ ] Run → FAIL. Implement. Run → PASS. Then typecheck and lint. Commit `feat: revaluation and goal logic`.

### Task 2: Migration 0002 + RLS cases

**Files:**
- Create: `supabase/migrations/0002_revaluation_goals.sql`
- Modify: `scripts/rls-test.ts`

- [ ] **SQL:**
  - `alter type ... add value if not exists 'gain'`, then the same for `'loss'`.
  - `alter table savings add column goal_agorot bigint`, plus `goal_date date`, plus checks: `goal_agorot is null or (goal_agorot > 0 and goal_agorot <= 99999999999)`, and `goal_date is null or goal_agorot is not null`.
  - Replace `guard_balance`: negative when `kind::text in ('withdrawal','loss')`.
  - Drop and recreate `savings_with_balance` with `security_invoker` and `gains_agorot`. Use `kind::text` comparisons throughout.
  - Drop the old `create_saving(text, location_type, text, text, bigint)`. Create `create_saving(p_purpose, p_location_type, p_institution, p_notes, p_opening_agorot, p_goal_agorot bigint default null, p_goal_date date default null, p_opened_on date default null)`. The opening date is `coalesce(p_opened_on, current_date)`, and the trigger enforces `<= current_date + 1`. Grant it to `authenticated` only.
- [ ] **RLS cases to add:**
  - gain 10000 and loss 4000 change both the balance and `gains_agorot`.
  - A loss larger than the balance → `INSUFFICIENT_BALANCE`.
  - Deleting a gain that would go negative → `INSUFFICIENT_BALANCE`.
  - `create_saving` with goal and date round-trips.
  - An update setting `goal_date` without `goal_agorot` → error.
- [ ] **USER CHECKPOINT:** the user pastes 0002 into the SQL Editor. Then run `npm run test:rls` → all pass. Commit `feat: db support for revaluation and goals`.

### Task 3: UI

**Files:**
- Create: `src/components/DateField.tsx`, `src/components/GoalProgress.tsx`
- Modify: `src/components/TransactionSheet.tsx` (adds `kind: 'revalue'` mode), `src/components/SavingForm.tsx`, `src/data/transactions.ts` (`AddTransactionInput.kind` adds `gain` and `loss`), `src/data/savings.ts` (create/update pass goals and `p_opened_on`), `src/app/(app)/index.tsx`, `src/app/(app)/saving/[id].tsx`
- Test: `src/components/__tests__/TransactionSheet.test.tsx`

- [ ] **Failing test:** in revalue mode with balance 50000, typing `"512.40"` shows the text `"רווח של"` and submits `{ kind: 'gain', amountAgorot: 1240 }`. Typing `"500"` shows `"השווי זהה ליתרה הנוכחית"` and does not submit.
- [ ] **Implement:**
  - `DateField({ label, value, onChange, minimumDate?, maximumDate?, error? })`: native date picker on Android, text field on web. The sheet uses it.
  - `SavingForm`: "+ הוספת יעד" and "הסרת יעד".
  - Home card: progress bar.
  - Detail screen: third button "עדכון שווי", goal card, gains line, and history labels and icons for gain/loss.
- [ ] Run tests, typecheck and lint → pass. Do a live web check with a temporary user (create a saving with a goal, revalue up and down, check the gains line and the progress), then delete the temporary user. Commit `feat: revaluation and goals UI`.

### Task 4: Ship

- [ ] Run `code-reviewer` on the range. Fix Critical/Important findings with tests.
- [ ] Bump `version` in `app.json` to `1.1.0`.
- [ ] `eas build -p android --profile preview`, then send the link to the user.
- [ ] Push to GitHub after the user confirms.
