-- ============================================================================
-- F1.1 — Integración Carbon → ESG Reporting Suite (puente 2/3)
-- ALTER aditivo de public.organizations para soportar el módulo Carbon.
-- ============================================================================
-- Las migraciones Carbon (20250423140000+, 20250425180000_base_year) y el
-- bootstrap de la app (apps/web/src/lib/auth/ensure-user-profile.ts) asumen
-- columnas de "Carbon Intelligence" sobre organizations: sectors, geographies,
-- consolidation, employees, revenue_eur_m, fiscal_year, base_year, etc.
--
-- ESG ya tiene la tabla con (id, name, slug, settings, timestamps). Esta
-- migración añade las columnas Carbon faltantes con defaults seguros que no
-- rompen las filas existentes (1 fila "Default Organization" en remoto).

alter table public.organizations
  add column if not exists sectors text[] not null default '{}'::text[],
  add column if not exists geographies text[] not null default '{}'::text[],
  add column if not exists consolidation text not null default 'control_operacional',
  add column if not exists employees integer,
  add column if not exists revenue_eur_m numeric,
  add column if not exists fiscal_year integer not null default extract(year from now())::integer,
  add column if not exists created_by_user_id uuid,
  add column if not exists base_year integer
    check (base_year is null or (base_year >= 1990 and base_year <= 2100)),
  add column if not exists base_year_locked_at timestamptz,
  add column if not exists recalc_threshold_pct numeric not null default 5
    check (recalc_threshold_pct >= 0 and recalc_threshold_pct <= 100);

comment on column public.organizations.sectors is
  'Códigos NACE de los sectores del cliente (Carbon).';
comment on column public.organizations.consolidation is
  'Método de consolidación GHG Protocol (control_operacional | control_financiero | participacion_capital).';
comment on column public.organizations.created_by_user_id is
  'Usuario que creó la org en bootstrap (ensureUserProfile); desbloquea SELECT tras INSERT antes de existir el row de users.';
comment on column public.organizations.base_year is
  'Año base GHG Protocol contra el que se mide progreso. Apunta a un fiscal_year de ghg_inventories.';
comment on column public.organizations.base_year_locked_at is
  'Si está set, el base_year está bloqueado y solo admin puede desbloquearlo.';
comment on column public.organizations.recalc_threshold_pct is
  'Porcentaje de cambio que dispara propuesta de recálculo del base year (default 5% — recomendación GHG Protocol §5).';
