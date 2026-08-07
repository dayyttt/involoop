-- Migration p6 — invoice numbers without separators.
--
-- Run AFTER migration-p5-plan-quota.sql. Safe to run more than once.
--
-- "INV-2026-017" became "INV2026017": one unbroken code, which is what the
-- number is. The dashes also broke across two lines in narrow columns, so a
-- single number could read as two.
--
-- Existing invoices keep the number they were issued with. An invoice number is
-- a reference a client may already have quoted in a bank transfer or an email,
-- and rewriting history to match a new house style would break that.

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
    select count(*) into v_used
    from invoices
    where owner_id = p_owner_id
      and created_at >= coalesce(v_plan_started, '-infinity'::timestamptz);
    if v_used >= v_quota then
      raise exception 'PLAN_LIMIT';
    end if;
  end if;

  v_minor := round(p_amount * currency_minor_factor(p_currency))::bigint;

  -- INV + year + a four-digit sequence, no separators. Four digits rather than
  -- three so the format holds past the thousandth invoice instead of silently
  -- widening and changing shape mid-year.
  v_number := 'INV' || to_char(now(), 'YYYY') ||
              lpad(nextval('invoice_number_seq')::text, 4, '0');

  insert into invoices (owner_id, client_name, description, amount, currency, amount_minor, due_date, cta_message, number)
  values (p_owner_id, p_client_name, p_description, p_amount, p_currency, v_minor, p_due_date, p_cta_message, v_number)
  returning * into v_invoice;

  if v_effective_plan = 'free' then
    update profiles set free_invoice_credits = free_invoice_credits - 1
    where id = p_owner_id;

    insert into credit_ledger (user_id, amount, type, reference, idempotency_key)
    values (p_owner_id, -1, 'invoice_published', 'Publikasi ' || v_number, 'publish_' || v_invoice.id);
  end if;

  return row_to_json(v_invoice)::jsonb;
end;
$$;

revoke execute on function public.publish_invoice from public, anon, authenticated;
