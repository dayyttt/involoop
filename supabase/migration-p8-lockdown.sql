-- Migration p8 — close two privilege escalations. RUN THIS FIRST.
--
-- Independent of every other migration. Safe to run more than once. Run it
-- before p7 if you have not applied p7 yet; the holes below exist today.
--
-- ===========================================================================
-- WHAT WAS WRONG
--
-- Two policies granted more than they were meant to, and both were confirmed
-- exploitable against the live database with nothing but an ordinary user's
-- login:
--
--   create policy "profiles_self_update" on profiles for update using (auth.uid() = id);
--
-- Postgres row-level security cannot restrict which COLUMNS an update touches.
-- "You may update your own row" therefore meant "you may set any field in your
-- own row", so a signed-in user could PATCH their profile through the public
-- API and hand themselves free_invoice_credits = 9999 and plan = 'pro'. Both
-- were done and observed. Once p7 adds a role column, the same request would
-- have made them an administrator.
--
--   create policy "invoices_owner" on invoices for all using (auth.uid() = owner_id);
--
-- `for all` includes INSERT, UPDATE and DELETE. A user could insert invoices
-- directly — bypassing publish_invoice and with it the credit spend, the plan
-- quota, the suspension check and the number sequence — and could mark their
-- own invoices paid and set their view counts to anything. All three were done
-- and observed.
--
-- WHY THIS FIX IS SAFE
--
-- Nothing in the application writes to these tables from the browser. The
-- client-side Supabase instance only ever calls supabase.auth.*; every read and
-- write of application data goes through a server route holding the service
-- role, which bypasses RLS by design. Removing write access from the browser
-- therefore removes capability from attackers and from nobody else.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Profiles: readable by their owner, writable by nobody but the server.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_self_update" on profiles;

-- Reading stays: the middleware checks the caller's own role through it.
drop policy if exists "profiles_self" on profiles;
create policy "profiles_self" on profiles for select using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 2. Invoices: an owner may read their own. Creating, editing and deleting go
--    through publish_invoice / update_invoice / delete_invoice, which are the
--    only places the rules exist.
-- ---------------------------------------------------------------------------
drop policy if exists "invoices_owner" on invoices;
create policy "invoices_owner_read" on invoices for select using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- 3. Belt and braces. Policies decide which rows; grants decide whether the
--    verb is available at all. With both removed, a future policy written
--    carelessly still cannot hand out write access by itself.
-- ---------------------------------------------------------------------------
revoke insert, update, delete on profiles       from anon, authenticated;
revoke insert, update, delete on invoices       from anon, authenticated;
revoke insert, update, delete on payments       from anon, authenticated;
revoke insert, update, delete on credit_ledger  from anon, authenticated;
revoke insert, update, delete on referrals      from anon, authenticated;
revoke insert, update, delete on webhook_events from anon, authenticated;
revoke select                  on webhook_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Look for fingerprints of the hole having been used.
--
-- Credits are only ever granted 3 or 5 at signup and ±3 per referral, so a
-- balance in the hundreds cannot have come from any legitimate path. Those are
-- reset.
--
-- Plans are NOT reset automatically. Telling a paying customer their plan has
-- vanished is worse than leaving one fraudulent upgrade in place for an hour,
-- and the two cannot be told apart from the profiles table alone. The query
-- below lists paid accounts so you can check each against a real payment, and
-- p7's admin console shows the same list with the payment record beside it.
-- ---------------------------------------------------------------------------
update profiles set free_invoice_credits = 3
where free_invoice_credits > 200;

-- Review these by hand. Every row here should correspond to a succeeded payment
-- or a grant you made deliberately.
select id, email, plan, plan_started_at, plan_expires_at, free_invoice_credits
from profiles
where plan <> 'free'
order by plan_started_at desc nulls last;
