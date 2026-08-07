-- Migration p3 — invoice detail, edit, delete, and the currency list the app
-- has been claiming to support.
--
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. The currency list the product actually promises.
--
-- lib/money.ts offers eight currencies and the landing page tells a Malaysian
-- freelancer to write "RM 3000". The database disagreed: the CHECK constraint
-- and publish_invoice both stopped at five, so MYR, THB and PHP were rejected
-- with UNSUPPORTED_CURRENCY at the moment of publishing. This is the fix.
-- ---------------------------------------------------------------------------
alter table invoices drop constraint if exists invoices_currency_check;
alter table invoices add constraint invoices_currency_check
  check (currency in ('IDR','MYR','SGD','THB','PHP','USD','EUR','GBP'));

-- One source of truth for "how many minor units in one unit", so amounts stay
-- consistent between publish and edit.
create or replace function currency_minor_factor(p_currency text)
returns numeric
language sql
immutable
as $$
  select power(10, case when p_currency in ('IDR','VND','JPY','KRW') then 0 else 2 end);
$$;

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
  if p_currency not in ('IDR','MYR','SGD','THB','PHP','USD','EUR','GBP') then
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

  v_minor := round(p_amount * currency_minor_factor(p_currency))::bigint;

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

-- ---------------------------------------------------------------------------
-- 2. Editing an invoice.
--
-- Ownership is proven by p_owner_id matching the row, never by the caller
-- saying which invoice is theirs. An invoice that has been paid is frozen:
-- the amount on a paid document is a record of money that actually moved, and
-- rewriting it after the fact is not an edit, it is a forgery. Invoices a
-- client has acted on (transfer confirmed, checkout opened) are frozen for the
-- same reason.
--
-- The number, public_id, view counts and status are never editable here — a
-- link already sent to a client must keep meaning the same thing.
-- ---------------------------------------------------------------------------
create or replace function update_invoice(
  p_owner_id uuid,
  p_public_id text,
  p_client_name text,
  p_description text,
  p_amount numeric,
  p_currency text,
  p_due_date date default null
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_invoice invoices%rowtype;
  v_minor bigint;
begin
  select * into v_invoice from invoices
  where public_id = p_public_id and owner_id = p_owner_id;

  if v_invoice.id is null then
    raise exception 'INVOICE_NOT_FOUND';
  end if;
  if v_invoice.status <> 'unpaid' then
    raise exception 'INVOICE_LOCKED';
  end if;
  if p_currency not in ('IDR','MYR','SGD','THB','PHP','USD','EUR','GBP') then
    raise exception 'UNSUPPORTED_CURRENCY';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;
  if coalesce(btrim(p_client_name), '') = '' or coalesce(btrim(p_description), '') = '' then
    raise exception 'MISSING_FIELDS';
  end if;

  v_minor := round(p_amount * currency_minor_factor(p_currency))::bigint;

  update invoices set
    client_name = btrim(p_client_name),
    description = btrim(p_description),
    amount = p_amount,
    currency = p_currency,
    amount_minor = v_minor,
    due_date = p_due_date
  where id = v_invoice.id
  returning * into v_invoice;

  return row_to_json(v_invoice)::jsonb;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Deleting an invoice.
--
-- A paid invoice can never be deleted: payments cascade from this row, so
-- removing it would destroy the record of money received.
--
-- The publishing credit is deliberately NOT returned. One credit buys one
-- publication, and that publication happened — the link was live and may have
-- been opened. Refunding it would also make publish/delete/publish an
-- unlimited free tier. Mistakes are meant to be fixed with update_invoice,
-- which costs nothing.
--
-- Referrals that came from this invoice survive: source_invoice_id is
-- ON DELETE SET NULL, so credits already earned are never clawed back.
-- ---------------------------------------------------------------------------
create or replace function delete_invoice(
  p_owner_id uuid,
  p_public_id text
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_invoice invoices%rowtype;
begin
  select * into v_invoice from invoices
  where public_id = p_public_id and owner_id = p_owner_id;

  if v_invoice.id is null then
    raise exception 'INVOICE_NOT_FOUND';
  end if;
  if v_invoice.status = 'paid' then
    raise exception 'INVOICE_PAID';
  end if;

  delete from invoices where id = v_invoice.id;

  return jsonb_build_object('number', v_invoice.number, 'public_id', v_invoice.public_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. The dashboard payload now carries enough to open an invoice without a
--    second round trip: description, due date, referral line, paid_at.
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
           stripe_account_id, stripe_status, plan, plan_expires_at
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

-- ---------------------------------------------------------------------------
-- 5. Grants. These functions run as SECURITY DEFINER, so they must stay
--    unreachable from the browser: only the service-role routes may call them.
-- ---------------------------------------------------------------------------
revoke execute on function public.publish_invoice from public, anon, authenticated;
revoke execute on function public.update_invoice from public, anon, authenticated;
revoke execute on function public.delete_invoice from public, anon, authenticated;
revoke execute on function public.dashboard_payload from public, anon, authenticated;
revoke execute on function public.currency_minor_factor from public, anon, authenticated;
