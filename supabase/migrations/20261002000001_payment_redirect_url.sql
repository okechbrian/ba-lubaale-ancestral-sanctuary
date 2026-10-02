-- Hosted-checkout redirect URL kept server-side so the admin can re-open or
-- re-email an existing Pesapal attempt without creating a duplicate order.
alter table public.payments add column redirect_url text;
