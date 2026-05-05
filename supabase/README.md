# supabase/

Configuración del proyecto Supabase para GEShop.

**Proyecto remoto creado por Marcos:** `dkfwfculonlnhoabxszw`
Dashboard: https://supabase.com/dashboard/project/dkfwfculonlnhoabxszw

## Estructura

```
supabase/
├── config.toml                # Config del proyecto local (CLI)
├── migrations/                # SQL versionado por timestamp
└── functions/
    └── gemini-proxy/          # Edge Function para llamadas a Gemini
        └── index.ts
```

## Setup local (una vez por dev)

```bash
# Instalar la CLI
brew install supabase/tap/supabase   # macOS
# o
pnpm dlx supabase --version          # vía pnpm

# Vincular este folder al proyecto remoto
supabase login
supabase link --project-ref dkfwfculonlnhoabxszw

# Aplicar migraciones del repo al proyecto remoto
# (En F0 todavía no hay migraciones; en F1 se trasplantan las 21 de carbon)
supabase db push

# Desplegar la Edge Function
supabase functions deploy gemini-proxy --project-ref dkfwfculonlnhoabxszw

# Configurar el secreto de Gemini (NUNCA en .env del cliente)
supabase secrets set GEMINI_API_KEY=tu_clave --project-ref dkfwfculonlnhoabxszw
```

## Variables de entorno · apps/web/.env.local

Saca las claves del dashboard (https://supabase.com/dashboard/project/dkfwfculonlnhoabxszw/settings/api):

```
NEXT_PUBLIC_SUPABASE_URL=https://dkfwfculonlnhoabxszw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key del dashboard>
SUPABASE_SERVICE_ROLE_KEY=<service_role key del dashboard — solo server>
```

## Migraciones · F1

Las migraciones de carbon-intelligence (21 ficheros SQL) se copian aquí en F1:

```bash
cp ../nfq-carbon-intelligence/supabase/migrations/*.sql supabase/migrations/
supabase db push
```

> **Importante:** el proyecto Supabase de carbon en prod (`wvxhreyogkmfthmioird`) ya tiene esas migraciones aplicadas. El proyecto de GEShop (`dkfwfculonlnhoabxszw`) está vacío — es un proyecto distinto. Aplicarlas de cero aquí.

Nuevas migraciones de F2+ siguen el patrón `YYYYMMDDHHMMSS_descripcion.sql`.

## Importante: dos proyectos Supabase coexisten temporalmente

| Proyecto | Ref | Uso |
|---|---|---|
| `nfq-carbon-intelligence` (prod actual) | `wvxhreyogkmfthmioird` | Carbon en prod. Mantenimiento mínimo, no tocar |
| **GEShop** | **`dkfwfculonlnhoabxszw`** | **Donde trabajamos. Empieza vacío en F0** |

Cuando GEShop alcance paridad funcional (cierre F1) y migremos los datos, el proyecto de carbon se archiva.
