-- Involoop database schema
-- Run this in Supabase SQL editor after creating your project.

-- Profiles: extends Supabase auth.users with app-specific fields
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  referral_code text unique not null default substr(md5(random()::text), 1, 8),
  referred_by uuid references profiles(id),
  free_invoice_credits int not null default 3,
  created_at timestamptz not null default now()
);

-- Invoices: the core object. public_id is what appears in the shareable URL.
create table invoices (
  id uuid primary key default gen_random_uuid(),
  public_id text unique not null default substr(md5(random()::text || clock_timestamp()::text), 1, 10),
  number text unique not null default 'INV-' || to_char(now(), 'YYYY') || '-' || upper(substr(md5(random()::text), 1, 4)),
  owner_id uuid not null references profiles(id) on delete cascade,
  client_name text not null,
  description text not null,
  amount numeric(12,2) not null,
  currency text not null default 'IDR',
  due_date date,
  cta_message text, -- AI-generated, context-aware referral line
  status text not null default 'unpaid' check (status in ('unpaid','awaiting_verification','paid')),
  views int not null default 0,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- Referrals: tracks the A -> B loop. referred_user_id is unique so one user
-- can only ever generate one reward — refresh/double-submit cannot double-pay.
create table referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references profiles(id) on delete cascade,
  referred_user_id uuid unique references profiles(id) on delete cascade,
  source_invoice_id uuid references invoices(id) on delete set null,
  status text not null default 'clicked' check (status in ('clicked','signed_up','rewarded')),
  reward_credits int not null default 3,
  created_at timestamptz not null default now(),
  converted_at timestamptz
);

-- Credit ledger: authoritative record of every credit movement.
create table credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  amount int not null,
  type text not null check (type in ('signup','referral_bonus','referral','invoice_published')),
  reference text,
  referral_id uuid references referrals(id) on delete set null,
  idempotency_key text unique not null,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table profiles enable row level security;
alter table credit_ledger enable row level security;
alter table invoices enable row level security;
alter table referrals enable row level security;

create policy "profiles_self" on profiles for select using (auth.uid() = id);
create policy "profiles_self_update" on profiles for update using (auth.uid() = id);
create policy "ledger_self" on credit_ledger for select using (auth.uid() = user_id);
create policy "invoices_owner" on invoices for all using (auth.uid() = owner_id);
create policy "referrals_referrer" on referrals for select using (auth.uid() = referrer_id);

create index idx_invoices_public_id on invoices(public_id);
create index idx_referrals_referrer on referrals(referrer_id);
create index idx_ledger_user on credit_ledger(user_id);

-- Signup: create profile, award base + referral bonus credits, log ledger
-- entries, and reward the referrer — all in one transaction so a partial
-- failure can never leave half a loop behind.
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
    where public_id = p_ref_invoice_public_id
      and owner_id <> p_user_id  -- self-referral is rejected
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
      update profiles set free_invoice_credits = free_invoice_credits + 3
      where id = v_referrer;

      insert into credit_ledger (user_id, amount, type, reference, referral_id, idempotency_key)
      values (v_referrer, 3, 'referral',
              'Referral dari ' || coalesce(v_inv_number, 'invoice'),
              v_reward, 'referral_' || p_user_id);
    end if;
  end if;

  return jsonb_build_object(
    'user_id', p_user_id,
    'credits', (select free_invoice_credits from profiles where id = p_user_id),
    'rewarded_referrer', (v_reward is not null)
  );
end;
$$;

-- Publish an invoice: deduct one credit and log it atomically. Raises an
-- exception the API maps to a friendly message.
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
  if v_credits is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;
  if v_credits <= 0 then
    raise exception 'NO_CREDITS';
  end if;

  v_number := 'INV-' || to_char(now(), 'YYYY') || '-' ||
              lpad((select count(*) + 1 from invoices where owner_id = p_owner_id)::text, 3, '0');

  insert into invoices (owner_id, client_name, description, amount, currency, due_date, cta_message, number)
  values (p_owner_id, p_client_name, p_description, p_amount, p_currency, p_due_date, p_cta_message, v_number)
  returning * into v_invoice;

  update profiles set free_invoice_credits = free_invoice_credits - 1
  where id = p_owner_id;

  insert into credit_ledger (user_id, amount, type, reference, idempotency_key)
  values (p_owner_id, -1, 'invoice_published', 'Publikasi ' || v_number, 'publish_' || v_invoice.id);

  return row_to_json(v_invoice)::jsonb;
end;
$$;
