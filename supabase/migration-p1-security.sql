-- P1 security: lock down service functions.
-- Run in Supabase SQL editor.
--
-- WHY: Supabase grants EXECUTE on new functions to anon + authenticated by
-- default, so anyone with the public anon key (embedded in the client bundle)
-- could call these security-definer functions directly via PostgREST and:
--   - publish invoices attributed to any user, burning their credits
--   - forge signup/referral rewards
-- Only the app's server (service_role) needs to call them.
--
-- App routes call these with the service-role client, so revoking from
-- anon/authenticated breaks nothing. Idempotent.

revoke execute on function public.publish_invoice from anon, authenticated;
revoke execute on function public.finalize_signup from anon, authenticated;
revoke execute on function public.bump_views from anon, authenticated;
revoke execute on function public.bump_referral_clicks from anon, authenticated;
