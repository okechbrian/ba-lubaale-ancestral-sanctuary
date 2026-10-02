-- Email list with double opt-in. Nobody is ever added silently: a signup
-- inserts a pending row, a confirm link flips it to confirmed, and every
-- marketing email must carry the unsubscribe link for that row.
-- Service-role only (RLS on, no policies) - same contract as the other tables.

create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Stored lowercased/truncated by the API before insert, so unique here is
  -- the single identity check for "one subscription per address".
  email text not null unique,
  status text not null default 'pending',
  -- Opaque random tokens (base64url, 32 bytes). Confirm and unsubscribe use
  -- separate links so a leaked one cannot do the other job. Rotated when an
  -- unsubscribed address re-subscribes (old links then point at nothing).
  confirm_token text not null unique,
  unsub_token text not null unique,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  constraint subscribers_status_check
    check (status in ('pending', 'confirmed', 'unsubscribed'))
);

alter table public.subscribers enable row level security;
