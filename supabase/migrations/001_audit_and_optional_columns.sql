-- Opcional: ejecutar en Supabase SQL si se desea auditoría remota y columnas extra.
-- La app funciona sin esta migración (auditoría local + REST opcional).

create table if not exists public.audit_events (
  id text primary key,
  organization_id text not null default 'default-org',
  timestamp timestamptz not null default now(),
  actor_user_id text not null,
  actor_name text,
  action text not null,
  resource_type text not null,
  resource_id text not null,
  details jsonb default '{}'::jsonb
);

create index if not exists idx_audit_events_org_time on public.audit_events (organization_id, timestamp desc);

-- Columnas opcionales en datapoints (si aún no existen)
alter table public.datapoints add column if not exists reporting_frequency text default 'annual';
alter table public.datapoints add column if not exists assigned_to_user_id text;

alter table public.standards add column if not exists organization_id text;
