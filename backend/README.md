# Servidor Express (referencia)

El **producto** usa **Supabase** (PostgREST + RLS + Auth) como API principal. Este paquete no es un BFF obligatorio para el front.

## Uso local

```bash
cd backend && npm install
ALLOW_INSECURE_HEADER_AUTH=true npm run dev
```

Sin `ALLOW_INSECURE_HEADER_AUTH=true`, las rutas protegidas responden **503**: la autenticación por cabeceras (`x-user-id`, etc.) está deshabilitada por defecto.

## Producción

No exponer este servicio a Internet sin:

- Verificación JWT (p. ej. token de Supabase con `jwt.verify`),
- CORS restringido (`CORS_ORIGIN` al dominio del front),
- y sustitución del almacenamiento en memoria de `datapointService` por Postgres.

El CRUD en memoria es solo para prototipos.
