# Involoop

**Distribution-first invoicing for freelancers and micro-agencies.** Turn one
sentence into a shareable invoice, accept payment, and earn publishing credits
when another B2B professional joins through that invoice.

**Live:** https://involoop.vercel.app

## Problem

Freelancers already invoice other professionals and businesses every week, but
an invoice ends as a transaction. It never becomes a distribution channel.
Involoop embeds its growth loop inside that existing high-intent workflow.

## Target users

Freelancers, independent consultants, designers, developers, video editors,
creators serving businesses, micro-agencies, and B2B service professionals who
both buy and sell professional services.

## Distribution mechanism

```text
Owner writes one sentence
→ AI publishes a public invoice
→ Client opens it (view recorded)
→ Client pays securely via PayPal or confirms a bank transfer
→ PayPal webhook marks the invoice paid
→ Client clicks the contextual referral CTA (click recorded)
→ Client signs up (5 credits: 3 initial + 2 bonus)
→ Owner earns 3 credits
→ Dashboard proves views, clicks, signup, payment, and ledger entries
```

`1 credit = 1 public invoice.` Every credit movement is recorded in an
idempotent ledger, not only as a balance.

## Main features

- Natural-language invoice generation via Claude + manual fallback.
- Login-free demo of that step on the landing page: a visitor watches one
  sentence become an invoice before deciding to sign up (rate-limited, never
  writes to the database).
- Public invoice page; no client login required. Server-rendered with a
  generated Open Graph card, so a link pasted into WhatsApp previews the
  sender, amount, and status instead of a generic site title.
- Multicurrency: IDR, MYR, SGD, THB, PHP, USD, EUR, GBP. The currency follows
  the sentence ("RM 3000" bills in ringgit), then the visitor's country, then
  USD. Amounts are never converted — an invoice states one figure in one
  currency, and that is what PayPal charges. Money is stored as integer minor
  units, with zero-decimal currencies handled as a set rather than a special
  case.
- Every invoice downloads as a PDF carrying the sender's name as the letterhead
  and the referral invitation in the footer, so the loop survives being
  forwarded to an accountant who never saw the original link.
- PayPal Orders v2 + verified webhook + permanent Vercel endpoint. The order
  names the freelancer's own PayPal address as payee, so the client pays them
  directly and Involoop is never in the money path.
- Manual transfer fallback: client confirms → owner verifies.
- Referral attribution survives refresh via query + cookie.
- Two-way reward: owner +3, client +2 on top of 3 initial credits.
- Dashboard: money owed and received per currency first, then the distribution
  metrics (views, CTA clicks, signups, conversion, credits earned), referral
  rows, and an auditable credit ledger.
- English default + EN|ID switcher, resolved on the server from a cookie, so
  there is no language flash and `<html lang>` is always honest.
- Privacy Policy and Terms pages describing what is actually stored, what
  credits are, and that payments run in the PayPal sandbox.
- Profile page: the display name is the invoice letterhead, edited against a
  live miniature of the invoice header.
- Demo-only workspace reset.

## Accessibility and performance notes

- Button fills are darkened relative to the brand accents so white label text
  clears WCAG AA (4.9:1 and 5.2:1, up from 3.4:1 and 2.2:1).
- The hero headline is a real `<h1>`, server-rendered visible; nothing that
  matters starts at `opacity: 0`.
- The three.js backdrop is dynamically imported, skipped on small screens and
  for `prefers-reduced-motion`, and paused once the hero scrolls away.

## Tech stack

- Next.js 14 App Router + TypeScript
- Supabase Postgres, Auth, RLS, transactional RPCs
- PayPal Orders v2 (sandbox) + verified webhook
- AI gateway (Anthropic-compatible, streaming-safe fetch)
- three.js hero visualization
- Vercel

## Architecture

```text
app/
  page.tsx                       English/Indonesian landing + pricing
  signup|login                   Supabase auth + referral persistence
  dashboard                     Distribution proof + ledger + reset
  dashboard/new-invoice          AI + manual multicurrency invoice
  invoice/[id]                   Public invoice / payment / referral surface
  payment/success                Verified PayPal payment summary + CTA
  privacy|terms                  Server-rendered legal documents (EN|ID)
  api/demo/parse                 Public, rate-limited sentence → invoice preview
  api/signup                     Auth user → finalize_signup RPC
  api/invoices/create            AI/manual → publish_invoice RPC
  api/invoices/view              Atomic public view counter
  api/invoices/pay|verify        Manual payment fallback
  api/payments/checkout          PayPal order (DB amount only)
  api/payments/capture           Post-approval capture + plan grant
  api/payments/webhook           Signature verification + idempotent events
  api/payments/session           Payment success read model
  api/referrals/click            CTA click attribution
  api/dashboard                  Session-protected dashboard aggregate
  api/demo/reset                 Demo-account-only reset
lib/
  claude.ts                      AI parser + currency detection
  money.ts                       Minor units + locale formatting
  paypal.ts                      Server-only PayPal client (orders, capture,
                                 webhook verification)
  i18n.ts                        EN|ID dictionaries (landing + app)
supabase/
  schema.sql                     Fresh database schema
  migration-p0.sql               Safe production upgrade
scripts/seed-demo.mjs             Demo owner, USD invoice, client referral
```

## Data integrity and security

- Owner identity comes from signed Supabase session cookies, never request body.
- Service role only exists in server routes.
- Emails normalized lowercase.
- Self-referrals rejected.
- `UNIQUE(referred_user_id)` prevents multiple conversion rewards.
- `UNIQUE(idempotency_key)` prevents duplicate credit ledger entries.
- PayPal webhook signatures verified through PayPal's own
  verify-webhook-signature call; an unverified body is rejected, never
  processed optimistically.
- `UNIQUE(provider_event_id)` makes webhook replays harmless.
- `UNIQUE(provider_payment_id)` prevents duplicate payments.
- Payment and referral are separate events: payment marks invoice paid; signup
  triggers referral reward.
- Payment amount and currency are read from Postgres, never trusted from client.
- No secrets, `.env`, credentials, node_modules, or build output tracked in git.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## Environment variables

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AI_API_KEY=
AI_BASE_URL=                 # optional
AI_MODEL=                    # optional
NEXT_PUBLIC_BASE_URL=http://localhost:3000
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
PAYPAL_ENV=sandbox
```

`SUPABASE_SERVICE_ROLE_KEY`, `AI_API_KEY`, `PAYPAL_CLIENT_SECRET`, and
`PAYPAL_WEBHOOK_ID` are server-only.

## Database migration and seed

1. New project: run `supabase/schema.sql` in Supabase SQL Editor.
2. Existing project: run `supabase/migration-p0.sql` once (safe to rerun).
3. Seed demo data:

```bash
node scripts/seed-demo.mjs
```

## PayPal sandbox setup

1. Create an app at https://developer.paypal.com → Apps & Credentials → Sandbox.
2. Copy the Client ID and Secret into `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`.
3. Add a webhook on that app pointing at:
   `https://involoop.vercel.app/api/payments/webhook`
4. Subscribe it to:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
   - `PAYMENT.CAPTURE.REFUNDED`
   - `CHECKOUT.ORDER.APPROVED`
   - `CHECKOUT.ORDER.VOIDED`
5. Copy the webhook's ID into `PAYPAL_WEBHOOK_ID`. Without it the endpoint
   cannot verify signatures and refuses every event, which is the safe default.
6. Pay with a sandbox personal account from Testing Tools → Sandbox Accounts.

The UI labels this clearly: **PayPal Sandbox — no real money will be charged.**
Each freelancer saves their own PayPal address in their profile; the invoice
order names it as payee, so funds go to them and never to an Involoop balance.


## Demo accounts

```text
Owner:  demo-owner@involoop.app
Client: demo-client@involoop.app
Password (both): involoop-demo-2026
```

These credentials are demo-only. Dashboard shows **Reset Demo Workspace** only
for demo accounts.

## Pricing

- Free: $0, 3 public invoices, referral credits.
- Starter: $3 one-time, 10 public invoices, PayPal payment, basic analytics.
- Pro: $8/month, 50 public invoices, advanced analytics, custom branding.

Plan purchases are functional: the landing and dashboard open a PayPal order
(sandbox) and both the capture redirect and a verified webhook upgrade the
account. Both plans are one-time orders; Pro grants 30 days. Paid-plan invoices
draw from the plan quota instead of free credits.

## Known limitations

- PayPal runs in sandbox; no real money is charged.
- PayPal does not settle in IDR or MYR — both are rejected at order creation
  with CURRENCY_NOT_SUPPORTED, verified against the sandbox rather than taken
  from documentation (older PayPal docs still list MYR). Invoices in those two
  currencies offer bank transfer confirmation only: the Pay button is hidden
  rather than shown and then failing. SGD, THB, PHP, USD, EUR and GBP go
  through PayPal.
- Paid plans are buyable (PayPal sandbox); Pro is a one-time 30-day grant, not
  a recurring subscription.
- Direct payee routing is used rather than a marketplace onboarding flow, which
  keeps setup to one saved address but means Involoop cannot take a platform fee.
- Manual transfer details are agreed off-platform; Involoop tracks confirmation.
- AI output is validated but not a full accounting/tax engine.
- View/click dedupe is browser-cookie based, not identity/IP fraud prevention.
- No subscriptions, tax reporting, recurring invoices, payroll, or team roles.

## First 100 users

The first 100 users are Indonesian freelance developers, designers, consultants,
video editors, and micro-agencies that invoice other service businesses. The
acquisition plan is concrete: direct outreach to 40 active service providers on
Projects.co.id, 30 Indonesian freelance designers and developers found through
LinkedIn role search, 20 service providers listed on Sribulancer, and 10 pilot
users from the founder's existing WhatsApp/Discord freelancer network. Each pilot
sends at least three real public invoices. Every recipient is another B2B
professional likely to send invoices, making the referral loop repeatable.
