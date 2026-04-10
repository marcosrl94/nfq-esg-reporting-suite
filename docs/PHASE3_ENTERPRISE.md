# Fase 3: Enterprise (SSO, multi-entidad, rendimiento)

Guía de implementación cuando un cliente exija integración avanzada. No sustituye a [RUNBOOK.md](../RUNBOOK.md).

## SSO / IdP (SAML, OIDC)

- **Supabase Auth**: configurar proveedor OIDC/SAML en el dashboard del proyecto y mapear claims a `public.users` (trigger `on_auth_user_created` o job de sincronización).
- **Alternativa**: capa B2B (Clerk/Auth0) con token intercambiado por sesión Supabase si el modelo de identidad lo requiere.
- **Checklist**: prueba de logout global, renovación de sesión, usuarios de servicio para integraciones.

## Multi-entidad / multi-país

- Modelo ya referenciado en migraciones `002`–`004` (`organizations`, `organizational_hierarchy`, `reporting_cycles`).
- Completar UI de selección de entidad hija en consolidación y reglas de agregación en servidor (RPC o Edge) para no depender solo del cliente.
- Alinear RLS: cada fila con `organization_id` coherente con el perfil del usuario.

## Rendimiento y caché

- Medir primero: latencia p95 de `get_reporting_pack`, tamaño de payload, consultas N+1.
- **Postgres**: índices en `datapoints(organization_id, reporting_cycle_id)`, revisión de planes EXPLAIN.
- **Caché opcional**: Redis / Upstash solo si hay evidencia de carga; invalidación por `organization_id` + ciclo.
- **CDN**: estáticos ya en Vercel; no duplicar lógica de datos en edge sin necesidad.

## Cumplimiento

- Retención de logs de auditoría acorde a política del cliente.
- Acuerdos de subprocesamiento si se añaden proveedores (IA, email).
