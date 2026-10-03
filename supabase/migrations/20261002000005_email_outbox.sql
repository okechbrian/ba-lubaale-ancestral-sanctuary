-- Transactional email outbox.
--
-- Problem this solves: the IPN used to send payment emails AFTER committing the
-- payment. If the process died in that window (deploy, crash, timeout) the
-- payment was settled and the guest never heard about it — silently, with no
-- record that anything was owed. Sending email from a request handler is
-- exactly the "lost side effect" failure mode.
--
-- Fix: the emails are written INSIDE the same transaction that completes the
-- payment (apply_payment_completion below). Either the payment settles AND the
-- emails are durably queued, or nothing happens at all. A separate processor
-- (route + Vercel cron) drains the queue afterwards, with retries, backoff and
-- a visible failure state the owner can resend by hand.

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- which template produced this (e.g. payment_received_deposit_guest)
  category text not null,
  recipient text not null,
  subject text not null,
  body text not null,
  booking_id uuid references public.bookings(id) on delete set null,
  -- cascade: deleting a payment deletes its undelivered mail with it
  payment_id uuid references public.payments(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  -- human-initiated retries (the Resend button in /admin/emails)
  resends integer not null default 0 check (resends >= 0),
  last_error text,
  -- the processor only picks rows whose backoff has elapsed
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.email_outbox enable row level security;

-- At most one queued email per (payment, category). This is what makes
-- "exactly one delivery per payment" a database guarantee rather than a
-- hopeful code path: a replayed webhook cannot queue a second copy.
create unique index email_outbox_payment_category_key
  on public.email_outbox (payment_id, category);

-- The processor's only query: due pending rows, oldest first.
create index email_outbox_pending_due_idx
  on public.email_outbox (next_attempt_at)
  where status = 'pending';

comment on table public.email_outbox is
  'Durable queue for payment emails, written inside apply_payment_completion so a settled payment can never lose its confirmation.';

-- The RPC gains a parameter, so the old signature must go: Postgres would
-- otherwise keep both and the name would become ambiguous for PostgREST.
drop function if exists public.apply_payment_completion(text, text, uuid, jsonb);

create function public.apply_payment_completion(
  p_provider text,
  p_external_id text,
  p_payment_id uuid,
  p_redacted_payload jsonb default null,
  -- [{"category": "...", "to": "...", "subject": "...", "body": "..."}, ...]
  -- Defaulted, so every existing caller keeps working unchanged.
  p_emails jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
as $$
declare
  v_payment public.payments%rowtype;
  v_booking public.bookings%rowtype;
  v_claimed boolean := false;
  v_first boolean := false;
  v_queued integer := 0;
begin
  -- 1. Idempotency claim. Unique violation = duplicate webhook: report it,
  --    do nothing else (the first delivery owns the work).
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
      'first_completion', false,
      'payment_id', p_payment_id,
      'emails_queued', 0
    );
  end if;

  -- 2. Lock the payment row (serialises concurrent IPNs for the same event).
  select * into v_payment
    from public.payments
   where id = p_payment_id
     for update;
  if not found then
    raise exception 'payment % not found', p_payment_id;
  end if;

  -- 3. Complete exactly once. The partial unique index (one completed row per
  --    booking+kind) backstops double completion across different events.
  if v_payment.status <> 'completed' then
    update public.payments
       set status = 'completed',
           paid_at = now(),
           updated_at = now()
     where id = p_payment_id;
    v_payment.status := 'completed';
    v_first := true;
  end if;

  -- 4. Booking transition — same transaction, cannot be lost separately.
  --    Mirrors lib/payments/state.ts#bookingStatusAfterPayment: a completed
  --    deposit moves approved -> paid; pending/declined never resurrect;
  --    balance completions never change the status.
  select * into v_booking
    from public.bookings
   where id = v_payment.booking_id
     for update;
  if not found then
    raise exception 'booking % not found for payment %', v_payment.booking_id, p_payment_id;
  end if;

  if v_payment.kind = 'deposit'
     and v_booking.status = 'approved' then
    update public.bookings
       set status = 'paid',
           updated_at = now()
     where id = v_booking.id;
    v_booking.status := 'paid';
  end if;

  -- 5. Queue the emails INSIDE this transaction, and only on the first
  --    completion (a replayed webhook must not queue a second copy). Rows with
  --    an empty category/recipient/subject/body are dropped rather than queued
  --    as undeliverable noise.
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
      v_booking.id,
      v_payment.id
    from jsonb_array_elements(p_emails) as e
    where coalesce(e->>'category', '') <> ''
      and coalesce(e->>'to', '') <> ''
      and coalesce(e->>'subject', '') <> ''
      and coalesce(e->>'body', '') <> ''
    on conflict (payment_id, category) do nothing;

    get diagnostics v_queued = row_count;
  end if;

  return jsonb_build_object(
    'claimed', true,
    'first_completion', v_first,
    'payment_id', v_payment.id,
    'payment_status', v_payment.status,
    'booking_id', v_booking.id,
    'booking_status', v_booking.status,
    'emails_queued', v_queued
  );
end;
$$;

comment on function public.apply_payment_completion(text, text, uuid, jsonb, jsonb) is
  'Atomic IPN apply: webhook claim + payment completion + booking status + email-outbox rows in one transaction. Any failure rolls back everything so the provider retry re-applies cleanly.';

-- Take exclusive ownership of one pending row and count the attempt, in a
-- SINGLE statement: the `status = 'pending'` guard is a compare-and-set, so two
-- processors racing on the same row cannot both win (the loser gets zero rows
-- back), and the attempt counter cannot be lost between two round trips.
create function public.claim_email_outbox(p_id uuid)
returns setof public.email_outbox
language sql
volatile
as $$
  update public.email_outbox
     set attempts = attempts + 1,
         next_attempt_at = now() + interval '5 minutes',
         updated_at = now()
   where id = p_id
     and status = 'pending'
  returning *;
$$;

comment on function public.claim_email_outbox(uuid) is
  'Compare-and-set claim of one pending outbox row; returns the claimed row or no rows when another processor won.';

-- Owner-initiated retry from /admin/emails. Resets the attempt counter so the
-- exponential backoff starts fresh, keeps a human counter, and refuses to
-- requeue anything already delivered (a sent email is not "failed").
create function public.requeue_email_outbox(p_id uuid)
returns setof public.email_outbox
language sql
volatile
as $$
  update public.email_outbox
     set status = 'pending',
         attempts = 0,
         resends = resends + 1,
         last_error = null,
         next_attempt_at = now(),
         updated_at = now()
   where id = p_id
     and status <> 'sent'
  returning *;
$$;

comment on function public.requeue_email_outbox(uuid) is
  'Requeue a non-sent outbox row for immediate delivery (admin Resend button).';