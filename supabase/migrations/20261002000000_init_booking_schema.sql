-- Ba Lubaale booking system — migration 1: core schema
-- Apply in the Supabase SQL editor, or `supabase db push` with the CLI.
-- Access model: RLS enabled on every table with NO policies, so the anon key
-- sees nothing. The app talks to the database only with the server-held
-- service_role key (never shipped to the browser).

create type public.booking_status as enum ('pending', 'approved', 'declined', 'paid');
create type public.payment_kind as enum ('deposit', 'balance');
create type public.payment_status as enum ('pending', 'initiated', 'completed', 'failed', 'cancelled');
create type public.party_type as enum ('solo', 'couple', 'family', 'buyout');

-- Guest requests from the apply form.
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  email text not null,
  whatsapp text,
  country text not null,
  requested_window text,
  party public.party_type not null,
  stay_slug text not null check (stay_slug in ('essential', 'master', 'buyout')),
  check_in date not null,
  check_out date not null check (check_out > check_in),
  drawing text not null,
  comfort text not null,
  limits text,
  protocols boolean not null,
  digital_sunset boolean not null,
  burden text not null,
  policies_ok boolean not null default false,
  complementary_ok boolean not null default false,
  status public.booking_status not null default 'pending',
  -- amount is fixed when the owner approves (from settings.stay_prices)
  amount_usd numeric(10, 2),
  approved_at timestamptz,
  constraint both_acknowledgements_given check (policies_ok and complementary_ok)
);
create index bookings_status_idx on public.bookings (status, created_at desc);
create index bookings_range_idx on public.bookings (check_in, check_out)
  where status in ('approved', 'paid');

-- One row per payment attempt (deposit or balance).
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  kind public.payment_kind not null,
  amount_usd numeric(10, 2) not null,
  amount_ugx bigint not null check (amount_ugx > 0),
  currency text not null default 'UGX',
  provider text not null,
  provider_ref text not null unique,
  provider_payment_id text,
  status public.payment_status not null default 'pending',
  paid_at timestamptz
);
-- At most one completed deposit and one completed balance per booking
-- (double-spend protection at the database level).
create unique index payments_one_completed_deposit
  on public.payments (booking_id) where kind = 'deposit' and status = 'completed';
create unique index payments_one_completed_balance
  on public.payments (booking_id) where kind = 'balance' and status = 'completed';
create index payments_booking_idx on public.payments (booking_id);

-- Webhook idempotency: every provider event is claimed exactly once.
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_id text not null,
  received_at timestamptz not null default now(),
  processed boolean not null default false,
  redacted_payload jsonb,
  unique (provider, external_id)
);

-- Days nobody may book (owner-blocked, maintenance, ceremonies).
create table public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  day date not null unique,
  reason text,
  created_at timestamptz not null default now()
);

-- Business settings, editable in /admin/settings — no code changes.
create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Every outbound email is recorded here (owner reads them in /admin/emails).
-- NEVER contains card or phone data — templates carry links and text only.
create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  to_email text not null,
  template text not null,
  subject text not null,
  body text not null,
  status text not null check (status in ('sent', 'stubbed', 'failed')),
  error text
);
create index email_log_created_idx on public.email_log (created_at desc);

-- RLS on, no policies: anon/authenticated can read nothing; service_role bypasses.
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.webhook_events enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.settings enable row level security;
alter table public.email_log enable row level security;

-- Seed settings (owner edits these in admin; values match the live site).
insert into public.settings (key, value) values
  ('stay_prices', '{"essential":{"solo":2200,"couple":3600},"master":{"solo":4500,"couple":7200},"buyout":{"base":10000,"extraGuest":1500,"maxGuests":8}}'::jsonb),
  ('deposit_percent', '50'::jsonb),
  ('ugx_rate', '3900'::jsonb)
on conflict (key) do nothing;
