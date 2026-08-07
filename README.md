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
→ Client pays securely via Stripe test Checkout or confirms a transfer
→ Stripe webhook marks the invoice paid
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
  currency, and that is what Stripe charges. Money is stored as integer minor
  units, with zero-decimal currencies handled as a set rather than a special
  case.
- Every invoice downloads as a PDF carrying the sender's name as the letterhead
  and the referral invitation in the footer, so the loop survives being
  forwarded to an accountant who never saw the original link.
- Stripe sandbox Checkout + verified webhook + permanent Vercel endpoint.
- Manual transfer fallback: client confirms → owner verifies.
- Referral attribution survives refresh via query + cookie.
- Two-way reward: owner +3, client +2 on top of 3 initial credits.
- Dashboard: money owed and received per currency first, then the distribution
  metrics (views, CTA clicks, signups, conversion, credits earned), referral
  rows, and an auditable credit ledger.
- English default + EN|ID switcher, resolved on the server from a cookie, so
  there is no language flash and `<html lang>` is always honest.
- Privacy Policy and Terms pages describing what is actually stored, what
  credits are, and that payments run in Stripe test mode.
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
- Stripe sandbox Checkout + webhook
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
  payment/success                Verified Stripe payment summary + CTA
  privacy|terms                  Server-rendered legal documents (EN|ID)
  api/demo/parse                 Public, rate-limited sentence → invoice preview
  api/signup                     Auth user → finalize_signup RPC
  api/invoices/create            AI/manual → publish_invoice RPC
  api/invoices/view              Atomic public view counter
  api/invoices/pay|verify        Manual payment fallback
  api/payments/checkout          Stripe Checkout (DB amount only)
  api/payments/webhook           Signature verification + idempotent events
  api/payments/session           Payment success read model
  api/referrals/click            CTA click attribution
  api/dashboard                  Session-protected dashboard aggregate
  api/demo/reset                 Demo-account-only reset
lib/
  claude.ts                      AI parser + currency detection
  money.ts                       Minor units + locale formatting
  stripe.ts                      Server-only Stripe client
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
- Stripe webhook signature verified using `STRIPE_WEBHOOK_SECRET`.
- `UNIQUE(provider_event_id)` makes webhook replays harmless.
- `UNIQUE(provider_payment_id)` prevents duplicate payments.
- Payment and referral are separate events: payment marks invoice paid; signup
  triggers referral reward.
- Stripe amount and currency are read from Postgres, never trusted from client.
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
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

`SUPABASE_SERVICE_ROLE_KEY`, `AI_API_KEY`, `STRIPE_SECRET_KEY`, and
`STRIPE_WEBHOOK_SECRET` are server-only.

## Database migration and seed

1. New project: run `supabase/schema.sql` in Supabase SQL Editor.
2. Existing project: run `supabase/migration-p0.sql` once (safe to rerun).
3. Seed demo data:

```bash
node scripts/seed-demo.mjs
```

## Stripe sandbox setup

1. Use a Stripe test/sandbox account.
2. Add a permanent webhook endpoint:
   `https://involoop.vercel.app/api/payments/webhook`
3. Scope: **Your account**, payload style: **Snapshot**.
4. Events:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copy the destination signing secret into `STRIPE_WEBHOOK_SECRET`.
6. Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

The UI labels this clearly: **Stripe Test Mode — no real money will be charged.**
The demo currently uses platform sandbox Checkout. Stripe Connect is supported
by the architecture when a connected account is available; production country
availability determines the final settlement model.

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
- Starter: $3 one-time, 10 public invoices, Stripe payment, basic analytics.
- Pro: $8/month, 50 public invoices, advanced analytics, custom branding.

Plan purchases are functional: the landing and dashboard open a Stripe Checkout
session (test mode) and a verified webhook upgrades the account. Starter is a
one-time payment; Pro is a monthly subscription with a 30-day grant. Paid-plan
invoices draw from the plan quota instead of free credits.

## Known limitations

- Stripe uses sandbox/test mode; no real money is charged.
- Paid plans are buyable (Stripe test checkout); recurring Pro renewals beyond
  the initial 30-day grant are not yet auto-extended by the webhook.
- Platform sandbox Checkout is the tested fallback while production Connect
  availability depends on platform and connected-business country.
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
