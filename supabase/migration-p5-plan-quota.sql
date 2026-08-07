-- Migration p5 — make a paid plan mean what the pricing page says.
--
-- Run AFTER migration-p4-paypal.sql. Safe to run more than once.
--
-- Two things were sold and not delivered:
--
-- 1. Pro is priced "$8 / 30 days" and plan_expires_at was written at purchase,
--    but publish_invoice only ever read `plan`. Nothing expired. A single Pro
--    payment bought the 50-invoice quota permanently.
--
-- 2. The quota counted every invoice the account had ever published, including
--    the free ones paid for with credits. Someone who used their 3 free credits
--    and then bought Starter (10 invoices) received 7, not 10 — they were
--    charged for capacity they had already used.

-- When the current plan began. The quota is counted from here, so buying a plan
-- gives the full number of invoices that plan advertises.
alter table profiles add column if not exists plan_started_at timestamptz;

-- Anyone already on a paid plan keeps it, counted from now: it is the only
-- honest reading, since we cannot know retroactively which invoices they meant
-- to spend the plan on.
update profiles set plan_started_at = now()
where plan <> 'free' and plan_started_at is null;

create or replace function publish_invoice(
  p_owner_id uuid,
  p_client_name text,
  p_description text,
  p_amount numeric,
  p_currency text default 'USD',
  p_due_date date default null,
  p_cta_message text default null
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_credits int;
  v_plan text;
  v_plan_expires timestamptz;
  v_plan_started timestamptz;
  v_effective_plan text;
  v_used int;
  v_quota int;
  v_number text;
  v_minor bigint;
  v_invoice invoices%rowtype;
begin
  select plan, free_invoice_credits, plan_expires_at, plan_started_at
    into v_plan, v_credits, v_plan_expires, v_plan_started
  from profiles where id = p_owner_id;

  if v_plan is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;
  if p_currency not in ('IDR','MYR','SGD','THB','PHP','USD','EUR','GBP') then
    raise exception 'UNSUPPORTED_CURRENCY';
  end if;

  -- An expired plan is a free account again. Falling back to credits rather
  -- than refusing outright means someone whose Pro month ran out can still
  -- publish if they have credits, and is told to renew rather than blocked.
  v_effective_plan := case
    when v_plan = 'free' then 'free'
    when v_plan_expires is not null and v_plan_expires < now() then 'free'
    else v_plan
  end;

  if v_effective_plan = 'free' then
    if v_credits <= 0 then
      if v_plan <> 'free' then
        raise exception 'PLAN_EXPIRED';
      end if;
      raise exception 'NO_CREDITS';
    end if;
  else
    v_quota := case v_effective_plan when 'starter' then 10 else 50 end;
    -- Only invoices published since this plan started count against it.
    select count(*) into v_used
    from invoices
    where owner_id = p_owner_id
      and created_at >= coalesce(v_plan_started, '-infinity'::timestamptz);
    if v_used >= v_quota then
      raise exception 'PLAN_LIMIT';
    end if;
  end if;

  v_minor := round(p_amount * currency_minor_factor(p_currency))::bigint;

  v_number := 'INV-' || to_char(now(), 'YYYY') || '-' ||
              lpad(nextval('invoice_number_seq')::text, 3, '0');

  insert into invoices (owner_id, client_name, description, amount, currency, amount_minor, due_date, cta_message, number)
  values (p_owner_id, p_client_name, p_description, p_amount, p_currency, v_minor, p_due_date, p_cta_message, v_number)
  returning * into v_invoice;

  -- Credits are only spent when the account is actually running on credits.
  if v_effective_plan = 'free' then
    update profiles set free_invoice_credits = free_invoice_credits - 1
    where id = p_owner_id;

    insert into credit_ledger (user_id, amount, type, reference, idempotency_key)
    values (p_owner_id, -1, 'invoice_published', 'Publikasi ' || v_number, 'publish_' || v_invoice.id);
  end if;

  return row_to_json(v_invoice)::jsonb;
end;
$$;

-- The dashboard needs to show "6 of 10 used" and when the plan runs out, which
-- means the payload has to carry the plan window and the count within it.
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
           paypal_email, plan, plan_started_at, plan_expires_at
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

revoke execute on function public.publish_invoice from public, anon, authenticated;
revoke execute on function public.dashboard_payload from public, anon, authenticated;
