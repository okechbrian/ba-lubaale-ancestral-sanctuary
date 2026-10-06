-- Voucher hardening: (a) redact a delivered voucher email's body in the
-- database, (b) create a voucher purchase's two rows atomically.

-- ---------------------------------------------------------------------------
-- (a) Redaction is a DATABASE rule, not an app convention.
--
-- A voucher code lives in exactly one retrievable place: the queued email
-- body, because after the issuing transaction commits the SHA-256 digest is
-- all that remains and nobody could recover the code from it. That is
-- deliberate — it is what makes a crash after commit recoverable.
--
-- But a delivered row has served its purpose. Leaving a redeemable code in
-- email_outbox means the buyer's ability to use their voucher is permanently
-- coupled to that row surviving: anyone with database read access (a leak, a
-- stale backup, a support query) could spend it. So once delivery is
-- confirmed, the body is overwritten.
--
-- Doing it in SQL means the guarantee cannot be skipped by a future caller
-- that marks a row sent with a plain UPDATE, and it cannot be applied before
-- the send — the redaction is part of the same statement that records success.
--
-- Which categories: any category beginning with "voucher" (currently
-- voucher_issued_buyer, voucher_issued_recipient, voucher_issued_owner).
-- Ordinary payment emails keep their body: they carry no secret, and the
-- owner reads them in /admin/emails.
-- ---------------------------------------------------------------------------

create or replace function public.mark_email_outbox_sent(p_id uuid)
returns setof public.email_outbox
language sql
volatile
as $$
  update public.email_outbox
     set status = 'sent',
         sent_at = now(),
         last_error = null,
         next_attempt_at = now(),
         updated_at = now(),
         -- Voucher mail carries a redeemable secret; overwrite it in the same
         -- statement that records the successful delivery.
         body = case
                  when category like 'voucher%'
                    then '[redacted after delivery]'
                  else body
                end
   where id = p_id
  returning *;
$$;

comment on function public.mark_email_outbox_sent(uuid) is
  'Marks an outbox row delivered. For voucher categories the body is overwritten with [redacted after delivery] in the same statement, so the redeemable code cannot be read back out of the database.';

-- ---------------------------------------------------------------------------
-- (b) A voucher purchase is two rows: the payment and the request (who bought
-- it, and the optional gift recipient). They used to be two separate inserts,
-- which left a real failure mode: a crash between them left a payment with no
-- voucher request, and the IPN — which needs the recipient address to compose
-- the email — had nothing to send. That path logged an error and still acked
-- 200, so the guest was paid and never told.
--
-- One RPC, one transaction: either both rows exist or neither does.
-- ---------------------------------------------------------------------------

create function public.create_voucher_purchase(
  p_amount_usd numeric(10, 2),
  p_amount_ugx bigint,
  p_provider_ref text,
  p_buyer_email text,
  p_buyer_name text default null,
  p_recipient_email text default null
) returns jsonb
language plpgsql
as $$
declare
  v_payment public.payments%rowtype;
begin
  if p_amount_usd is null or p_amount_usd <= 0 then
    raise exception 'voucher amount must be positive';
  end if;
  if p_amount_ugx is null or p_amount_ugx <= 0 then
    raise exception 'voucher UGX amount must be positive';
  end if;

  insert into public.payments
    (booking_id, subject_kind, kind, amount_usd, amount_ugx, currency,
     provider, provider_ref, status)
  values
    (null, 'voucher', 'deposit', p_amount_usd, p_amount_ugx, 'UGX',
     'pesapal', p_provider_ref, 'pending')
  returning * into v_payment;

  insert into public.voucher_requests
    (payment_id, amount_usd, buyer_email, buyer_name, recipient_email)
  values
    (v_payment.id, p_amount_usd, p_buyer_email, p_buyer_name, p_recipient_email);

  return jsonb_build_object(
    'id', v_payment.id,
    'amount_usd', v_payment.amount_usd,
    'amount_ugx', v_payment.amount_ugx
  );
end;
$$;

comment on function public.create_voucher_purchase(numeric, bigint, text, text, text, text) is
  'Creates a voucher payment and its matching voucher_requests row in ONE transaction, so a paid voucher can never exist without the details the IPN needs to email the code.';

-- ---------------------------------------------------------------------------
-- The IPN must fail loudly when the request row is missing, instead of acking
-- a paid voucher nobody was told about. This function exists so that condition
-- is a single, testable statement in the database rather than an app-level
-- guess about what "missing" means.
-- ---------------------------------------------------------------------------

create or replace function public.voucher_request_for_payment(p_payment_id uuid)
returns public.voucher_requests
language sql
stable
as $$
  select * from public.voucher_requests where payment_id = p_payment_id;
$$;

comment on function public.voucher_request_for_payment(uuid) is
  'The voucher request for a payment, or NULL. The IPN treats NULL as a hard failure (503) so the provider retries.';