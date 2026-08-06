-- P1 security + performance.
-- Run in Supabase SQL editor.
--
-- SECURITY: Supabase grants EXECUTE on new functions to anon + authenticated
-- by default, and PostgreSQL grants it to PUBLIC by default. Anyone with the
-- public anon key (embedded in the client bundle) could call these
-- security-definer functions directly via PostgREST and forge invoices / burn
-- credits / inject referral rewards. Only the app's server (service_role)
-- needs them, so revoke from everyone else. Idempotent.
--
-- NOTE: revoking from PUBLIC is the part that actually closes the hole —
-- anon/authenticated are members of PUBLIC, so `from public` alone covers
-- them; the explicit role revokes stay for clarity.

revoke execute on function public.publish_invoice from public, anon, authenticated;
revoke execute on function public.finalize_signup from public, anon, authenticated;
revoke execute on function public.bump_views from public, anon, authenticated;
revoke execute on function public.bump_referral_clicks from public, anon, authenticated;

-- PERFORMANCE: /api/dashboard used to make 4 sequential round trips (profile,
-- invoices, ledger, referrals) which on cross-region Vercel -> Supabase links
-- costs seconds. One security-definer RPC returns the whole dashboard payload
-- in a single round trip.

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
           stripe_account_id, stripe_status
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
