-- Booking lifecycle: cancelled/completed statuses, hold expiry, balance
-- reminders, and voucher credit recorded on the booking.

-- (a) Lifecycle statuses.
alter type public.booking_status add value if not exists 'cancelled';
alter type public.booking_status add value if not exists 'completed';

-- Pesapal refunds stay manual; we only record the outcome.
alter type public.payment_status add value if not exists 'refunded';

-- (a) Refund note + (b) hold expiry timestamp + (c) balance due metadata.
alter table public.bookings
  add column if not exists cancelled_at timestamptz,
  add column if not exists refund_note text,
  add column if not exists payment_due_at timestamptz,
  add column if not exists balance_due_date date,
  add column if not exists balance_reminder_7d_sent boolean not null default false,
  add column if not exists balance_reminder_1d_sent boolean not null default false,
  add column if not exists redeemed_voucher_id uuid references public.vouchers(id) on delete set null,
  add column if not exists voucher_credit_usd numeric(12,2);

-- (b) The sweep filters by payment_due_at; this keeps it an index scan.
create index if not exists bookings_payment_due_idx
  on public.bookings (payment_due_at)
  where status = 'approved' and payment_due_at is not null;

-- (c) Reminder sweep filters 'paid' rows by check_in.
create index if not exists bookings_checkin_idx
  on public.bookings (check_in)
  where status = 'paid';

comment on column public.bookings.redeemed_voucher_id is
  'Voucher redeemed against this booking, if any. voucher_credit_usd records its value.';

-- (d) Redeem a voucher AND record its credit on the booking in ONE transaction:
-- mark the voucher redeemed, then subtract its value from the booking total.
create or replace function public.redeem_voucher_and_credit(p_id uuid, p_booking_id uuid)
returns setof public.vouchers
language plpgsql
as $$
declare
  v_voucher public.vouchers;
begin
  update public.vouchers
     set status = 'redeemed',
         redeemed_at = now(),
         redeemed_booking_id = p_booking_id,
         updated_at = now()
   where id = p_id
     and status = 'issued'
  returning * into v_voucher;
  if not found then
    return;
  end if;

  update public.bookings
     set redeemed_voucher_id = v_voucher.id,
         voucher_credit_usd = v_voucher.amount_usd,
         amount_usd = greatest(0, coalesce(amount_usd, 0) - v_voucher.amount_usd),
         updated_at = now()
   where id = p_booking_id;

  return next v_voucher;
end;
$$;

comment on function public.redeem_voucher_and_credit(uuid, uuid) is
  'Mark an issued voucher redeemed against a booking and credit its value to the booking amount, atomically. Double redemption returns no rows.';
