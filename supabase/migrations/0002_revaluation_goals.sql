-- Revaluation (gain/loss transactions) and optional goals on savings.
-- Safe on a live database: only adds; no data is changed or removed.
-- New enum values can't be referenced as enum literals in the same transaction,
-- so comparisons below use kind::text.

alter type public.transaction_kind add value if not exists 'gain';
alter type public.transaction_kind add value if not exists 'loss';

-- ───────────── Goals ─────────────
alter table public.savings
  add column if not exists goal_agorot bigint,
  add column if not exists goal_date date;

-- drop-if-exists keeps the script re-runnable
alter table public.savings drop constraint if exists savings_goal_amount;
alter table public.savings drop constraint if exists savings_goal_date_needs_amount;
alter table public.savings
  add constraint savings_goal_amount check (goal_agorot is null or (goal_agorot > 0 and goal_agorot <= 99999999999)),
  add constraint savings_goal_date_needs_amount check (goal_date is null or goal_agorot is not null);

-- ───────────── Balance guard: loss reduces the balance like a withdrawal ─────────────
create or replace function public.guard_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_saving uuid;
  v_balance bigint;
  v_delta bigint;
begin
  if tg_op = 'INSERT' then
    v_saving := new.saving_id;
    -- BEFORE triggers run before RLS WITH CHECK. For a saving outside the caller's household,
    -- step aside and let RLS reject the row, so the error never reveals the other balance.
    if auth.uid() is not null and not exists (
      select 1 from public.savings s where s.id = new.saving_id and s.household_id = public.my_household_id()
    ) then
      return new;
    end if;
    if new.occurred_on > current_date + 1 then
      raise exception 'INVALID_DATE';
    end if;
  else
    v_saving := old.saving_id;
  end if;

  perform 1 from public.savings where id = v_saving for update;
  if not found then
    if tg_op = 'INSERT' then return new; end if;
    return old;
  end if;

  select coalesce(sum(case when kind::text in ('withdrawal', 'loss') then -amount_agorot else amount_agorot end), 0)
    into v_balance
    from public.transactions
   where saving_id = v_saving;

  if tg_op = 'INSERT' then
    v_delta := case when new.kind::text in ('withdrawal', 'loss') then -new.amount_agorot else new.amount_agorot end;
  else
    v_delta := case when old.kind::text in ('withdrawal', 'loss') then old.amount_agorot else -old.amount_agorot end;
  end if;

  if v_balance + v_delta < 0 then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  if tg_op = 'INSERT' then return new; end if;
  return old;
end;
$$;

-- ───────────── View: balance + cumulative gains (recreated: column list changed) ─────────────
drop view if exists public.savings_with_balance;
create view public.savings_with_balance
with (security_invoker = true) as
select
  s.*,
  coalesce((
    select sum(case when t.kind::text in ('withdrawal', 'loss') then -t.amount_agorot else t.amount_agorot end)
      from public.transactions t
     where t.saving_id = s.id
  ), 0)::bigint as balance_agorot,
  coalesce((
    select sum(case when t.kind::text = 'loss' then -t.amount_agorot else t.amount_agorot end)
      from public.transactions t
     where t.saving_id = s.id and t.kind::text in ('gain', 'loss')
  ), 0)::bigint as gains_agorot
from public.savings s;

grant select on public.savings_with_balance to authenticated;

-- ───────────── create_saving: goals + client-local opening date ─────────────
drop function if exists public.create_saving(text, public.location_type, text, text, bigint);

create or replace function public.create_saving(
  p_purpose text,
  p_location_type public.location_type,
  p_institution text,
  p_notes text,
  p_opening_agorot bigint,
  p_goal_agorot bigint default null,
  p_goal_date date default null,
  p_opened_on date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hid uuid := public.my_household_id();
  v_id uuid;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if v_hid is null then raise exception 'NOT_IN_HOUSEHOLD'; end if;
  insert into public.savings (household_id, purpose, location_type, institution, notes, goal_agorot, goal_date, created_by)
  values (
    v_hid, trim(p_purpose), p_location_type, trim(p_institution), nullif(trim(coalesce(p_notes, '')), ''),
    p_goal_agorot, p_goal_date, v_uid
  )
  returning id into v_id;
  -- The opening date is the device's local date; guard_balance rejects anything past current_date + 1.
  insert into public.transactions (saving_id, kind, amount_agorot, occurred_on, created_by)
  values (v_id, 'opening', coalesce(p_opening_agorot, 0), coalesce(p_opened_on, current_date), v_uid);
  return v_id;
end;
$$;

revoke execute on function
  public.create_saving(text, public.location_type, text, text, bigint, bigint, date, date)
from public, anon;
grant execute on function
  public.create_saving(text, public.location_type, text, text, bigint, bigint, date, date)
to authenticated;
