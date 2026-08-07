-- Migration P2: paid plans (Starter one-time $3, Pro monthly $8).
-- Run once in the Supabase SQL editor. Safe to rerun (idempotent).

alter table profiles add column if not exists plan text not null default 'free'
  check (plan in ('free','starter','pro'));
alter table profiles add column if not exists plan_expires_at timestamptz;
alter table profiles add column if not exists plan_session_id text;

-- publish_invoice: free tier uses credits; paid tiers use an invoice quota.
-- Recreated here, so PUBLIC execute must be revoked again (grants reset).
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
  v_plan text;
  v_used int;
  v_quota int;
  v_number text;
  v_minor bigint;
  v_invoice invoices%rowtype;
begin
  select plan, free_invoice_credits into v_plan, v_credits from profiles where id = p_owner_id;
  if v_plan is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;
  if p_currency not in ('USD','EUR','GBP','SGD','IDR') then
    raise exception 'UNSUPPORTED_CURRENCY';
  end if;

  if v_plan = 'free' then
    if v_credits <= 0 then
      raise exception 'NO_CREDITS';
    end if;
  else
    v_quota := case v_plan when 'starter' then 10 else 50 end;
    select count(*) into v_used from invoices where owner_id = p_owner_id;
    if v_used >= v_quota then
      raise exception 'PLAN_LIMIT';
    end if;
  end if;

  v_minor := round(p_amount * power(10, case p_currency when 'IDR' then 0 else 2 end))::bigint;

  v_number := 'INV-' || to_char(now(), 'YYYY') || '-' ||
              lpad(nextval('invoice_number_seq')::text, 3, '0');

  insert into invoices (owner_id, client_name, description, amount, currency, amount_minor, due_date, cta_message, number)
  values (p_owner_id, p_client_name, p_description, p_amount, p_currency, v_minor, p_due_date, p_cta_message, v_number)
  returning * into v_invoice;

  if v_plan = 'free' then
    update profiles set free_invoice_credits = free_invoice_credits - 1
    where id = p_owner_id;

    insert into credit_ledger (user_id, amount, type, reference, idempotency_key)
    values (p_owner_id, -1, 'invoice_published', 'Publikasi ' || v_number, 'publish_' || v_invoice.id);
  end if;

  return row_to_json(v_invoice)::jsonb;
end;
$$;

-- Grants: keep the RPC out of anon/authenticated/public reach.
revoke execute on function public.publish_invoice from public, anon, authenticated;
revoke execute on function public.finalize_signup from public, anon, authenticated;
revoke execute on function public.bump_views from public, anon, authenticated;
revoke execute on function public.bump_referral_clicks from public, anon, authenticated;
revoke execute on function public.dashboard_payload from public, anon, authenticated;

-- dashboard_payload now also returns the owner's plan (recreated so the
-- column exists in the single-round-trip payload).
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
           stripe_account_id, stripe_status, plan, plan_expires_at
    from profiles
    where id = p_user_id
  ) p;

  select coalesce(jsonb_agg(to_jsonb(i) order by i.created_at desc), '[]'::jsonb)
  into v_invoices
  from (
    select public_id, number, client_name, amount, currency, status,
           views, referral_clicks, created_at
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
