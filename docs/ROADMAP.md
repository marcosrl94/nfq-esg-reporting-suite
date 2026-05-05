# Roadmap · GEShop

> Estado vivo. Contraste el plan estratégico completo en `../../PLAN_MEGA_SUITE_ESG.md` (ruta absoluta: `Reporting no financiero/PLAN_MEGA_SUITE_ESG.md`).

## Fases

| Fase | Foco | Estado | Tiempo objetivo |
|---|---|---|---|
| F0 | Bootstrap monorepo | 🟢 Casi cerrado | semanas 1-3 |
| F1 | Trasplante de carbon-intelligence | ⏳ Pendiente | meses 1-3 |
| F2 | Cobertura ESG completa + doble materialidad | ⏳ Pendiente | meses 4-6 |
| F3 | IA cross (5 capacidades) | ⏳ Pendiente | meses 6-8 |
| F4 | v1.5 esbelta: disclosures + multi-entity ligero | ⏳ Pendiente | meses 8-9 |
| v2 | Enterprise pleno (SSO, ERP, SOC2) | 🚪 Gated por cliente piloto | post v1.5 |

## F0 — qué queda (checklist)

- [x] Estructura del monorepo (apps/web, packages/ui|db|ai|config, supabase/, docs/adr/, .github/workflows/).
- [x] Configs raíz (package.json, pnpm-workspace.yaml, turbo.json, tsconfig.base.json, .gitignore, .nvmrc, .editorconfig, .prettierrc.json).
- [x] apps/web Next.js 16 + Tailwind 4 con splash y branding.
- [x] Stubs en packages/ui, packages/db, packages/ai, packages/config.
- [x] Edge Function `gemini-proxy` portada de la POC ESG (vive en `supabase/functions/gemini-proxy/`).
- [x] CI GitHub Actions (typecheck + lint + build).
- [x] ADRs 001 (monorepo), 002 (Supabase), 003 (IA).
- [x] README extenso + ROADMAP.
- [x] Migración de la POC ESG a `_legacy-esg/` con índice `_legacy-esg/_INDEX.md` mapeando qué se trasplanta a dónde en F2-F3.
- [x] Project ref Supabase real cableado: `dkfwfculonlnhoabxszw`.
- [ ] **Marcos:** primer `pnpm install && pnpm dev` y verificar splash en localhost:3000.
- [ ] **Marcos:** `git add . && git commit && git push` (el repo ya existe en `marcosrl94/nfq-esg-reporting-suite`).
- [ ] **Marcos:** `supabase link --project-ref dkfwfculonlnhoabxszw` y `supabase functions deploy gemini-proxy`.
- [ ] **Marcos:** importar el repo en Vercel + setear env vars.
- [ ] **Marcos (housekeeping):** borrar la carpeta `_OLD_geshop/` que quedó en el proyecto raíz (el sandbox no tiene permisos para hacerlo).

## F1 — qué entra

- Trasplante de las 21 migraciones de `nfq-carbon-intelligence/supabase/migrations/`.
- Trasplante de `src/types/database.ts`, `src/lib/supabase/{client,server,update-session}.ts`, `src/lib/auth/`, `src/lib/admin/`, `src/lib/emissions/`, `src/lib/materiality/`, `src/lib/base-year/`, `src/lib/invitations/`.
- Trasplante de las rutas: `(auth)/login`, `(auth)/signup`, `(auth)/callback`, `(dashboard)/{emissions, targets, disclosures, settings, removals, materiality, admin/audit-log}`.
- Smoke tests Playwright (los pendientes en CLAUDE.md de carbon).
- Datos demo seed (1 org, 1 inventario, 50 entries).
