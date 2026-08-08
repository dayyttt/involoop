-- ===========================================================================
-- migration-p11-wallet-payload.sql
--
-- One column, for one reason: the dashboard cannot prompt a freelancer to
-- connect a wallet if it does not know whether they already have.
--
-- Direction A (a client paying an invoice in USDC) is the only direction that
-- needs a per-user wallet, and until now the only place to set one was a page
-- nobody had a reason to open. The payload carries the answer so the dashboard
-- can ask once, and stop asking the moment it is done.
--
-- Safe to re-run. Recreates dashboard_payload as of p7 plus two fields.
-- ===========================================================================

create or replace function dashboard_payload(p_user_id uuid) returns jsonb
language plpgsql
security definer
as $$
declare
  v_profile jsonb;
  v_invoices jsonb;
  v_ledger jsonb;
  v_referrals jsonb;
  v_plan text;
  v_started timestamptz;
  v_expires timestamptz;
  v_used int;
  v_quota int;
begin
  select plan, plan_started_at, plan_expires_at into v_plan, v_started, v_expires
  from profiles where id = p_user_id;

  if v_plan is null or v_plan = 'free' or (v_expires is not null and v_expires < now()) then
    v_used := null;
    v_quota := null;
  else
    v_quota := case v_plan when 'starter' then 10 else 50 end;
    select count(*) into v_used
    from invoices
    where owner_id = p_user_id
      and created_at >= coalesce(v_started, '-infinity'::timestamptz);
  end if;

  select to_jsonb(p) || jsonb_build_object(
           'plan_used', v_used,
           'plan_quota', v_quota,
           'plan_active', (v_quota is not null)
         )
    into v_profile
  from (
    select email, full_name, free_invoice_credits, referral_code,
           paypal_email, plan, plan_started_at, plan_expires_at,
           role, suspended_at, suspended_reason,
           -- Only ever read, never trusted as proof on its own: a wallet counts
           -- as connected when it has been verified by signature, and the
           -- timestamp is what the invoice page actually gates on.
           solana_wallet, solana_wallet_verified_at
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
