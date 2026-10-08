-- Admin operational audit: who changed what, when. Used for trust and
-- debugging on /admin, not as an access-control log (admin actions are
-- already session-guarded). No PII beyond ids/names — details must be
-- small, structured keys only.

create table public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  action text not null,
  subject text,
  details jsonb
);

create index admin_audit_created_idx
  on public.admin_audit (created_at desc);

alter table public.admin_audit enable row level security;
