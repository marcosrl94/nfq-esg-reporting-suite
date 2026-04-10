/**
 * Decisión de arquitectura: fuente de verdad única para el producto.
 * Supabase (Postgres + Auth + Storage) es el backend principal del cliente.
 * El servidor Express en /backend queda como referencia legacy / procesos batch futuros,
 * no como API consumida por el front en paralelo con Supabase.
 */
export const PRIMARY_DATA_PLANE = 'supabase' as const;

/** El front debe usar apiService + Supabase Auth; no llamar a Express para CRUD de datapoints. */
export const EXPRESS_BACKEND_DEPRECATED_FOR_CLIENT = true;

/** UUID de la organización por defecto en migraciones SQL (002). */
export const DEFAULT_ORGANIZATION_SQL_ID = '00000000-0000-0000-0000-000000000001';

export function getActiveOrganizationId(): string {
  if (typeof window === 'undefined') return 'default-org';
  try {
    const stored = localStorage.getItem('nfq_active_organization_id');
    if (stored) return stored;
  } catch {
    /* ignore */
  }
  return import.meta.env.VITE_ORGANIZATION_ID || 'default-org';
}

/** Resuelve a UUID de Postgres para RPC / filtros PostgREST. */
export function resolveOrganizationIdForApi(): string {
  const o = getActiveOrganizationId();
  if (!o || o === 'default-org') return DEFAULT_ORGANIZATION_SQL_ID;
  return o;
}

export function setActiveOrganizationId(organizationId: string): void {
  try {
    localStorage.setItem('nfq_active_organization_id', organizationId);
  } catch {
    /* ignore */
  }
}

export function getCurrentActorId(): string {
  try {
    return localStorage.getItem('nfq_current_user_id') || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

export function setCurrentActorId(userId: string): void {
  try {
    localStorage.setItem('nfq_current_user_id', userId);
  } catch {
    /* ignore */
  }
}

const REPORTING_CYCLE_STORAGE_KEY = 'nfq_active_reporting_cycle_id';
const WORKSPACE_DONE_KEY = 'nfq_workspace_onboarding_done';

/** UUID del ciclo de reporting activo (localStorage o `VITE_REPORTING_CYCLE_ID`). */
export function getActiveReportingCycleId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(REPORTING_CYCLE_STORAGE_KEY);
    if (stored && /^[0-9a-f-]{36}$/i.test(stored)) return stored;
  } catch {
    /* ignore */
  }
  const env = import.meta.env.VITE_REPORTING_CYCLE_ID;
  if (typeof env === 'string' && /^[0-9a-f-]{36}$/i.test(env)) return env;
  return null;
}

export function setActiveReportingCycleId(cycleId: string | null): void {
  try {
    if (cycleId && /^[0-9a-f-]{36}$/i.test(cycleId)) {
      localStorage.setItem(REPORTING_CYCLE_STORAGE_KEY, cycleId);
    } else {
      localStorage.removeItem(REPORTING_CYCLE_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

/** Valor pasado a RPC `get_reporting_pack` cuando aplica filtro por ciclo. */
export function resolveReportingCycleIdForApi(): string | null {
  return getActiveReportingCycleId();
}

export function isWorkspaceOnboardingDone(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(WORKSPACE_DONE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setWorkspaceOnboardingDone(done: boolean): void {
  try {
    if (done) localStorage.setItem(WORKSPACE_DONE_KEY, '1');
    else localStorage.removeItem(WORKSPACE_DONE_KEY);
  } catch {
    /* ignore */
  }
}
