-- ============================================================================
-- F1.1 — Integración Carbon → ESG Reporting Suite (puente 1/3)
-- Unifica el ENUM de roles de public.users (ESG + Carbon) y arregla el trigger
-- de bootstrap para que delegue la asignación de organización a la app.
-- ============================================================================
-- Contexto: ESG arrancó con roles {'Sustainability Lead','Data Owner','Auditor'}
-- y Carbon usa {'admin','analyst','client','auditor'}. Como Carbon es un módulo
-- de ESG, unificamos en un único ENUM snake_case que cubre ambos paradigmas.
-- El trigger handle_new_auth_user antes asignaba todos los users nuevos a una
-- "Default Organization" hardcoded; ahora deja organization_id=NULL y delega
-- la creación de la org real a ensureUserProfile() en la app.

-- 1. Reemplaza el CHECK de users.role para aceptar el ENUM unificado.
alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check
  check (role::text = any (array[
    'admin',
    'sustainability_lead',
    'analyst',
    'data_owner',
    'client',
    'auditor'
  ]::text[]));

-- Default canónico (Carbon usa 'data_owner' como rol mínimo escritura).
alter table public.users alter column role set default 'data_owner';

-- 2. Reescribe el trigger de bootstrap.
--    - role='data_owner' (snake_case canónico).
--    - organization_id=NULL: la app decide via ensureUserProfile().
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  insert into public.users (id, email, name, role, department, avatar, organization_id)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, 'user'), '@', 1)
    ),
    'data_owner',
    'Sustainability Office',
    upper(left(coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, 'U'), '@', 1)), 2)),
    null
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, public.users.email),
    name = coalesce(nullif(public.users.name, ''), excluded.name);
  return new;
end;
$$;
