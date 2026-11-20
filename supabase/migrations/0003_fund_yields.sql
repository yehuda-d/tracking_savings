-- Link savings to a Gemel-Net fund and apply official monthly returns atomically.
-- Safe on a live database: only adds; no data is changed or removed. Re-runnable.

alter table public.savings
  add column if not exists fund_id integer,
  add column if not exists fund_name text,
  add column if not exists fund_synced_through integer;

alter table public.savings drop constraint if exists savings_fund_name_len;
alter table public.savings drop constraint if exists savings_fund_synced_format;
alter table public.savings
  add constraint savings_fund_name_len check (fund_name is null or char_length(fund_name) <= 200),
  add constraint savings_fund_synced_format check (
    fund_synced_through is null or (fund_synced_through between 199001 and 299912 and fund_synced_through % 100 between 1 and 12)
  );

-- The view lists s.*, so it must be recreated to expose the new columns.
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

-- Records the official return (gain/loss) and advances fund_synced_through in one transaction.
-- p_kind null / p_amount 0 = "already updated": only advance the marker.
-- Raises ALREADY_APPLIED if another tap (e.g. the partner's phone) got there first.
create or replace function public.apply_fund_yield(
  p_saving_id uuid,
  p_through integer,
  p_kind text,
  p_amount bigint,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_synced integer;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select fund_synced_through into v_synced
    from public.savings
   where id = p_saving_id and household_id = public.my_household_id()
   for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_synced is not null and p_through <= v_synced then raise exception 'ALREADY_APPLIED'; end if;

  if coalesce(p_amount, 0) > 0 then
    if p_kind not in ('gain', 'loss') then raise exception 'INVALID_KIND'; end if;
    insert into public.transactions (saving_id, kind, amount_agorot, occurred_on, note, created_by)
    values (p_saving_id, p_kind::public.transaction_kind, p_amount, current_date, nullif(trim(coalesce(p_note, '')), ''), v_uid);
  end if;

  update public.savings set fund_synced_through = p_through where id = p_saving_id;
end;
$$;

revoke execute on function public.apply_fund_yield(uuid, integer, text, bigint, text) from public, anon;
grant execute on function public.apply_fund_yield(uuid, integer, text, bigint, text) to authenticated;
