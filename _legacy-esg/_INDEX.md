# _legacy-esg · Índice de referencia para los trasplantes F2-F3

> Este folder contiene el código original de la POC ESG (Vite + React + Express).
> Su propósito es servir de **referencia** durante los trasplantes funcionales del plan, no de código activo.
>
> Cuando F2 y F3 cierren y todo lo aprovechable esté trasplantado a `apps/web/` y `packages/{ai,ui,db}/`, este folder se borra.

## Qué se va a trasplantar y a dónde

### F2 · Cobertura ESG completa (meses 4-6)

| Origen `_legacy-esg/` | Destino target | Notas |
|---|---|---|
| `services/esrsTaxonomy.ts` | `packages/db/src/esrs.ts` (catálogo) + seed migration | Catálogo de 300+ datapoints ESRS por topic |
| `services/dataSubModulesConfig.ts` | `packages/db/src/data-modules.ts` | Configuración por sección/datapoint |
| `types.ts` (Datapoint, Section, etc.) | `packages/db/src/types.ts` | Tipos del dominio ESG genérico |
| `components/Dashboard.tsx` | `apps/web/src/app/(dashboard)/page.tsx` (extender el de carbon) | KPI cards + readiness + workflow board |
| `components/DataInput.tsx` | `apps/web/src/app/(dashboard)/esg/data-input.tsx` | Formularios por datapoint |
| `components/DataConsolidator.tsx` | `apps/web/src/app/(dashboard)/consolidation/...` | UI de consolidación (versión esbelta para v1.5) |
| `components/EvidenceManager.tsx` | `apps/web/src/components/evidence-manager.tsx` | Subida + descarga + delete (Storage) |
| `components/FinalReport.tsx` | `apps/web/src/app/(dashboard)/disclosures/final-report.tsx` | Generador HTML/PDF |
| `components/AuditorView.tsx` | `apps/web/src/app/(dashboard)/admin/auditor-view.tsx` | Vista filtrada para rol auditor |
| `database/schema.sql` | Inspirar nuevas migraciones del schema unificado | NO copiar literal: el schema canónico es el de carbon |
| `contexts/SectionsContext.tsx` | Refactor a Server Components + Server Actions | Carbon usa SSR, no Context API client-side |

### F3 · IA cross (meses 6-8)

| Origen `_legacy-esg/` | Destino target | Notas |
|---|---|---|
| `services/geminiService.ts` | `packages/ai/src/gemini.ts` | Wrapper con retries, rate limit, error types |
| `services/geminiInvocation.ts` | `packages/ai/src/invoke.ts` | Llamadas a la Edge Function `gemini-proxy` |
| `services/geminiProductionGuard.ts` | `packages/ai/src/guard.ts` | Validación de `VITE_GEMINI_USE_PROXY` (cambiar a `NEXT_PUBLIC_*`) |
| `services/evidenceService.ts` | `packages/ai/src/evidence.ts` | `analyzeEvidence` |
| `services/annualReportProcessor.ts` | `packages/ai/src/annual-report.ts` | `loadAnnualReport` |
| `services/bulkImporter.ts` | `packages/ai/src/bulk-import.ts` | `mapColumns` |
| `services/auditPipeline.ts` | `packages/ai/src/audit.ts` | Logging IA en `audit_log_entries` |
| `components/AnnualReportLoader.tsx` | `apps/web/src/app/(dashboard)/data-loading/annual-report.tsx` | UI del Annual Report Loader |
| `components/NarrativeEngine.tsx` (si existe) | `apps/web/src/app/(dashboard)/disclosures/narrative-engine.tsx` | UI de generación de narrativas |

### F4 · v1.5 esbelta (meses 8-9)

| Origen `_legacy-esg/` | Destino target | Notas |
|---|---|---|
| `components/IndexComposer.tsx` | `apps/web/src/app/(dashboard)/disclosures/composer.tsx` | Composición del reporte final |
| `components/GovernanceHub.tsx` | `apps/web/src/app/(dashboard)/governance/page.tsx` | Hub de gobernanza (G1) |
| `components/CarbonFootprintModule.tsx` | YA cubierto por carbon trasplantado en F1 | NO reusar — el de carbon es más completo |

## Qué se descarta

- **`backend/`** — Express. Decisión documentada en plan §2.4: la fuente de verdad es Supabase. Borrar al cierre de F3.
- **`vite.config.ts`, `vitest.config.ts`, `index.html`, `index.tsx`, `App.tsx`** — entry points de Vite. Reemplazados por Next.js App Router.
- **`PALANTIR_THEME.md`** — tema visual original. Sustituido por la marca GSV (ver `branding/BRAND_GUIDELINES.md`).
- **`verificar-api-key.js`** — script ad-hoc.
- **`metadata.json`** — config de la POC.

## Documentación con valor histórico

Conservar como anexos al plan (luego mover a `docs/legacy/`):

- [`ENTERPRISE_ARCHITECTURE.md`](ENTERPRISE_ARCHITECTURE.md) — visión enterprise original (67k chars). Útil como input para v2.
- [`CONSOLIDATION_ARCHITECTURE.md`](CONSOLIDATION_ARCHITECTURE.md) — diseño de la consolidación multi-nivel.
- [`EVIDENCE_CONSOLIDATION.md`](EVIDENCE_CONSOLIDATION.md) — diseño de evidencias.
- [`POC_TO_PRODUCTION.md`](POC_TO_PRODUCTION.md) — qué cambió de la POC a producción Supabase.
- [`REFERENCIA_SYGRIS_GRUPO_LAR.md`](REFERENCIA_SYGRIS_GRUPO_LAR.md) — caso de uso real (Grupo Lar) que motivó parte del producto.

El resto de los `.md` (RESPONSIVE_IMPROVEMENTS, ROBUSTNESS_IMPROVEMENTS, TESTING, etc.) son journals que se pueden archivar.

## Eliminación

```bash
# Cuando F3 cierre:
rm -rf _legacy-esg
git commit -am "chore: drop _legacy-esg, todo lo aprovechable trasplantado"
```
