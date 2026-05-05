# GEShop

> Mega suite ESG bajo la marca **GSV — Green Strategic Value**.
>
> Reescritura unificada de [`nfq-carbon-intelligence`](https://github.com/marcosrl94/nfq-carbon-intelligence) y [`nfq-esg-reporting-suite`](https://github.com/marcosrl94/nfq-esg-reporting-suite). Plan estratégico en [`../PLAN_MEGA_SUITE_ESG.md`](../PLAN_MEGA_SUITE_ESG.md).

## Estado

**F0 · Bootstrap.** Monorepo creado, splash funcionando, infra documentada. Carbon real llega en F1.

Roadmap completo: [`docs/ROADMAP.md`](docs/ROADMAP.md). ADRs en [`docs/adr/`](docs/adr/).

> **Nota sobre el repo:** este monorepo vive en `nfq-esg-reporting-suite` (el repo histórico de la POC ESG). El código original ESG está en [`_legacy-esg/`](_legacy-esg/) como referencia para los trasplantes de F2-F3 (componentes, servicios IA, taxonomía ESRS). Cuando F2 y F3 cierren, `_legacy-esg/` se borra. El repo se renombrará a `geshop` en GitHub cuando estabilicemos.

> **Proyecto Supabase:** [`dkfwfculonlnhoabxszw`](https://supabase.com/dashboard/project/dkfwfculonlnhoabxszw) — creado por Marcos. Distinto del de carbon en prod.

---

## Arrancar en local

Pre-requisitos:
- Node.js 20.18+ (`nvm use` lee `.nvmrc`).
- pnpm 9.15+.

```bash
# Ya tienes el repo clonado en local. Desde su raíz:
pnpm install

# Levantar la app
pnpm dev
# → http://localhost:3000

# Otros comandos útiles
pnpm typecheck    # tsc --noEmit en todos los paquetes
pnpm lint         # eslint
pnpm build        # build de producción
pnpm clean        # borra node_modules + .next + .turbo
```

> En F0 la app es solo un splash con el logo y el estado del roadmap. La funcionalidad real (login, dashboards, emissions) llega en F1.

## Variables de entorno

Copia [`apps/web/.env.example`](apps/web/.env.example) a `apps/web/.env.local` y rellena. Supabase y Resend son obligatorios para F1; Gemini es opcional hasta F3.

```bash
cp apps/web/.env.example apps/web/.env.local
$EDITOR apps/web/.env.local
```

## Estructura

```
geshop/
├── apps/
│   └── web/                   # Next.js 16 — la única app activa
├── packages/
│   ├── ui/                    # Componentes compartidos (poblado en F1)
│   ├── db/                    # Cliente Supabase + tipos generados (F1)
│   ├── ai/                    # Wrappers Gemini (F3)
│   └── config/                # ESLint + tsconfig compartidos
├── supabase/
│   ├── config.toml            # CLI de Supabase
│   ├── migrations/            # SQL versionado (vacío en F0)
│   └── functions/
│       └── gemini-proxy/      # Edge Function
├── docs/
│   ├── adr/                   # Architecture Decision Records
│   └── ROADMAP.md             # Estado de fases
└── .github/workflows/
    └── ci.yml                 # typecheck + lint + build
```

## Branding

Identidad visual completa en [`../branding/`](../branding/):
- `geshop-logo.svg` (lockup horizontal, claro)
- `geshop-logo-dark.svg` (invertido para fondos oscuros)
- `geshop-icon.svg` (cuadrado, favicon/app icon)
- `BRAND_GUIDELINES.md`

Los SVGs ya están copiados en [`apps/web/public/branding/`](apps/web/public/branding/).

## Setup inicial · qué te queda por hacer (Marcos)

### 1. GitHub

El repo ya existe en `marcosrl94/nfq-esg-reporting-suite` (donde estabas haciendo la POC ESG). El monorepo nuevo se ha trasplantado a la raíz manteniendo el `.git`. Solo queda commitear la migración:

```bash
git status                                 # debería ver cientos de cambios (legacy → _legacy-esg + scaffold nuevo)
git add .
git commit -m "feat: convertir el repo en monorepo GEShop bajo marca GSV

- Mueve el código original (Vite + Express) a _legacy-esg/ como referencia
  para los trasplantes de F2-F3 (componentes, services IA, taxonomía ESRS).
- Trae el scaffold geshop a la raíz: monorepo Turborepo + pnpm workspaces,
  apps/web con Next.js 16 + Tailwind 4, packages/{ui,db,ai,config} stubs,
  supabase/{config.toml,functions/gemini-proxy} listos.
- Cablea el proyecto Supabase real: dkfwfculonlnhoabxszw.

Cierra F0 del plan; F1 (trasplante carbon) abre a continuación."
git push origin main
```

Cuando F2/F3 cierren y `_legacy-esg/` ya no haga falta, renombrar el repo en GitHub:
```bash
gh repo rename geshop --repo marcosrl94/nfq-esg-reporting-suite
```

### 2. Supabase (proyecto ya creado: `dkfwfculonlnhoabxszw`)

```bash
# Login + link al proyecto que ya tienes
supabase login
supabase link --project-ref dkfwfculonlnhoabxszw

# Edge Function (la copia de la POC ESG está en supabase/functions/gemini-proxy)
supabase functions deploy gemini-proxy --project-ref dkfwfculonlnhoabxszw
supabase secrets set GEMINI_API_KEY=tu_clave_de_gemini --project-ref dkfwfculonlnhoabxszw

# Migrations en F0 vacío. En F1 se trasplantan las 21 de carbon-intelligence:
# cp ../nfq-carbon-intelligence/supabase/migrations/*.sql supabase/migrations/
# supabase db push
```

### 3. Vercel

1. https://vercel.com/new → importar `marcosrl94/nfq-esg-reporting-suite` (lo que renombraremos a `geshop` más tarde).
2. Root directory: dejar vacío (Vercel detecta el monorepo Turborepo automáticamente). Si pide explicit: `apps/web`.
3. Variables de entorno: copiar las de `apps/web/.env.local` (Supabase URL + anon key + service role key + RESEND_API_KEY).
4. Deploy.

## Convenciones

- **Idioma:** strings de UI en ES por defecto (cliente hispano). i18n EN se añade cuando entre cliente o piloto fuera del mercado ibérico.
- **Sentence case** en todo (no Title Case ni ALL CAPS, salvo el tagline GSV).
- **TypeScript strict.** No `any` salvo justificación en el PR.
- **Server Components por defecto.** `"use client"` solo cuando hace falta interactividad real.
- **Tailwind 4 con tokens** en `var(--color-forest|emerald-brand|sprout|cream|charcoal)`.
- **Migraciones Supabase nunca se editan retroactivamente.** Se añade una nueva migración con timestamp más reciente.

## Política de IA

Resumen — detalle en [`docs/adr/0003-ai-policy.md`](docs/adr/0003-ai-policy.md):

1. La key de Gemini nunca llega al bundle. Solo Edge Function.
2. Cada invocación se loggea en `audit_log_entries`.
3. Confianza visible. Workflow obligatorio "AI-suggested → human approves".
4. Fallback always-on. La IA es additive, never required.

## Licencia

Privado y propietario. Todos los derechos reservados — GSV.
