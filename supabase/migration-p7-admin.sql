-- Migration p7 — operator console.
--
-- Run AFTER migration-p6-invoice-number.sql. Safe to run more than once.
--
-- An admin panel is the highest-value target in the product: one compromised
-- session sees every user, every invoice, every payment. So the rules live in
-- the database, not in the UI. Every function below re-derives who is calling
-- and refuses anyone who is not an admin, which means a leaked endpoint, a
-- forgotten route guard, or a bug in the React layer still cannot read or write
-- a thing.
--
-- ⚠ BEFORE RUNNING: put your own email in the list at step 2, or nobody can
--   reach the console.

-- ---------------------------------------------------------------------------
-- 1. Who someone is, and whether they are allowed to keep working.
-- ---------------------------------------------------------------------------
alter table profiles add column if not exists role text not null default 'user'
  check (role in ('user','admin'));
-- Suspension is a timestamp rather than a boolean so the record says when, and
-- a reason so it says why. An account action with no stated reason is one
-- nobody can review later.
alter table profiles add column if not exists suspended_at timestamptz;
alter table profiles add column if not exists suspended_reason text;

create index if not exists idx_profiles_role on profiles(role) where role = 'admin';

-- ---------------------------------------------------------------------------
-- 2. Bootstrap. EDIT THIS LIST, then run.
-- ---------------------------------------------------------------------------
update profiles set role = 'admin'
where email in (
  'dhafier16@gmail.com'
);

-- ---------------------------------------------------------------------------
-- 3. The audit trail.
--
-- Admin power without a record of its use is indistinguishable from a breach.
-- Every state-changing action writes here, including the before and after
-- values, and nothing ever deletes from it.
-- ---------------------------------------------------------------------------
create table if not exists admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references profiles(id) on delete restrict,
  actor_email text not null,
  action text not null,
  target_id uuid,
  target_email text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_admin_audit_created on admin_audit(created_at desc);
create index if not exists idx_admin_audit_target on admin_audit(target_id);

alter table admin_audit enable row level security;
-- No policy at all: the table is unreachable except through the service role,
-- which is only ever used inside server routes.

-- ---------------------------------------------------------------------------
-- 4. The guard every function starts with.
-- ---------------------------------------------------------------------------
create or replace function assert_admin(p_actor uuid)
returns profiles
language plpgsql
security definer
as $$
declare
  v_actor profiles%rowtype;
begin
  select * into v_actor from profiles where id = p_actor;
  if v_actor.id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_actor.role <> 'admin' then
    raise exception 'NOT_ADMIN';
  end if;
  if v_actor.suspended_at is not null then
    raise exception 'ACTOR_SUSPENDED';
  end if;
  return v_actor;
end;
$$;

create or replace function log_admin(
  p_actor profiles,
  p_action text,
  p_target_id uuid,
  p_target_email text,
  p_detail jsonb
) returns void
language sql
security definer
as $$
  insert into admin_audit (actor_id, actor_email, action, target_id, target_email, detail)
  values (p_actor.id, p_actor.email, p_action, p_target_id, p_target_email, coalesce(p_detail, '{}'::jsonb));
$$;

-- ---------------------------------------------------------------------------
-- 5. Reads.
-- ---------------------------------------------------------------------------
create or replace function admin_overview(p_actor uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_actor profiles%rowtype;
  v_money jsonb;
begin
  v_actor := assert_admin(p_actor);

  -- Money is grouped per currency, never summed across them: adding rupiah to
  -- dollars produces a number that is true of nothing.
  select coalesce(jsonb_agg(x order by x.billed desc), '[]'::jsonb) into v_money
  from (
    select currency,
           sum(amount) as billed,
           sum(amount) filter (where status = 'paid') as received,
           sum(amount) filter (where status in ('unpaid','payment_pending','awaiting_verification')) as outstanding
    from invoices group by currency
  ) x;

  return jsonb_build_object(
    'users', jsonb_build_object(
      'total',      (select count(*) from profiles),
      'admins',     (select count(*) from profiles where role = 'admin'),
      'suspended',  (select count(*) from profiles where suspended_at is not null),
      'paid',       (select count(*) from profiles where plan <> 'free'
                       and (plan_expires_at is null or plan_expires_at > now())),
      'new_7d',     (select count(*) from profiles where created_at > now() - interval '7 days')
    ),
    'invoices', jsonb_build_object(
      'total',   (select count(*) from invoices),
      'paid',    (select count(*) from invoices where status = 'paid'),
      'unpaid',  (select count(*) from invoices where status = 'unpaid'),
      'pending', (select count(*) from invoices where status in ('payment_pending','awaiting_verification')),
      'new_7d',  (select count(*) from invoices where created_at > now() - interval '7 days')
    ),
    'money', v_money,
    'loop', jsonb_build_object(
      'views',    (select coalesce(sum(views), 0) from invoices),
      'clicks',   (select coalesce(sum(referral_clicks), 0) from invoices),
      'signups',  (select count(*) from referrals where status = 'rewarded'),
      'credits_issued', (select coalesce(sum(amount), 0) from credit_ledger where amount > 0)
    ),
    'ops', jsonb_build_object(
      'payments_succeeded', (select count(*) from payments where status = 'succeeded'),
      'payments_failed',    (select count(*) from payments where status in ('failed','cancelled')),
      'webhooks_failed',    (select count(*) from webhook_events where status = 'failed'),
      'webhooks_24h',       (select count(*) from webhook_events where created_at > now() - interval '24 hours')
    )
  );
end;
$$;

-- Paginated, searchable user list. The search is a plain ILIKE over email and
-- name; anything cleverer is a feature nobody asked for yet.
create or replace function admin_users(
  p_actor uuid,
  p_search text default null,
  p_filter text default 'all',
  p_limit int default 25,
  p_offset int default 0
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_actor profiles%rowtype;
  v_rows jsonb;
  v_total int;
  v_q text;
begin
  v_actor := assert_admin(p_actor);
  v_q := nullif(btrim(coalesce(p_search, '')), '');

  select count(*) into v_total
  from profiles p
  where (v_q is null or p.email ilike '%' || v_q || '%' or coalesce(p.full_name,'') ilike '%' || v_q || '%')
    and (p_filter = 'all'
      or (p_filter = 'paid'      and p.plan <> 'free' and (p.plan_expires_at is null or p.plan_expires_at > now()))
      or (p_filter = 'free'      and p.plan = 'free')
      or (p_filter = 'suspended' and p.suspended_at is not null)
      or (p_filter = 'admin'     and p.role = 'admin'));

  select coalesce(jsonb_agg(to_jsonb(u) order by u.created_at desc), '[]'::jsonb) into v_rows
  from (
    select p.id, p.email, p.full_name, p.plan, p.plan_expires_at, p.role,
           p.suspended_at, p.free_invoice_credits, p.created_at,
           (select count(*) from invoices i where i.owner_id = p.id) as invoice_count,
           (select count(*) from invoices i where i.owner_id = p.id and i.status = 'paid') as paid_count
    from profiles p
    where (v_q is null or p.email ilike '%' || v_q || '%' or coalesce(p.full_name,'') ilike '%' || v_q || '%')
      and (p_filter = 'all'
        or (p_filter = 'paid'      and p.plan <> 'free' and (p.plan_expires_at is null or p.plan_expires_at > now()))
        or (p_filter = 'free'      and p.plan = 'free')
        or (p_filter = 'suspended' and p.suspended_at is not null)
        or (p_filter = 'admin'     and p.role = 'admin'))
    order by p.created_at desc
    limit greatest(1, least(p_limit, 100))
    offset greatest(0, p_offset)
  ) u;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end;
$$;

create or replace function admin_user_detail(p_actor uuid, p_user uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_actor profiles%rowtype;
  v_profile jsonb;
begin
  v_actor := assert_admin(p_actor);

  select to_jsonb(p) into v_profile
  from (
    select id, email, full_name, plan, plan_started_at, plan_expires_at, role,
           suspended_at, suspended_reason, free_invoice_credits, referral_code,
           paypal_email, created_at
    from profiles where id = p_user
  ) p;

  if v_profile is null then
    raise exception 'USER_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'profile', v_profile,
    'invoices', (
      select coalesce(jsonb_agg(to_jsonb(i) order by i.created_at desc), '[]'::jsonb)
      from (
        select public_id, number, client_name, amount, currency, status, views,
               referral_clicks, created_at
        from invoices where owner_id = p_user order by created_at desc limit 25
      ) i
    ),
    'ledger', (
      select coalesce(jsonb_agg(to_jsonb(l) order by l.created_at desc), '[]'::jsonb)
      from (
        select amount, type, reference, created_at
        from credit_ledger where user_id = p_user order by created_at desc limit 25
      ) l
    ),
    'audit', (
      select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb)
      from (
        select actor_email, action, detail, created_at
        from admin_audit where target_id = p_user order by created_at desc limit 20
      ) a
    )
  );
end;
$$;

create or replace function admin_audit_log(p_actor uuid, p_limit int default 50)
returns jsonb
language plpgsql
security definer
as $$
declare v_actor profiles%rowtype;
begin
  v_actor := assert_admin(p_actor);
  return (
    select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb)
    from (
      select actor_email, action, target_email, detail, created_at
      from admin_audit order by created_at desc limit greatest(1, least(p_limit, 200))
    ) a
  );
end;
$$;

-- Operational read: what the payment rail has been doing. Failed webhooks are
-- the first place to look when an invoice says unpaid and the client insists
-- otherwise.
create or replace function admin_ops(p_actor uuid)
returns jsonb
language plpgsql
security definer
as $$
declare v_actor profiles%rowtype;
begin
  v_actor := assert_admin(p_actor);
  return jsonb_build_object(
    'webhooks', (
      select coalesce(jsonb_agg(to_jsonb(w) order by w.created_at desc), '[]'::jsonb)
      from (
        select provider, event_type, status, provider_event_id, created_at
        from webhook_events order by created_at desc limit 25
      ) w
    ),
    'payments', (
      select coalesce(jsonb_agg(to_jsonb(p) order by p.created_at desc), '[]'::jsonb)
      from (
        select pay.provider, pay.status, pay.amount_minor, pay.currency,
               pay.provider_payment_id, pay.created_at, i.number as invoice_number
        from payments pay left join invoices i on i.id = pay.invoice_id
        order by pay.created_at desc limit 25
      ) p
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Writes. Each one logs, and each one refuses the ways an admin can lock
--    themselves or the platform out.
-- ---------------------------------------------------------------------------
create or replace function admin_set_suspended(
  p_actor uuid, p_user uuid, p_suspended boolean, p_reason text default null
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_actor profiles%rowtype;
  v_target profiles%rowtype;
begin
  v_actor := assert_admin(p_actor);
  if p_actor = p_user then
    raise exception 'CANNOT_TARGET_SELF';
  end if;

  select * into v_target from profiles where id = p_user;
  if v_target.id is null then raise exception 'USER_NOT_FOUND'; end if;

  update profiles set
    suspended_at = case when p_suspended then now() else null end,
    suspended_reason = case when p_suspended then nullif(btrim(coalesce(p_reason,'')), '') else null end
  where id = p_user;

  perform log_admin(v_actor,
    case when p_suspended then 'user.suspend' else 'user.restore' end,
    p_user, v_target.email,
    jsonb_build_object('reason', p_reason));

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function admin_set_role(p_actor uuid, p_user uuid, p_role text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_actor profiles%rowtype;
  v_target profiles%rowtype;
  v_admins int;
begin
  v_actor := assert_admin(p_actor);
  if p_role not in ('user','admin') then raise exception 'BAD_ROLE'; end if;
  -- Demoting yourself is how an install ends up with no administrator at all.
  if p_actor = p_user then raise exception 'CANNOT_TARGET_SELF'; end if;

  select * into v_target from profiles where id = p_user;
  if v_target.id is null then raise exception 'USER_NOT_FOUND'; end if;

  if p_role = 'user' and v_target.role = 'admin' then
    select count(*) into v_admins from profiles where role = 'admin';
    if v_admins <= 1 then raise exception 'LAST_ADMIN'; end if;
  end if;

  update profiles set role = p_role where id = p_user;
  perform log_admin(v_actor, 'user.role', p_user, v_target.email,
    jsonb_build_object('from', v_target.role, 'to', p_role));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function admin_adjust_credits(
  p_actor uuid, p_user uuid, p_delta int, p_reason text
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_actor profiles%rowtype;
  v_target profiles%rowtype;
  v_new int;
begin
  v_actor := assert_admin(p_actor);
  if p_delta = 0 then raise exception 'NO_CHANGE'; end if;
  if abs(p_delta) > 500 then raise exception 'DELTA_TOO_LARGE'; end if;
  if nullif(btrim(coalesce(p_reason,'')), '') is null then raise exception 'REASON_REQUIRED'; end if;

  select * into v_target from profiles where id = p_user;
  if v_target.id is null then raise exception 'USER_NOT_FOUND'; end if;

  v_new := greatest(0, v_target.free_invoice_credits + p_delta);
  update profiles set free_invoice_credits = v_new where id = p_user;

  -- The ledger is the user-facing record and must agree with the balance, so a
  -- manual adjustment appears there like any other movement.
  insert into credit_ledger (user_id, amount, type, reference, idempotency_key)
  values (p_user, p_delta, 'signup',
          'Admin: ' || btrim(p_reason),
          'admin_' || gen_random_uuid()::text);

  perform log_admin(v_actor, 'user.credits', p_user, v_target.email,
    jsonb_build_object('delta', p_delta, 'from', v_target.free_invoice_credits, 'to', v_new, 'reason', p_reason));

  return jsonb_build_object('ok', true, 'credits', v_new);
end;
$$;

create or replace function admin_set_plan(
  p_actor uuid, p_user uuid, p_plan text, p_days int default 30, p_reason text default null
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_actor profiles%rowtype;
  v_target profiles%rowtype;
  v_expires timestamptz;
begin
  v_actor := assert_admin(p_actor);
  if p_plan not in ('free','starter','pro') then raise exception 'BAD_PLAN'; end if;

  select * into v_target from profiles where id = p_user;
  if v_target.id is null then raise exception 'USER_NOT_FOUND'; end if;

  v_expires := case when p_plan = 'pro' then now() + make_interval(days => greatest(1, least(p_days, 365))) else null end;

  update profiles set
    plan = p_plan,
    plan_started_at = case when p_plan = 'free' then null else now() end,
    plan_expires_at = v_expires,
    plan_session_id = null
  where id = p_user;

  perform log_admin(v_actor, 'user.plan', p_user, v_target.email,
    jsonb_build_object('from', v_target.plan, 'to', p_plan, 'days', p_days, 'reason', p_reason));

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Suspension has to mean something, or it is theatre. A suspended account
--    cannot publish.
-- ---------------------------------------------------------------------------
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
  v_suspended timestamptz;
  v_plan_expires timestamptz;
  v_plan_started timestamptz;
  v_effective_plan text;
  v_used int;
  v_quota int;
  v_number text;
  v_minor bigint;
  v_invoice invoices%rowtype;
begin
  select plan, free_invoice_credits, plan_expires_at, plan_started_at, suspended_at
    into v_plan, v_credits, v_plan_expires, v_plan_started, v_suspended
  from profiles where id = p_owner_id;

  if v_plan is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;
  if v_suspended is not null then
    raise exception 'ACCOUNT_SUSPENDED';
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

-- The dashboard payload carries the suspension so the app can say so plainly
-- instead of failing at the moment someone tries to publish.
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
           role, suspended_at, suspended_reason
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
-- 8. Grants. None of this is reachable from a browser session; only the
--    service-role key inside server routes may call it.
-- ---------------------------------------------------------------------------
revoke execute on function public.assert_admin          from public, anon, authenticated;
revoke execute on function public.log_admin             from public, anon, authenticated;
revoke execute on function public.admin_overview        from public, anon, authenticated;
revoke execute on function public.admin_users           from public, anon, authenticated;
revoke execute on function public.admin_user_detail     from public, anon, authenticated;
revoke execute on function public.admin_audit_log       from public, anon, authenticated;
revoke execute on function public.admin_ops             from public, anon, authenticated;
revoke execute on function public.admin_set_suspended   from public, anon, authenticated;
revoke execute on function public.admin_set_role        from public, anon, authenticated;
revoke execute on function public.admin_adjust_credits  from public, anon, authenticated;
revoke execute on function public.admin_set_plan        from public, anon, authenticated;
revoke execute on function public.publish_invoice       from public, anon, authenticated;
revoke execute on function public.dashboard_payload     from public, anon, authenticated;
