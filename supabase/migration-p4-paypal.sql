-- Migration p4 — PayPal replaces Stripe as the payment rail.
--
-- Run this AFTER migration-p3-invoice-crud.sql. Safe to run more than once.
--
-- The payments and webhook_events tables were already provider-neutral
-- (provider, provider_session_id, provider_payment_id, provider_charge_id,
-- provider_event_id), so nothing about how a payment is recorded changes. Only
-- the freelancer's payout identity does: Stripe Connect issued an account id
-- that Involoop stored, whereas PayPal is addressed by the email the account is
-- registered to.

-- ---------------------------------------------------------------------------
-- 1. Where a freelancer's money arrives.
--
-- Involoop never holds funds: an invoice order names this address as the payee,
-- so the client pays the freelancer directly. Empty means no PayPal button and
-- the invoice offers bank transfer confirmation only.
-- ---------------------------------------------------------------------------
alter table profiles add column if not exists paypal_email text;

-- New rows are PayPal unless something says otherwise. Existing rows keep the
-- provider they were actually created with, because a historical Stripe payment
-- was a Stripe payment and relabelling it would make the ledger lie.
alter table payments alter column provider set default 'paypal';
alter table webhook_events alter column provider set default 'paypal';

-- ---------------------------------------------------------------------------
-- 2. Stripe Connect columns are gone.
--
-- Nothing reads stripe_account_id or stripe_status any more: the connect route
-- and lib/stripe.ts were deleted with this change. Dropping them keeps the
-- schema honest about what the product does.
-- ---------------------------------------------------------------------------
alter table profiles drop column if exists stripe_account_id;
alter table profiles drop column if exists stripe_status;

-- ---------------------------------------------------------------------------
-- 3. dashboard_payload returns the new payout field instead of the old ones.
--    (Recreated in full because the previous definition selected the dropped
--    columns and would fail on the next call.)
-- ---------------------------------------------------------------------------
create or replace function dashboard_payload(p_user_id uuid) returns jsonb
language plpgsql
security definer
as $$
declare
  v_profile jsonb;
  v_invoices jsonb;
  v_ledger jsonb;
  v_referrals jsonb;
begin
  select to_jsonb(p) into v_profile
  from (
    select email, full_name, free_invoice_credits, referral_code,
           paypal_email, plan, plan_expires_at
    from profiles
    where id = p_user_id
  ) p;

  select coalesce(jsonb_agg(to_jsonb(i) order by i.created_at desc), '[]'::jsonb)
  into v_invoices
  from (
    select public_id, number, client_name, description, amount, currency, status,
           due_date, cta_message, views, referral_clicks, created_at, paid_at
    from invoices
    where owner_id = p_user_id
  ) i;

  select coalesce(jsonb_agg(to_jsonb(l) order by l.created_at desc), '[]'::jsonb)
  into v_ledger
  from (
    select amount, type, reference, created_at
    from credit_ledger
    where user_id = p_user_id
    order by created_at desc
    limit 50
  ) l;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb)
  into v_referrals
  from (
    select r.id, r.created_at, r.reward_credits,
           jsonb_build_object('full_name', pr.full_name, 'email', pr.email) as referred
    from referrals r
    left join profiles pr on pr.id = r.referred_user_id
    where r.referrer_id = p_user_id
      and r.status = 'rewarded'
  ) r;

  return jsonb_build_object(
    'profile', v_profile,
    'invoices', v_invoices,
    'ledger', v_ledger,
    'referrals', v_referrals
  );
end;
$$;

revoke execute on function public.dashboard_payload from public, anon, authenticated;
