-- Savings tracker: initial schema, RLS, functions.
-- Money is integer agorot (bigint). Balance = opening + deposits - withdrawals, never negative.

create extension if not exists pgcrypto with schema extensions;

-- ───────────────────────── Types ─────────────────────────
create type public.location_type as enum (
  'bank_account', 'deposit', 'money_market_fund', 'provident_fund', 'study_fund', 'other'
);
create type public.transaction_kind as enum ('opening', 'deposit', 'withdrawal');
create type public.member_role as enum ('owner', 'member');

-- ───────────────────────── Helpers ─────────────────────────
-- 8 chars from a 32-symbol alphabet without look-alikes (no I, O, 0, 1).
create or replace function public.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = public, extensions
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(8);
  code text := '';
begin
  for i in 0..7 loop
    code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return code;
end;
$$;

-- ───────────────────────── Tables ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  created_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 60),
  invite_code text not null unique default public.generate_invite_code(),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  role public.member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.savings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  purpose text not null check (char_length(trim(purpose)) between 1 and 80),
  location_type public.location_type not null,
  institution text not null check (char_length(trim(institution)) between 1 and 80),
  notes text check (notes is null or char_length(notes) <= 500),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index savings_household_idx on public.savings (household_id);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  saving_id uuid not null references public.savings (id) on delete cascade,
  kind public.transaction_kind not null,
  amount_agorot bigint not null,
  occurred_on date not null default current_date,
  note text check (note is null or char_length(note) <= 200),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint amount_positive check (amount_agorot >= 0 and (kind = 'opening' or amount_agorot > 0)),
  constraint amount_max check (amount_agorot <= 99999999999)
);
create index transactions_saving_idx on public.transactions (saving_id, occurred_on desc, created_at desc);
create unique index transactions_one_opening on public.transactions (saving_id) where kind = 'opening';

-- ───────────────────────── Membership helper ─────────────────────────
-- SECURITY DEFINER so policies can call it without recursing into household_members RLS.
create or replace function public.my_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.household_members where user_id = auth.uid()
$$;

-- ───────────────────────── Triggers ─────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'משתמש'), 60)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger savings_touch_updated_at
  before update on public.savings
  for each row execute function public.touch_updated_at();

-- Blocks any insert/delete that would make a saving's balance negative.
-- Locks the saving row so two phones cannot withdraw concurrently past zero.
-- If the saving row is gone, this is a cascade from deleting the saving: allow.
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

  select coalesce(sum(case when kind = 'withdrawal' then -amount_agorot else amount_agorot end), 0)
    into v_balance
    from public.transactions
   where saving_id = v_saving;

  if tg_op = 'INSERT' then
    v_delta := case when new.kind = 'withdrawal' then -new.amount_agorot else new.amount_agorot end;
  else
    v_delta := case when old.kind = 'withdrawal' then old.amount_agorot else -old.amount_agorot end;
  end if;

  if v_balance + v_delta < 0 then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  if tg_op = 'INSERT' then return new; end if;
  return old;
end;
$$;

create trigger transactions_guard_balance
  before insert or delete on public.transactions
  for each row execute function public.guard_balance();

-- ───────────────────────── Views ─────────────────────────
create view public.savings_with_balance
with (security_invoker = true) as
select
  s.*,
  coalesce((
    select sum(case when t.kind = 'withdrawal' then -t.amount_agorot else t.amount_agorot end)
      from public.transactions t
     where t.saving_id = s.id
  ), 0)::bigint as balance_agorot
from public.savings s;

create view public.transactions_with_author
with (security_invoker = true) as
select t.*, p.display_name as author_name
from public.transactions t
left join public.profiles p on p.id = t.created_by;

-- ───────────────────────── RLS ─────────────────────────
alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.savings enable row level security;
alter table public.transactions enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or id in (select m.user_id from public.household_members m where m.household_id = public.my_household_id())
  );
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy households_select on public.households
  for select to authenticated
  using (id = public.my_household_id());
create policy households_update on public.households
  for update to authenticated
  using (
    id = public.my_household_id()
    and exists (
      select 1 from public.household_members m
       where m.household_id = households.id and m.user_id = auth.uid() and m.role = 'owner'
    )
  )
  with check (id = public.my_household_id());
-- Only the name may be changed directly; invite codes go through regenerate_invite_code().
revoke update on public.households from authenticated, anon;
grant update (name) on public.households to authenticated;

-- household_members: read-only to clients. Joining/leaving happens through functions below.
create policy household_members_select on public.household_members
  for select to authenticated
  using (household_id = public.my_household_id());

create policy savings_select on public.savings
  for select to authenticated
  using (household_id = public.my_household_id());
create policy savings_insert on public.savings
  for insert to authenticated
  with check (household_id = public.my_household_id());
create policy savings_update on public.savings
  for update to authenticated
  using (household_id = public.my_household_id())
  with check (household_id = public.my_household_id());
create policy savings_delete on public.savings
  for delete to authenticated
  using (household_id = public.my_household_id());

create policy transactions_select on public.transactions
  for select to authenticated
  using (exists (
    select 1 from public.savings s where s.id = transactions.saving_id and s.household_id = public.my_household_id()
  ));
create policy transactions_insert on public.transactions
  for insert to authenticated
  with check (
    kind <> 'opening'
    and created_by = auth.uid()
    and exists (
      select 1 from public.savings s where s.id = transactions.saving_id and s.household_id = public.my_household_id()
    )
  );
create policy transactions_delete on public.transactions
  for delete to authenticated
  using (exists (
    select 1 from public.savings s where s.id = transactions.saving_id and s.household_id = public.my_household_id()
  ));
-- No UPDATE policy on transactions: editing = delete + add.

-- ───────────────────────── RPCs ─────────────────────────
create or replace function public.create_household(p_name text)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_h public.households;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if exists (select 1 from public.household_members where user_id = v_uid) then
    raise exception 'ALREADY_IN_HOUSEHOLD';
  end if;
  insert into public.households (name, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'הבית שלנו'), v_uid)
  returning * into v_h;
  insert into public.household_members (household_id, user_id, role) values (v_h.id, v_uid, 'owner');
  return v_h;
end;
$$;

create or replace function public.join_household(p_code text)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_h public.households;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if exists (select 1 from public.household_members where user_id = v_uid) then
    raise exception 'ALREADY_IN_HOUSEHOLD';
  end if;
  select * into v_h from public.households where invite_code = upper(trim(coalesce(p_code, '')));
  if not found then raise exception 'INVALID_INVITE_CODE'; end if;
  insert into public.household_members (household_id, user_id, role) values (v_h.id, v_uid, 'member');
  return v_h;
end;
$$;

create or replace function public.create_saving(
  p_purpose text,
  p_location_type public.location_type,
  p_institution text,
  p_notes text,
  p_opening_agorot bigint
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
  insert into public.savings (household_id, purpose, location_type, institution, notes, created_by)
  values (v_hid, trim(p_purpose), p_location_type, trim(p_institution), nullif(trim(coalesce(p_notes, '')), ''), v_uid)
  returning id into v_id;
  insert into public.transactions (saving_id, kind, amount_agorot, occurred_on, created_by)
  values (v_id, 'opening', coalesce(p_opening_agorot, 0), current_date, v_uid);
  return v_id;
end;
$$;

create or replace function public.assert_owner()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_hid uuid := public.my_household_id();
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if v_hid is null then raise exception 'NOT_IN_HOUSEHOLD'; end if;
  if not exists (
    select 1 from public.household_members where user_id = auth.uid() and household_id = v_hid and role = 'owner'
  ) then
    raise exception 'NOT_OWNER';
  end if;
  return v_hid;
end;
$$;

create or replace function public.regenerate_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hid uuid := public.assert_owner();
  v_code text;
begin
  update public.households set invite_code = public.generate_invite_code() where id = v_hid
  returning invite_code into v_code;
  return v_code;
end;
$$;

create or replace function public.remove_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hid uuid := public.assert_owner();
begin
  if p_user_id = auth.uid() then raise exception 'CANNOT_REMOVE_SELF'; end if;
  delete from public.household_members where household_id = v_hid and user_id = p_user_id;
end;
$$;

-- p_confirm_delete must be true when the caller is the last member: the server, not a
-- possibly stale client list, decides whether leaving deletes the household.
create or replace function public.leave_household(p_confirm_delete boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hid uuid := public.my_household_id();
  v_role public.member_role;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if v_hid is null then raise exception 'NOT_IN_HOUSEHOLD'; end if;
  -- Serialize concurrent leaves/removals in this household so it can't end up memberless.
  perform 1 from public.households where id = v_hid for update;
  if not coalesce(p_confirm_delete, false) and not exists (
    select 1 from public.household_members where household_id = v_hid and user_id <> v_uid
  ) then
    raise exception 'LAST_MEMBER';
  end if;
  select role into v_role from public.household_members where user_id = v_uid;
  delete from public.household_members where user_id = v_uid;
  if not exists (select 1 from public.household_members where household_id = v_hid) then
    delete from public.households where id = v_hid;
  elsif v_role = 'owner' then
    update public.household_members set role = 'owner'
     where household_id = v_hid
       and user_id = (
         select user_id from public.household_members
          where household_id = v_hid
          order by joined_at, user_id
          limit 1
       );
  end if;
end;
$$;

-- Function access: signed-in users only.
revoke execute on function
  public.create_household(text),
  public.join_household(text),
  public.create_saving(text, public.location_type, text, text, bigint),
  public.assert_owner(),
  public.regenerate_invite_code(),
  public.remove_member(uuid),
  public.leave_household(boolean),
  public.my_household_id()
from public, anon;
grant execute on function
  public.create_household(text),
  public.join_household(text),
  public.create_saving(text, public.location_type, text, text, bigint),
  public.regenerate_invite_code(),
  public.remove_member(uuid),
  public.leave_household(boolean),
  public.my_household_id()
to authenticated;

-- ───────────────────────── Realtime ─────────────────────────
alter publication supabase_realtime add table
  public.savings, public.transactions, public.household_members, public.households;
