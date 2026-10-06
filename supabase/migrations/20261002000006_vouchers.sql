-- Gift vouchers: a guest buys a fixed-amount voucher (amounts come from
-- /admin/settings, never invented here), pays through the same Pesapal hosted
-- checkout, and the IPN completion issues the code atomically.
--
-- Security shape:
--   * the code is 128 bits of CSPRNG output (generated in the app, see
--     lib/vouchers/code.ts) and stored ONLY as a SHA-256 digest, so the
--     vouchers table is useless to an attacker who dumps it;
--   * the raw code exists in exactly one place — the queued email body in
--     email_outbox — because that is what makes a crash-after-commit resendable;
--   * `vouchers.payment_id` is unique, so one payment can never mint two codes,
--     no matter how the provider behaves.

-- A voucher is not tied to a stay, so payments need to exist without a booking.
alter table public.payments
  alter column booking_id drop not null;

-- What the buyer asked for, captured BEFORE checkout. The IPN needs the
-- recipient addresses and name to compose the emails, and a payment row alone
-- does not carry them.
create table public.voucher_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  payment_id uuid not null unique references public.payments (id) on delete cascade,
  amount_usd numeric(10, 2) not null check (amount_usd > 0),
  buyer_email text not null,
  buyer_name text,
  recipient_email text,
  status text not null default 'started'
    check (status in ('started', 'paid', 'void'))
);

create index voucher_requests_email_idx
  on public.voucher_requests (buyer_email, created_at desc);

alter table public.voucher_requests enable row level security;

comment on table public.voucher_requests is
  'What a buyer asked for at checkout. Holds no code — only the details needed to compose the delivery emails.';

alter table public.payments
  add column subject_kind text not null default 'stay'
    check (subject_kind in ('stay', 'voucher'));

comment on column public.payments.subject_kind is
  'stay = deposit/balance for a booking; voucher = a gift voucher purchase with no booking yet.';

create table public.vouchers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- SHA-256 (hex, uppercase) of the code. The code itself is never stored here.
  code_hash text not null unique,
  -- Last four characters, for the owner to recognise a voucher in a list. This
  -- is display-only: it leaves 124 of the 128 bits unknown.
  code_hint text not null,
  -- One payment mints at most one voucher (the double-issue guard).
  payment_id uuid not null unique references public.payments (id) on delete cascade,
  amount_usd numeric(10, 2) not null check (amount_usd > 0),
  amount_ugx bigint not null check (amount_ugx > 0),
  currency text not null default 'UGX',
  buyer_email text not null,
  -- Optional second recipient (a gift for someone else).
  recipient_email text,
  status text not null default 'issued'
    check (status in ('issued', 'redeemed', 'void')),
  issued_at timestamptz not null default now(),
  redeemed_at timestamptz,
  -- Set when the owner marks it used. Nullable + set null so deleting a
  -- booking cannot silently erase the fact that a voucher was spent.
  redeemed_booking_id uuid references public.bookings (id) on delete set null,
  voided_at timestamptz,
  void_reason text
);

alter table public.vouchers enable row level security;

create index vouchers_status_idx on public.vouchers (status, issued_at desc);
create index vouchers_redeemed_booking_idx
  on public.vouchers (redeemed_booking_id)
  where redeemed_booking_id is not null;

comment on table public.vouchers is
  'Gift vouchers. The redeemable code is stored only as a SHA-256 digest; redemption compares digests in constant time.';

-- Atomic voucher issue, mirroring apply_payment_completion: the provider event
-- claim, the payment completion and the code issuance all commit together, so
-- a paid voucher can never be left without a code and a code can never be
-- issued for an unsettled payment.
create function public.apply_voucher_completion(
  p_provider text,
  p_external_id text,
  p_payment_id uuid,
  p_code_hash text,
  p_code_hint text,
  p_buyer_email text,
  p_recipient_email text default null,
  p_redacted_payload jsonb default null,
  -- Same shape as the payment outbox: [{"category","to","subject","body"}, ...]
  p_emails jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
as $$
declare
  v_payment public.payments%rowtype;
  v_voucher public.vouchers%rowtype;
  v_claimed boolean := false;
  v_first boolean := false;
  v_issued boolean := false;
begin
  -- 1. Idempotency claim (unique per provider event).
  begin
    insert into public.webhook_events (provider, external_id, processed, redacted_payload)
    values (p_provider, p_external_id, true, p_redacted_payload);
    v_claimed := true;
  exception when unique_violation then
    v_claimed := false;
  end;

  if not v_claimed then
    return jsonb_build_object(
      'claimed', false,
      'issued', false,
      'payment_id', p_payment_id
    );
  end if;

  -- 2. Lock and complete the payment exactly once.
  select * into v_payment
    from public.payments
   where id = p_payment_id
     for update;
  if not found then
    raise exception 'payment % not found', p_payment_id;
  end if;

  if v_payment.subject_kind <> 'voucher' then
    raise exception 'payment % is not a voucher purchase', p_payment_id;
  end if;

  if v_payment.status <> 'completed' then
    update public.payments
       set status = 'completed',
           paid_at = now(),
           updated_at = now()
     where id = p_payment_id;
    v_payment.status := 'completed';
    v_first := true;
  end if;

  -- 3. Issue the voucher — only on the FIRST completion. A second event for
  --    the same payment (a different tracking id, a provider retry we have not
  --    seen before) finds the payment already completed and issues nothing.
  --    The unique payment_id index is the final backstop.
  if v_first then
    insert into public.vouchers
      (code_hash, code_hint, payment_id, amount_usd, amount_ugx, currency,
       buyer_email, recipient_email)
    values
      (p_code_hash, p_code_hint, p_payment_id, v_payment.amount_usd,
       v_payment.amount_ugx, v_payment.currency, p_buyer_email, p_recipient_email)
    on conflict (payment_id) do nothing
    returning * into v_voucher;

    v_issued := v_voucher.id is not null;
  end if;

  if not v_issued then
    select * into v_voucher
      from public.vouchers
     where payment_id = p_payment_id;
  end if;

  -- 4. Queue the emails in the same transaction (they carry the code, which
  --    exists nowhere else once this request returns).
  if v_first
     and jsonb_typeof(p_emails) = 'array'
     and jsonb_array_length(p_emails) > 0 then
    insert into public.email_outbox
      (category, recipient, subject, body, booking_id, payment_id)
    select
      e->>'category',
      e->>'to',
      e->>'subject',
      e->>'body',
      null,
      v_payment.id
    from jsonb_array_elements(p_emails) as e
    where coalesce(e->>'category', '') <> ''
      and coalesce(e->>'to', '') <> ''
      and coalesce(e->>'subject', '') <> ''
      and coalesce(e->>'body', '') <> ''
    on conflict (payment_id, category) do nothing;
  end if;

  return jsonb_build_object(
    'claimed', true,
    'first_completion', v_first,
    'issued', v_issued,
    'payment_id', v_payment.id,
    'payment_status', v_payment.status,
    'voucher_id', v_voucher.id,
    'code_hint', v_voucher.code_hint
  );
end;
$$;

comment on function public.apply_voucher_completion(text, text, uuid, text, text, text, text, jsonb, jsonb) is
  'Atomic voucher issue: provider claim + payment completion + one unique code (+ queued emails) in a single transaction. A replayed or second event for the same payment issues nothing.';

-- Owner redemption: constant-time digest comparison happens in the app; this
-- function only guards the state machine (issued -> redeemed exactly once,
-- never re-redeemed, never over a different booking).
create function public.redeem_voucher(p_id uuid, p_booking_id uuid)
returns setof public.vouchers
language sql
volatile
as $$
  update public.vouchers
     set status = 'redeemed',
         redeemed_at = now(),
         redeemed_booking_id = p_booking_id,
         updated_at = now()
   where id = p_id
     and status = 'issued'
  returning *;
$$;

comment on function public.redeem_voucher(uuid, uuid) is
  'Mark an issued voucher redeemed against a booking. Returns no rows when it is already redeemed/void, so double redemption is impossible.';