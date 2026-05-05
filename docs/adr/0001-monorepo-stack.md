# ADR-0001 · Monorepo Turborepo + pnpm + stack base

- Estado: **Aceptada**
- Fecha: 2026-05-04
- Decisor: Marcos
- Contexto del plan: §3.3 y §7 de [PLAN_MEGA_SUITE_ESG.md](../../../PLAN_MEGA_SUITE_ESG.md)

## Contexto

GEShop nace como reescritura unificada de `nfq-carbon-intelligence` (Next.js 16 + Supabase SSR, en prod) y `nfq-esg-reporting-suite` (Vite + Gemini, POC). Necesitamos una estructura de código que:

1. Permita reusar dominios y UI entre apps futuras (web, mobile, BI cuando lleguen).
2. Mantenga el stack moderno y SSR-first del producto en prod (carbon-intelligence).
3. Sea operable por una persona + IA al arranque (sin overhead de infra grande).

## Decisión

- **Monorepo Turborepo + pnpm workspaces.**
- **Una sola app activa: `apps/web`** (Next.js 16.2.4 + React 19.2.4 + Tailwind 4 + Supabase SSR).
- **Paquetes internos vacíos pero declarados** desde día uno: `packages/ui`, `packages/db`, `packages/ai`, `packages/config`. Se pueblan en F1-F3.
- **TypeScript strict** con `tsconfig.base.json` heredado por todos los paquetes.
- **Versiones congeladas** en `packageManager` y `.nvmrc` para reproducibilidad.

## Stack confirmado

| Capa | Tecnología | Razón |
|---|---|---|
| Framework | Next.js 16.2.4 | Mismo que carbon-intelligence en prod. SSR + Server Actions necesarios para enterprise |
| UI runtime | React 19.2.4 | Mismo que ambos repos |
| Estilos | Tailwind 4 (CSS-first config) | Mismo que carbon |
| Lenguaje | TypeScript 5.7+ | Strict mode |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) | Decidido en ADR-0002 |
| Email | Resend | Mismo que carbon (invitations) |
| IA | Google Gemini vía Edge Function | Decidido en ADR-0003 |
| Tests | Playwright + Vitest | Cubre el pendiente "resiliencia e2e" del CLAUDE.md de carbon |
| CI/CD | GitHub Actions + Vercel preview por PR | Estándar |

## Estructura

```
geshop/
├── apps/web/                  # Next.js 16
├── packages/
│   ├── ui/                    # Componentes compartidos
│   ├── db/                    # Cliente Supabase + tipos
│   ├── ai/                    # Wrappers Gemini (F3)
│   └── config/                # ESLint, tsconfig
├── supabase/                  # Migrations + Edge Functions
└── docs/adr/                  # Decisiones arquitectónicas
```

## Alternativas consideradas

- **App única sin monorepo.** Más simple al arranque pero hace difícil aislar dominios cuando crecen (carbon, esg, disclosures, consolidation, ai). Descartada.
- **Nx en lugar de Turborepo.** Más features, más complejidad, curva más larga. Descartada para esta etapa.
- **Express backend separado** (como en ESG suite). Su propio `IMPLEMENTATION_STATUS.md` admite que no es la API consumida por el front. **Descartado: borrado.**

## Consecuencias

- ✅ Onboarding de un dev nuevo: clonar + `pnpm install` + `pnpm dev` < 30 min.
- ✅ Tests + lint + build en CI con un solo comando por paquete.
- ⚠️ Carbon en prod sigue como repo separado con mantenimiento mínimo hasta paridad funcional. Sin riesgo de divergencia mientras solo entren bugfixes críticos.
- ⚠️ `pnpm-lock.yaml` debe commitearse y gestionarse cuidadosamente.
