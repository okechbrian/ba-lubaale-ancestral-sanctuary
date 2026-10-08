-- Monthly online fire circle.
-- A person asks. The owner approves. Only then can they pay.
-- The fee is whatever she saved. Null means the circle is not for sale.
-- The seat token is stored only as a SHA-256 digest.

alter table public.payments drop constraint if exists payments_subject_kind_check;
alter table public.payments
  add constraint payments_subject_kind_check
  check (subject_kind in ('stay', 'voucher', 'fire_circle'));

create table public.fire_circle_config (
  id int primary key default 1 check (id = 1),
  fee_usd numeric(10, 2) check (fee_usd is null or fee_usd >= 1),
  join_url text,
  updated_at timestamptz not null default now()
);

insert into public.fire_circle_config (id) values (1);

alter table public.fire_circle_config enable row level security;

create table public.fire_circle_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  message text not null,
  status text not null default 'requested'
    check (status in ('requested', 'approved', 'paid', 'declined')),
  token_hash text unique,
  fee_usd numeric(10, 2),
  payment_id uuid unique references public.payments (id) on delete set null,
  approved_at timestamptz,
  paid_at timestamptz
);

create index fire_circle_requests_status_idx
  on public.fire_circle_requests (status, created_at desc);

alter table public.fire_circle_requests enable row level security;

comment on table public.fire_circle_requests is
  'Requests for the monthly online fire circle. The seat link token is stored only as a SHA-256 digest.';

create function public.create_fire_circle_payment(
  p_request_id uuid,
  p_amount_usd numeric,
  p_amount_ugx bigint,
  p_provider_ref text
) returns uuid
language plpgsql
as $$
declare
  v_payment_id uuid;
begin
  if p_amount_usd is null or p_amount_usd < 1 then
    raise exception 'fire circle fee is not set';
  end if;

  insert into public.payments (
    booking_id, kind, amount_usd, amount_ugx, currency, provider, provider_ref,
    status, subject_kind
  ) values (
    null, 'deposit', p_amount_usd, p_amount_ugx, 'UGX', 'pesapal', p_provider_ref,
    'pending', 'fire_circle'
  )
  returning id into v_payment_id;

  update public.fire_circle_requests
     set payment_id = v_payment_id
   where id = p_request_id
     and status = 'approved'
     and payment_id is null
     and fee_usd = p_amount_usd;

  if not found then
    raise exception 'fire circle request cannot take a payment';
  end if;

  return v_payment_id;
end;
$$;

create function public.apply_fire_circle_completion(
  p_provider text,
  p_external_id text,
  p_payment_id uuid,
  p_redacted_payload jsonb default null,
  p_emails jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
as $$
declare
  v_payment public.payments%rowtype;
  v_claimed boolean := false;
  v_first boolean := false;
begin
  begin
    insert into public.webhook_events (provider, external_id, processed, redacted_payload)
    values (p_provider, p_external_id, true, p_redacted_payload);
    v_claimed := true;
  exception when unique_violation then
    v_claimed := false;
  end;

  if not v_claimed then
    return jsonb_build_object('claimed', false, 'payment_id', p_payment_id);
  end if;

  select * into v_payment
    from public.payments
   where id = p_payment_id
     for update;
  if not found then
    raise exception 'payment % not found', p_payment_id;
  end if;
  if v_payment.subject_kind <> 'fire_circle' then
    raise exception 'payment % is not a fire circle seat', p_payment_id;
  end if;

  if v_payment.status <> 'completed' then
    update public.payments
       set status = 'completed', paid_at = now(), updated_at = now()
     where id = p_payment_id;
    v_first := true;
  end if;

  if v_first then
    update public.fire_circle_requests
       set status = 'paid', paid_at = now()
     where payment_id = p_payment_id
       and status = 'approved';
  end if;

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
    'payment_id', v_payment.id
  );
end;
$$;
