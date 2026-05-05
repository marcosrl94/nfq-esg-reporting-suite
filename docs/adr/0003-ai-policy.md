# ADR-0003 · Política de IA (Gemini): key hygiene, auditoría, fallback

- Estado: **Aceptada**
- Fecha: 2026-05-04
- Decisor: Marcos
- Contexto del plan: §5.2 y §7.3 de [PLAN_MEGA_SUITE_ESG.md](../../../PLAN_MEGA_SUITE_ESG.md)

## Contexto

GEShop integra IA (Google Gemini) para 5 capacidades cross-domain (ver `packages/ai/src/index.ts`):

1. `analyzeEvidence` — verifica que un PDF/Excel respalda un valor.
2. `generateNarrative` — narrativas ESRS/CSRD para disclosures.
3. `mapColumns` — bulk import IA (columna → datapoint).
4. `loadAnnualReport` — extracción de datapoints de un PDF anual.
5. `detectGaps` — qué falta para cerrar el reporte CSRD.

Riesgos: (a) leak de la API key de Gemini al bundle; (b) hallucinations metiendo datos falsos en el reporte; (c) coste de API descontrolado; (d) dependencia hard de un solo proveedor.

## Decisión

### 1. Key hygiene

- La `GEMINI_API_KEY` **vive solo en secretos de Supabase** (`supabase secrets set GEMINI_API_KEY=...`).
- **Toda llamada pasa por la Edge Function `gemini-proxy`** (portada de `nfq-esg-reporting-suite/supabase/functions/gemini-proxy/index.ts`).
- En `apps/web` solo existe el flag `NEXT_PUBLIC_GEMINI_USE_PROXY=true`. Nunca la key.
- La Edge Function valida el JWT de Supabase Auth antes de llamar a Gemini (rate-limiting natural por usuario).

### 2. Auditoría

- Cada invocación IA escribe en `audit_log_entries` con: `user_id`, `org_id`, `action='ai.<capability>'`, `payload` que incluye `prompt`, `model`, `output`, `latency_ms`, `cost_estimate_usd`.
- El analyst/admin ve en `/admin/ai-usage` el histórico de uso.
- El auditor externo puede pedir traza completa de cómo se generó cada narrativa.

### 3. Confianza + workflow obligatorio

- Cada output IA viene con `confidence: number` (0..1).
- En la UI: badge "AI-suggested · pending review" hasta que un humano lo aprueba en el workflow (`status: 'review'` → `'approved'`).
- **Nada generado por IA llega al status `locked` sin aprobación humana explícita.**

### 4. Fallback always-on

- Si `gemini-proxy` falla, devuelve 503 y el cliente cae graceful: muestra un mensaje "IA no disponible, sigue manualmente" pero **no bloquea** la operación.
- La IA es **always additive, never required**.

### 5. Provider-agnostic interface

- `packages/ai` define un contrato `GeshopAI` que cualquier provider implementa.
- Hoy: solo Gemini. Mañana: si Gemini sube precios o se cae, podemos meter OpenAI o Anthropic detrás del mismo interface sin tocar las features.

### 6. Coste

- Modelo por defecto: `gemini-2.0-flash` (barato, rápido).
- Solo `generateNarrative` puede usar `gemini-2.0-pro` cuando se solicita explícitamente.
- Cache por hash del prompt: prompts idénticos no se vuelven a llamar.
- Límite por org configurable (default 10k requests/mes).

## Alternativas consideradas

- **Llamar Gemini directo desde el cliente** (como hace ESG suite en modo dev). Imposible en producción: leakea la key. Descartada.
- **OpenAI / Anthropic en lugar de Gemini.** Gemini ya está integrado y validado. Cambiar de proveedor sin razón es churn. Descartada para F3; reabrir si Gemini falla.
- **Self-hosted LLM** (Llama, Mistral). Coste de infra y mantenimiento alto, sin tracción que lo justifique. Reabrir post v2.

## Consecuencias

- ✅ Key nunca expuesta.
- ✅ Reporte CSRD defendible ante auditor: cada output IA tiene traza.
- ✅ El producto sigue funcionando si Gemini se cae.
- ⚠️ La Edge Function es un single point of failure regional. Si la región Supabase EU se cae, IA off. Aceptable para v1.5.
- ⚠️ Coste de Gemini sube con uso. Monitorizar desde día uno con `audit_log_entries`.
