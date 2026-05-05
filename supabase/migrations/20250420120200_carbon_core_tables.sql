-- ============================================================================
-- F1.1 — Integración Carbon → ESG Reporting Suite (puente 3/3)
-- Crea las tablas Carbon-base que faltan en el esquema unificado.
-- ============================================================================
-- Las 21 migraciones del trasplante Carbon asumen estas 5 tablas existen
-- (referencias en RLS, triggers, FKs, ALTERs). En Carbon original se crearon
-- vía Supabase Dashboard antes del repo; aquí las creamos vía migración.
--
-- Diferencias deliberadas vs el shape Carbon en producción
-- (project ref wvxhreyogkmfthmioird):
--   · NO se crea public.profiles. Usamos public.users (modelo unificado ESG).
--   · NO se crea public.audit_log_entries. Usamos public.audit_logs (ESG).
--   · emission_entries se crea con TODAS las columnas finales (data_quality_tier,
--     scope2_method, conversion_factor, quantity_input/unit), de modo que las
--     migraciones Carbon posteriores (20250425120000, 130000, 160000, 210000)
--     que añadirían estas columnas se vuelven idempotentes (ADD COLUMN IF NOT EXISTS).

-- Enum inventory_status (Carbon) ─────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'inventory_status') then
    create type public.inventory_status as enum ('draft', 'submitted', 'verified');
  end if;
end $$;

-- ghg_inventories ────────────────────────────────────────────────────────────
create table if not exists public.ghg_inventories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  fiscal_year integer not null check (fiscal_year >= 1990 and fiscal_year <= 2100),
  ef_source text default 'mixed',
  status public.inventory_status default 'draft',
  submitted_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ghg_inventories_org on public.ghg_inventories(organization_id);
create index if not exists idx_ghg_inventories_org_year on public.ghg_inventories(organization_id, fiscal_year);

drop trigger if exists update_ghg_inventories_updated_at on public.ghg_inventories;
create trigger update_ghg_inventories_updated_at
  before update on public.ghg_inventories
  for each row execute function public.update_updated_at_column();

-- emission_entries (con todas las columnas finales del trasplante v1.2) ──────
create table if not exists public.emission_entries (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.ghg_inventories(id) on delete cascade,
  scope text not null check (scope in ('s1', 's2', 's3')),
  category text,
  subcategory text,
  quantity numeric,
  unit text,
  ef_value numeric,
  ef_source text,
  tco2e numeric,
  -- factor_id: la FK a public.emission_factors la añade la migración 20250424160000
  factor_id uuid,
  data_quality_tier smallint not null default 3 check (data_quality_tier in (1, 2, 3)),
  data_quality_notes text,
  -- scope2_method: la columna se crea aquí pero los CHECK constraints de
  -- valores válidos y consistencia con scope los añade la migración Carbon
  -- 20250425130000_scope2_method.sql para preservar trazabilidad histórica.
  scope2_method text,
  quantity_input numeric,
  quantity_input_unit text,
  conversion_factor numeric not null default 1 check (conversion_factor > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.emission_entries.factor_id is
  'FK opcional al catálogo de factores. Para trazabilidad histórica usar también ef_value/ef_source (snapshot).';
comment on column public.emission_entries.data_quality_tier is
  'ESRS/CSRD data quality tier. 1=primary+supplier-specific · 2=primary+generic catalog · 3=spend-based/estimado.';
comment on column public.emission_entries.scope2_method is
  'GHG Protocol Scope 2 dual reporting. Sólo aplica cuando scope=s2.';
comment on column public.emission_entries.conversion_factor is
  'Multiplicador de quantity_input → quantity (=1 si no hubo conversión).';

create index if not exists idx_emission_entries_inventory on public.emission_entries(inventory_id);
create index if not exists idx_emission_entries_scope on public.emission_entries(scope);

drop trigger if exists update_emission_entries_updated_at on public.emission_entries;
create trigger update_emission_entries_updated_at
  before update on public.emission_entries
  for each row execute function public.update_updated_at_column();

-- decarb_targets ─────────────────────────────────────────────────────────────
create table if not exists public.decarb_targets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  framework text,
  target_year integer check (target_year is null or (target_year >= 1990 and target_year <= 2100)),
  reduction_s1 numeric,
  reduction_s2 numeric,
  reduction_s3 numeric,
  curve_type text default 'linear',
  levers jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_decarb_targets_org on public.decarb_targets(organization_id);

drop trigger if exists update_decarb_targets_updated_at on public.decarb_targets;
create trigger update_decarb_targets_updated_at
  before update on public.decarb_targets
  for each row execute function public.update_updated_at_column();

-- regulatory_disclosures ─────────────────────────────────────────────────────
create table if not exists public.regulatory_disclosures (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.ghg_inventories(id) on delete cascade,
  framework text not null check (framework in ('TCFD', 'ESRS', 'AMBOS')),
  disclosure_id text not null,
  content text,
  status text default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_regulatory_disclosures_inventory on public.regulatory_disclosures(inventory_id);

drop trigger if exists update_regulatory_disclosures_updated_at on public.regulatory_disclosures;
create trigger update_regulatory_disclosures_updated_at
  before update on public.regulatory_disclosures
  for each row execute function public.update_updated_at_column();

-- invitations ────────────────────────────────────────────────────────────────
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  email text not null,
  role text default 'client'
    check (role::text = any (array['admin','sustainability_lead','analyst','data_owner','client','auditor']::text[])),
  token text unique default encode(extensions.gen_random_bytes(32), 'hex'),
  accepted boolean default false,
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create index if not exists idx_invitations_org on public.invitations(organization_id);
create unique index if not exists idx_invitations_token on public.invitations(token);

-- RLS habilitado pero sin policies (se crean en las migraciones Carbon
-- adaptadas: 20250423140000_rls_and_audit_triggers + 20250425170000_rls_role_matrix).
alter table public.ghg_inventories enable row level security;
alter table public.emission_entries enable row level security;
alter table public.decarb_targets enable row level security;
alter table public.regulatory_disclosures enable row level security;
alter table public.invitations enable row level security;
