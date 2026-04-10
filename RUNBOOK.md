# Runbook: despliegue Supabase + Vercel

Guía operativa para publicar **NFQ ESG Reporting Suite** sin depender del plan interno.

## Prerrequisitos

- Proyecto en [Supabase](https://supabase.com) (Postgres + Auth + Storage + Edge Functions).
- Proyecto en [Vercel](https://vercel.com) enlazado al repositorio (SPA Vite).
- Node 18+ y `npm` localmente para builds.

## 1. Base de datos (Supabase)

1. Crea el proyecto o usa uno existente.
2. Aplica migraciones en orden desde `supabase/migrations/` (CLI o SQL Editor):
   ```bash
   supabase db push
   ```
   o ejecuta cada archivo `.sql` manualmente si no usas CLI.
3. Confirma que **Auth** tiene usuarios y la tabla `public.users` enlaza `id` con `auth.users` y `organization_id` según tu proceso de alta.

## 2. Edge Function Gemini (producción)

La clave de Gemini **no** debe ir en variables `VITE_*` en producción.

```bash
supabase secrets set GEMINI_API_KEY=tu_clave --project-ref TU_PROJECT_REF
supabase functions deploy gemini-proxy --project-ref TU_PROJECT_REF
```

En Vercel, define:

- `VITE_GEMINI_USE_PROXY=true`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

No definas `VITE_GEMINI_API_KEY` en producción.

## 3. Frontend (Vercel)

Variables de entorno (Production / Preview):

| Variable | Uso |
|----------|-----|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima (pública) |
| `VITE_GEMINI_USE_PROXY` | `true` en producción |
| `VITE_USE_REPORTING_PACK_RPC` | `true` si usas RPC `get_reporting_pack` |
| `VITE_SENTRY_DSN` | Opcional: informes de error |
| `VITE_SENTRY_RELEASE` | Opcional: SHA de commit o versión (ver releases en Sentry) |

Tras cambiar variables: redeploy.

## 4. Checklist de release

- [ ] Migraciones aplicadas (incluida `008_users_rls_org_scope` si aplica).
- [ ] `gemini-proxy` desplegada y secreto `GEMINI_API_KEY` configurado.
- [ ] Variables Vercel revisadas (sin API key de Gemini en `VITE_*`).
- [ ] Smoke: login, carga de datos, pantalla de espacio de trabajo (org/ciclo) si aplica.
- [ ] Sentry: comprobar que llegan eventos de prueba si está activo.

## 5. Rollback

- **Vercel**: Promote deployment anterior o revert del commit.
- **Supabase**: Restaurar backup o revertir migración manualmente (planificar antes cambios destructivos).

## Referencias en código

- Fuente de verdad del cliente: [`services/dataPlane.ts`](services/dataPlane.ts)
- API de datos: [`services/apiService.ts`](services/apiService.ts)
- Proxy IA: [`supabase/functions/gemini-proxy/index.ts`](supabase/functions/gemini-proxy/index.ts)
