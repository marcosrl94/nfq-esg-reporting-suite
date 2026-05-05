/*
 * @geshop/ai — Capa unificada de IA
 *
 * Estado F0:
 *   - Solo el contrato (interfaces). Las implementaciones llegan en F3 cuando
 *     se trasplante el código de nfq-esg-reporting-suite/services/{geminiService,
 *     bulkImporter, annualReportProcessor, evidenceService}.ts.
 *
 * Reglas (ver docs/adr/0003-ai-policy.md):
 *   1. La key de Gemini NUNCA va al bundle. Toda llamada pasa por la Edge
 *      Function `gemini-proxy` de Supabase.
 *   2. Cada invocación se loggea en audit_log_entries.
 *   3. Cada output viene con `confidence` y se marca como AI-suggested hasta
 *      que un humano lo aprueba.
 *   4. Fallback always-on: si la Edge Function falla, la app sigue
 *      funcionando — la IA es additive, never required.
 */

export type AIConfidence = number; // 0..1

export interface EvidenceAnalysis {
  status: "verified" | "mismatch" | "pending" | "unverified";
  extractedValue?: string | number;
  confidence: AIConfidence;
  reasoning?: string;
}

export interface ColumnMapping {
  sourceColumn: string;
  datapointCode: string;
  confidence: AIConfidence;
  reasoning?: string;
}

export interface NarrativeRequest {
  disclosureId: string;
  framework: "ESRS" | "TCFD" | "GRI" | "ISSB" | "SASB";
  tone: "neutral" | "executive" | "regulatory";
  evidenceContext?: string[];
}

export interface NarrativeResponse {
  text: string;
  promptUsed: string;
  modelVersion: string;
  confidence: AIConfidence;
}

export interface GapDetection {
  missing: { code: string; topic: string; priority: 1 | 2 | 3 }[];
}

/**
 * @TODO F3 — implementar contra Edge Function `gemini-proxy`
 */
export interface GeshopAI {
  analyzeEvidence(input: {
    file: File | Blob;
    expectedValue?: number;
    unit?: string;
  }): Promise<EvidenceAnalysis>;

  generateNarrative(req: NarrativeRequest): Promise<NarrativeResponse>;

  mapColumns(input: {
    headers: string[];
    targetCatalog: { code: string; name: string }[];
  }): Promise<ColumnMapping[]>;

  detectGaps(input: { reportingCycleId: string }): Promise<GapDetection>;
}
