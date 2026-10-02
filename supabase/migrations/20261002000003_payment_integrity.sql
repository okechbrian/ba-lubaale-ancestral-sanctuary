-- Payment integrity: (a) one atomic transaction for payment completion +
-- booking status, (b) a hard guarantee that approved/paid bookings can never
-- overlap. btree_gist lets the EXCLUDE constraint use GiST indexes on dates.

create extension if not exists btree_gist;

-- (b) Overlap guard: any write that puts a booking into approved/paid is
-- checked against every other approved/paid booking. Half-open [check_in,
-- check_out) matches lib/booking/availability.ts — a guest checking out on
-- day X leaves day X free for the next check-in. Pending/declined rows are
-- exempt (guests may request dates that are already taken).
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (daterange(check_in, check_out, '[)') with &&)
  where (status in ('approved', 'paid'));

-- (a) Atomic apply: provider event claim + payment completion + booking
-- status transition in ONE transaction. Any raise (missing rows, constraint
-- violation, trigger, crash) rolls back all three, so the IPN can return 503
-- and Pesapal's retry re-runs the whole thing from a clean slate.
-- Returns jsonb: {claimed, first_completion, payment_status, booking_status, ...}
create or replace function public.apply_payment_completion(
  p_provider text,
  p_external_id text,
  p_payment_id uuid,
  p_redacted_payload jsonb default null
) returns jsonb
language plpgsql
as $$
declare
  v_payment public.payments%rowtype;
  v_booking public.bookings%rowtype;
  v_claimed boolean := false;
  v_first boolean := false;
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
      'payment_id', p_payment_id
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

  return jsonb_build_object(
    'claimed', true,
    'first_completion', v_first,
    'payment_id', v_payment.id,
    'payment_status', v_payment.status,
    'booking_id', v_booking.id,
    'booking_status', v_booking.status
  );
end;
$$;

-- Readable by the service-role key only in practice (RLS is on with no
-- policies for anon/authenticated; the function runs with invoker rights).
comment on function public.apply_payment_completion(text, text, uuid, jsonb) is
  'Atomic IPN apply: webhook claim + payment completion + booking status in one transaction. Any failure rolls back everything so the provider retry re-applies cleanly.';
