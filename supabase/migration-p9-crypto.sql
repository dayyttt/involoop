-- Migration p9 — USDC on Solana, in both directions.
--
-- Run AFTER migration-p8-lockdown.sql. Safe to run more than once.
--
-- Two directions, and they are not variations of each other:
--
--   Invoice : client wallet   → freelancer wallet   (Involoop never holds it)
--   Plan    : user wallet     → platform wallet     (Involoop IS the payee)
--
-- The difference that matters is what a failed verification means. On an
-- invoice, money moved between two users and Involoop merely failed to write it
-- down. On a plan, someone paid Involoop and received nothing — a debt, which
-- needs somewhere to be seen and settled.

-- ---------------------------------------------------------------------------
-- 1. A payments row must be able to describe a plan purchase.
--
-- It cannot today: invoice_id is NOT NULL, so buying Pro through PayPal writes
-- no payment record at all — no amount, no transaction id, nothing to
-- reconcile. That hole exists right now for PayPal; crypto would make it
-- dangerous, because money on a chain that nothing recorded cannot be traced
-- back to who sent it or what they were owed.
-- ---------------------------------------------------------------------------
alter table payments alter column invoice_id drop not null;

alter table payments add column if not exists purpose text not null default 'invoice'
  check (purpose in ('invoice', 'plan'));
alter table payments add column if not exists user_id uuid references profiles(id) on delete set null;
-- Which plan was bought, stored rather than inferred from the amount: two plans
-- could one day cost the same, and an amount is not an identity.
alter table payments add column if not exists plan_key text
  check (plan_key is null or plan_key in ('starter','pro'));

-- Every row says what it paid for, and carries the thing it paid for.
alter table payments drop constraint if exists payments_target_ck;
alter table payments add constraint payments_target_ck check (
  (purpose = 'invoice' and invoice_id is not null) or
  (purpose = 'plan'    and user_id   is not null)
);

create index if not exists idx_payments_user on payments(user_id) where user_id is not null;
create index if not exists idx_payments_purpose on payments(purpose);

-- ---------------------------------------------------------------------------
-- 2. The freelancer's wallet.
--
-- Verified by signature, never typed in and trusted: this address decides where
-- a client's money lands, so proving control of it is the whole point.
--
-- profiles is read-only to the browser since p8, which matters more here than
-- anywhere else — being able to edit your own row would mean being able to
-- redirect someone else's client's payment.
-- ---------------------------------------------------------------------------
alter table profiles add column if not exists solana_wallet text;
alter table profiles add column if not exists solana_wallet_verified_at timestamptz;

create table if not exists wallet_nonces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  nonce text not null unique,
  wallet_address text not null,
  used_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_wallet_nonces_user on wallet_nonces(user_id);
alter table wallet_nonces enable row level security;
-- No policy: reachable only through the service role in server routes.

-- ---------------------------------------------------------------------------
-- 3. The on-chain half of a payment.
--
-- recipient_wallet is a snapshot taken when the request is created, never read
-- back from the profile at verification time. A freelancer who changes their
-- wallet must not silently change where an already-published invoice pays.
-- ---------------------------------------------------------------------------
create table if not exists crypto_payments (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references payments(id) on delete cascade,
  network text not null,
  token_symbol text not null default 'USDC',
  token_mint text not null,
  token_decimals int not null,
  recipient_wallet text not null,
  expected_amount_minor bigint not null check (expected_amount_minor > 0),
  payment_reference text not null unique,
  transaction_signature text unique,
  payer_wallet text,
  commitment text,
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment','detected','verifying','confirmed','failed','expired')),
  last_error text,
  attempts int not null default 0,
  detected_at timestamptz,
  confirmed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crypto_status on crypto_payments(status)
  where status in ('awaiting_payment','detected','verifying');
create index if not exists idx_crypto_reference on crypto_payments(payment_reference);

alter table crypto_payments enable row level security;
-- No policy. The public invoice page reads it through a server route that
-- returns only what a payer needs; nothing here is browser-readable directly.

-- ---------------------------------------------------------------------------
-- 4. Settling one, in one transaction.
--
-- Both directions land here. The function decides what "paid" means from the
-- payment's own purpose rather than from anything the caller says, and it is
-- safe to call twice: the second call finds the work already done and reports
-- success without repeating it.
-- ---------------------------------------------------------------------------
create or replace function confirm_crypto_payment(
  p_reference text,
  p_signature text,
  p_payer text default null,
  p_commitment text default 'finalized'
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_crypto crypto_payments%rowtype;
  v_payment payments%rowtype;
  v_plan text;
  v_expires timestamptz;
begin
  select * into v_crypto from crypto_payments where payment_reference = p_reference for update;
  if v_crypto.id is null then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  -- Already settled by the webhook, the reconciliation job, or a duplicate
  -- call. Report what happened rather than raising: nothing is wrong.
  if v_crypto.status = 'confirmed' then
    return jsonb_build_object('ok', true, 'already', true, 'signature', v_crypto.transaction_signature);
  end if;

  select * into v_payment from payments where id = v_crypto.payment_id for update;
  if v_payment.id is null then
    raise exception 'PAYMENT_NOT_FOUND';
  end if;

  update crypto_payments set
    status = 'confirmed',
    transaction_signature = p_signature,
    payer_wallet = p_payer,
    commitment = p_commitment,
    confirmed_at = now(),
    detected_at = coalesce(detected_at, now()),
    updated_at = now(),
    last_error = null
  where id = v_crypto.id;

  update payments set
    status = 'succeeded',
    provider_payment_id = p_signature,
    provider_charge_id = p_signature,
    paid_at = now(),
    updated_at = now()
  where id = v_payment.id;

  if v_payment.purpose = 'invoice' then
    update invoices set status = 'paid', paid_at = now()
    where id = v_payment.invoice_id
      and status in ('unpaid', 'payment_pending');

  elsif v_payment.purpose = 'plan' then
    v_plan := v_payment.plan_key;
    if v_plan is null or v_plan not in ('starter', 'pro') then
      raise exception 'UNKNOWN_PLAN';
    end if;
    v_expires := case when v_plan = 'pro' then now() + interval '30 days' else null end;

    update profiles set
      plan = v_plan,
      plan_started_at = now(),
      plan_expires_at = v_expires,
      plan_session_id = null
    where id = v_payment.user_id;
  end if;

  return jsonb_build_object('ok', true, 'already', false, 'purpose', v_payment.purpose);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. What an operator needs to see: money that arrived and was not delivered.
--
-- For an invoice that is an inconvenience. For a plan it is a debt, so both are
-- surfaced, and the plan ones first.
-- ---------------------------------------------------------------------------
create or replace function admin_unmatched_payments(p_actor uuid)
returns jsonb
language plpgsql
security definer
as $$
declare v_actor profiles%rowtype;
begin
  v_actor := assert_admin(p_actor);
  return (
    select coalesce(jsonb_agg(to_jsonb(x) order by x.rank, x.created_at desc), '[]'::jsonb)
    from (
      -- Paid for a plan, but the account is still on free.
      select 1 as rank,
             'plan_not_granted' as issue,
             p.id as payment_id,
             pr.email as who,
             p.amount_minor, p.currency, p.provider,
             c.transaction_signature, c.network,
             p.created_at
      from payments p
      join profiles pr on pr.id = p.user_id
      left join crypto_payments c on c.payment_id = p.id
      where p.purpose = 'plan' and p.status = 'succeeded' and pr.plan = 'free'

      union all

      -- Money confirmed on chain, invoice still not marked paid.
      select 2, 'invoice_not_paid',
             p.id, pr.email,
             p.amount_minor, p.currency, p.provider,
             c.transaction_signature, c.network,
             p.created_at
      from payments p
      join crypto_payments c on c.payment_id = p.id
      join invoices i on i.id = p.invoice_id
      join profiles pr on pr.id = i.owner_id
      where c.status = 'confirmed' and i.status <> 'paid'

      union all

      -- Stuck mid-flight for over an hour: the chain moved on, we did not.
      select 3, 'stuck_verifying',
             p.id, coalesce(pr.email, '—'),
             p.amount_minor, p.currency, p.provider,
             c.transaction_signature, c.network,
             p.created_at
      from crypto_payments c
      join payments p on p.id = c.payment_id
      left join invoices i on i.id = p.invoice_id
      left join profiles pr on pr.id = coalesce(i.owner_id, p.user_id)
      where c.status in ('detected','verifying')
        and c.updated_at < now() - interval '1 hour'
    ) x
  );
end;
$$;

revoke execute on function public.confirm_crypto_payment    from public, anon, authenticated;
revoke execute on function public.admin_unmatched_payments  from public, anon, authenticated;
