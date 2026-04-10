import { User, Role, Department } from '../types';
import { supabase } from './supabaseClient';
import { setActiveOrganizationId } from './dataPlane';

function mapRowToUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    name: String(row.name ?? 'User'),
    role: (row.role as Role) || Role.EDITOR,
    department: (row.department as Department) || Department.SUSTAINABILITY,
    avatar: String(row.avatar ?? 'U'),
    organizationId: row.organization_id ? String(row.organization_id) : undefined,
    email: row.email ? String(row.email) : undefined
  };
}

function syncOrganizationFromUser(user: User): void {
  if (user.organizationId) {
    setActiveOrganizationId(user.organizationId);
  }
}

/**
 * Sesión Supabase Auth + perfil en tabla `users` (si existe).
 */
export async function signInWithEmailPassword(
  email: string,
  password: string
): Promise<{ user: User | null; error: Error | null }> {
  if (!supabase) {
    return { user: null, error: new Error('Supabase no configurado') };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { user: null, error: error || new Error('Credenciales inválidas') };
  }

  const uid = data.user.id;
  const { data: rows } = await supabase
    .from('users')
    .select('*')
    .eq('id', uid)
    .maybeSingle();

  if (rows) {
    const u = mapRowToUser(rows as Record<string, unknown>);
    syncOrganizationFromUser(u);
    return { user: u, error: null };
  }

  const meta = data.user.user_metadata || {};
  const fallback: User = {
    id: uid,
    name: String(meta.name || data.user.email?.split('@')[0] || 'Usuario'),
    role: (meta.role as Role) || Role.EDITOR,
    department: (meta.department as Department) || Department.SUSTAINABILITY,
    avatar: String(meta.avatar || 'U'),
    email: data.user.email ?? undefined
  };
  syncOrganizationFromUser(fallback);
  return { user: fallback, error: null };
}

export async function signOutSupabase(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
}

export async function getSessionUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const uid = session.user.id;
  const { data: rows } = await supabase
    .from('users')
    .select('*')
    .eq('id', uid)
    .maybeSingle();

  if (rows) {
    const u = mapRowToUser(rows as Record<string, unknown>);
    syncOrganizationFromUser(u);
    return u;
  }

  const meta = session.user.user_metadata || {};
  const fallback: User = {
    id: uid,
    name: String(meta.name || session.user.email?.split('@')[0] || 'Usuario'),
    role: (meta.role as Role) || Role.EDITOR,
    department: (meta.department as Department) || Department.SUSTAINABILITY,
    avatar: String(meta.avatar || 'U'),
    email: session.user.email ?? undefined
  };
  syncOrganizationFromUser(fallback);
  return fallback;
}
