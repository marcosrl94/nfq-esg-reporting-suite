import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

/**
 * Supabase-js devuelve PostgrestError con { message, code, details, hint }, pero
 * al loguear con console.error(label, err) sale "{}" porque no son propiedades
 * enumerables estándar. Esta función extrae lo útil para que aparezca en el log.
 */
function formatSbError(err: unknown): Record<string, unknown> {
  if (!err || typeof err !== 'object') return { raw: String(err) }
  const e = err as Record<string, unknown>
  return {
    message: e.message,
    code: e.code,
    details: e.details,
    hint: e.hint,
    name: e.name,
  }
}

/**
 * Bootstrap del primer login: asegura que el usuario tenga organization_id.
 *
 * Flujo:
 *  1. El trigger handle_new_auth_user (auth.users INSERT) ya creó la fila en
 *     public.users con role='data_owner' y organization_id=NULL.
 *  2. Cuando el usuario entra al dashboard por primera vez, esta función
 *     comprueba si ya tiene org. Si la tiene, no hace nada.
 *  3. Si no la tiene, crea una organización nueva, asocia al user como
 *     'admin' y persiste la asociación.
 *
 * Si la sesión RLS no puede crear la org (caso edge tras un signup donde el
 * trigger todavía no propagó), reintenta con service role.
 */
export async function ensureUserProfile(): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: existing } = await supabase
    .from('users')
    .select('id, organization_id')
    .eq('id', user.id)
    .maybeSingle()
  if (existing?.organization_id) return // ya tiene org

  const fiscalYear = new Date().getFullYear()
  const orgRow = {
    name: 'Mi organización' as const,
    sectors: [] as string[],
    geographies: [] as string[],
    consolidation: 'control_operacional' as const,
    fiscal_year: fiscalYear,
    employees: null as null,
    revenue_eur_m: null as null,
    /** RLS org_select: permite leer la org tras INSERT antes de existir el user-org link. */
    created_by_user_id: user.id,
  }

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert(orgRow)
    .select('id')
    .single()

  if (!orgError && org) {
    const { error: uError } = await supabase
      .from('users')
      .update({ organization_id: org.id, role: 'admin' })
      .eq('id', user.id)
    if (!uError) return
    console.error('[ensureUserProfile] users update (sesión RLS)', formatSbError(uError))

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (url && key) {
      await updateUserOrgWithServiceRole(user, org.id, url, key)
    }
    return
  }

  console.error('[ensureUserProfile] organizations (sesión RLS)', formatSbError(orgError))

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return
  }

  await ensureOrgAndLinkWithServiceRole(user, url, key, orgRow)
}

/** El user ya tiene fila en users, solo falta vincular org_id (caso de fallback). */
async function updateUserOrgWithServiceRole(
  user: User,
  organizationId: string,
  url: string,
  key: string
): Promise<void> {
  const admin = createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })

  const { error } = await admin
    .from('users')
    .update({ organization_id: organizationId, role: 'admin' })
    .eq('id', user.id)

  if (error) {
    console.error('[ensureUserProfile] users update (service role)', formatSbError(error))
  }
}

async function ensureOrgAndLinkWithServiceRole(
  user: User,
  url: string,
  key: string,
  orgRow: {
    name: 'Mi organización'
    sectors: string[]
    geographies: string[]
    consolidation: 'control_operacional'
    fiscal_year: number
    employees: null
    revenue_eur_m: null
    created_by_user_id: string
  }
): Promise<void> {
  const admin = createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })

  const { data: again } = await admin
    .from('users')
    .select('id, organization_id')
    .eq('id', user.id)
    .maybeSingle()
  if (again?.organization_id) return

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert(orgRow)
    .select('id')
    .single()

  if (orgError || !org) {
    console.error('[ensureUserProfile] organizations (service role)', formatSbError(orgError))
    return
  }

  const { error: uErr } = await admin
    .from('users')
    .update({ organization_id: org.id, role: 'admin' })
    .eq('id', user.id)

  if (uErr) {
    console.error('[ensureUserProfile] users update (service role)', formatSbError(uErr))
    await admin.from('organizations').delete().eq('id', org.id)
  }
}
