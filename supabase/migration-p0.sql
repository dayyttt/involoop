-- Upgrade existing Involoop production database to P0 revision.
-- Run ONCE in Supabase SQL Editor. Safe for existing profiles/invoices/referrals.

alter table invoices
  add column if not exists number text,
  add column if not exists views int not null default 0;

update invoices
set number = 'INV-' || to_char(created_at, 'YYYY') || '-' || upper(substr(id::text, 1, 4))
where number is null;

alter table invoices alter column number set not null;
create unique index if not exists invoices_number_key on invoices(number);

alter table invoices drop constraint if exists invoices_status_check;
alter table invoices add constraint invoices_status_check
  check (status in ('unpaid','awaiting_verification','paid'));

-- Rename old referral field if it exists.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'referrals' and column_name = 'referred_id'
  ) then
    alter table referrals rename column referred_id to referred_user_id;
  end if;
end $$;

-- Existing duplicate referrals: keep oldest before adding uniqueness.
delete from referrals a
using referrals b
where a.referred_user_id = b.referred_user_id
  and a.referred_user_id is not null
  and a.created_at > b.created_at;

create unique index if not exists referrals_referred_user_key
  on referrals(referred_user_id) where referred_user_id is not null;

create table if not exists credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  amount int not null,
  type text not null check (type in ('signup','referral_bonus','referral','invoice_published')),
  reference text,
  referral_id uuid references referrals(id) on delete set null,
  idempotency_key text unique not null,
  created_at timestamptz not null default now()
);

alter table credit_ledger enable row level security;
drop policy if exists "ledger_self" on credit_ledger;
create policy "ledger_self" on credit_ledger for select using (auth.uid() = user_id);
create index if not exists idx_ledger_user on credit_ledger(user_id);

-- Seed audit history for existing users with a current-balance snapshot.
insert into credit_ledger (user_id, amount, type, reference, idempotency_key)
select id, free_invoice_credits, 'signup', 'Saldo sebelum ledger', 'legacy_balance_' || id
from profiles
on conflict (idempotency_key) do nothing;

create or replace function finalize_signup(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_ref_invoice_public_id text default null
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_referrer uuid := null;
  v_invoice uuid := null;
  v_bonus int := 0;
  v_reward uuid := null;
  v_inv_number text := null;
begin
  if p_ref_invoice_public_id is not null then
    select id, owner_id, number into v_invoice, v_referrer, v_inv_number
    from invoices
    where public_id = p_ref_invoice_public_id and owner_id <> p_user_id
    limit 1;
  end if;

  v_bonus := case when v_referrer is not null then 2 else 0 end;

  insert into profiles (id, email, full_name, referred_by, free_invoice_credits)
  values (p_user_id, lower(p_email), p_full_name, v_referrer, 3 + v_bonus);

  insert into credit_ledger (user_id, amount, type, reference, idempotency_key)
  values (p_user_id, 3, 'signup', 'Kredit awal', 'signup_' || p_user_id);

  if v_bonus > 0 then
    insert into credit_ledger (user_id, amount, type, reference, idempotency_key)
    values (p_user_id, v_bonus, 'referral_bonus', 'Bonus bergabung melalui invoice', 'referral_bonus_' || p_user_id);
  end if;

  if v_referrer is not null then
    insert into referrals (referrer_id, referred_user_id, source_invoice_id, status, reward_credits, converted_at)
    values (v_referrer, p_user_id, v_invoice, 'rewarded', 3, now())
    on conflict do nothing
    returning id into v_reward;

    if v_reward is not null then
      update profiles set free_invoice_credits = free_invoice_credits + 3 where id = v_referrer;
      insert into credit_ledger (user_id, amount, type, reference, referral_id, idempotency_key)
      values (v_referrer, 3, 'referral', 'Referral dari ' || coalesce(v_inv_number, 'invoice'), v_reward, 'referral_' || p_user_id);
    end if;
  end if;

  return jsonb_build_object('user_id', p_user_id, 'credits',
    (select free_invoice_credits from profiles where id = p_user_id),
    'rewarded_referrer', (v_reward is not null));
end;
$$;

create or replace function publish_invoice(
  p_owner_id uuid,
  p_client_name text,
  p_description text,
  p_amount numeric,
  p_currency text default 'IDR',
  p_due_date date default null,
  p_cta_message text default null
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_credits int;
  v_number text;
  v_invoice invoices%rowtype;
begin
  select free_invoice_credits into v_credits from profiles where id = p_owner_id;
  if v_credits is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  if v_credits <= 0 then raise exception 'NO_CREDITS'; end if;

  v_number := 'INV-' || to_char(now(), 'YYYY') || '-' ||
              lpad((select count(*) + 1 from invoices where owner_id = p_owner_id)::text, 3, '0');

  insert into invoices (owner_id, client_name, description, amount, currency, due_date, cta_message, number)
  values (p_owner_id, p_client_name, p_description, p_amount, p_currency, p_due_date, p_cta_message, v_number)
  returning * into v_invoice;

  update profiles set free_invoice_credits = free_invoice_credits - 1 where id = p_owner_id;
  insert into credit_ledger (user_id, amount, type, reference, idempotency_key)
  values (p_owner_id, -1, 'invoice_published', 'Publikasi ' || v_number, 'publish_' || v_invoice.id);

  return row_to_json(v_invoice)::jsonb;
end;
$$;
