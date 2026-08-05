-- Involoop database schema
-- Run this in Supabase SQL editor after creating your project.

-- Profiles: extends Supabase auth.users with app-specific fields
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  referral_code text unique not null default substr(md5(random()::text), 1, 8),
  referred_by uuid references profiles(id),
  free_invoice_credits int not null default 3,
  created_at timestamptz not null default now()
);

-- Invoices: the core object. public_id is what appears in the shareable URL.
create table invoices (
  id uuid primary key default gen_random_uuid(),
  public_id text unique not null default substr(md5(random()::text || clock_timestamp()::text), 1, 10),
  owner_id uuid not null references profiles(id) on delete cascade,
  client_name text not null,
  description text not null,
  amount numeric(12,2) not null,
  currency text not null default 'IDR',
  due_date date,
  cta_message text, -- AI-generated, context-aware referral line
  status text not null default 'unpaid' check (status in ('unpaid','paid')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- Referrals: tracks the A -> B loop explicitly, separate from profiles.referred_by
-- so we can query/report on the loop independent of auth relationships.
create table referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references profiles(id) on delete cascade,
  referred_id uuid references profiles(id) on delete cascade,
  source_invoice_id uuid references invoices(id) on delete set null,
  status text not null default 'clicked' check (status in ('clicked','signed_up','rewarded')),
  reward_credits int not null default 1,
  created_at timestamptz not null default now(),
  converted_at timestamptz
);

-- Row Level Security
alter table profiles enable row level security;
alter table invoices enable row level security;
alter table referrals enable row level security;

-- Profiles: users can read/update their own row
create policy "profiles_self" on profiles for select using (auth.uid() = id);
create policy "profiles_self_update" on profiles for update using (auth.uid() = id);

-- Invoices: owner can do everything; public can SELECT via public_id (handled by API route with service role)
create policy "invoices_owner" on invoices for all using (auth.uid() = owner_id);

-- Referrals: referrer can read their own referral records
create policy "referrals_referrer" on referrals for select using (auth.uid() = referrer_id);

-- Index for fast public invoice lookups
create index idx_invoices_public_id on invoices(public_id);
create index idx_referrals_referrer on referrals(referrer_id);
