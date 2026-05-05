/**
 * Diagnóstico: cruce materialidad financiera / de impacto vs catálogo de indicadores y profundidad.
 */
import type {
  MaterialityTopic,
  StandardSection,
  DisclosureDepth,
  MaterialityThresholdConfig,
  MaterialityCriterion
} from '../types';

export type TopicDiagnosticRow = {
  topicId: string;
  topicName: string;
  esrsCode: string;
  impactScore: number;
  financialScore: number;
  impactAboveThreshold: boolean;
  financialAboveThreshold: boolean;
  passesMaterialityRule: boolean;
  disclosureDepth: DisclosureDepth;
  expectedDatapoints: number;
  datapointsWithData: number;
  coveragePct: number;
  flags: string[];
};

export function normalizeEsrsSectionCode(section: { code: string }): string {
  const match = section.code.match(/\b(E[1-5]|S[1-4]|G1)\b/);
  if (match) return match[1];
  const first = section.code.replace(/^ESRS\s+/i, '').trim().split(/\s|:/)[0];
  return first || '';
}

export function inferEsrsSectionFromTopic(topic: MaterialityTopic): string {
  const name = (topic.name || '').toLowerCase();
  const cat = topic.category;
  if (/\b(climate|emissions|ghg|carbon)\b/i.test(name)) return 'E1';
  if (/\b(pollution|air|waste)\b/i.test(name)) return 'E2';
  if (/\b(water|marine)\b/i.test(name)) return 'E3';
  if (/\b(biodiversity|ecosystem)\b/i.test(name)) return 'E4';
  if (/\b(circular|recycle)\b/i.test(name)) return 'E5';
  if (/\b(workforce|employee|diversity|training)\b/i.test(name) || cat === 'Social') return 'S1';
  if (/\b(value chain|supplier)\b/i.test(name)) return 'S2';
  if (/\b(community|human rights)\b/i.test(name)) return 'S3';
  if (/\b(consumer|customer)\b/i.test(name)) return 'S4';
  if (/\b(governance|ethics)\b/i.test(name) || cat === 'Governance') return 'G1';
  return '';
}

function hasValueForYear(dp: { values?: Record<string, string | number | null> }, year: string): boolean {
  const v = dp.values?.[year];
  return v !== null && v !== undefined && v !== '';
}

function passesThresholdRule(
  impact: number,
  financial: number,
  t: MaterialityThresholdConfig,
  criterion: MaterialityCriterion
): boolean {
  const iOk = impact >= t.impactMin;
  const fOk = financial >= t.financialMin;
  if (criterion === 'both') return iOk && fOk;
  return iOk || fOk;
}

export function resolveEsrsCodeForTopic(topic: MaterialityTopic): string {
  const raw = topic.esrsSectionCode?.trim();
  if (raw) return raw;
  return inferEsrsSectionFromTopic(topic);
}

export function computeTopicDiagnostics(
  topics: MaterialityTopic[],
  sections: StandardSection[],
  reportingYear: number,
  thresholds: MaterialityThresholdConfig,
  criterion: MaterialityCriterion
): TopicDiagnosticRow[] {
  const year = String(reportingYear);

  return topics.map((topic) => {
    const esrsCode = resolveEsrsCodeForTopic(topic);
    const depth: DisclosureDepth = topic.disclosureDepth || 'full';

    const impactAbove = topic.impactScore >= thresholds.impactMin;
    const financialAbove = topic.financialScore >= thresholds.financialMin;
    const passesMaterialityRule = passesThresholdRule(
      topic.impactScore,
      topic.financialScore,
      thresholds,
      criterion
    );

    const matchingSections = esrsCode
      ? sections.filter((s) => normalizeEsrsSectionCode(s) === esrsCode)
      : [];

    const allDps = matchingSections.flatMap((s) => s.datapoints);
    const expectedDatapoints = allDps.length;
    const datapointsWithData = allDps.filter((dp) => hasValueForYear(dp, year)).length;
    const coveragePct =
      expectedDatapoints === 0 ? 0 : Math.round((datapointsWithData / expectedDatapoints) * 100);

    const flags: string[] = [];

    if (!esrsCode) {
      flags.push('Sin código ESRS: asigna sección o revisa el nombre del topic.');
    }

    if (passesMaterialityRule && depth === 'omit') {
      flags.push(
        'Profundidad “omitir” pero el topic supera los umbrales configurados: revisa coherencia con doble materialidad.'
      );
    }

    if (!passesMaterialityRule && depth !== 'omit') {
      flags.push(
        'Profundidad de disclosure activa pese a puntuaciones por debajo del umbral: revisa si es voluntario o ajusta umbrales.'
      );
    }

    if (esrsCode && expectedDatapoints === 0) {
      flags.push(`No hay indicadores en catálogo para la sección ${esrsCode} (importar pack o ampliar alcance).`);
    }

    if (expectedDatapoints > 0 && datapointsWithData === 0 && depth !== 'omit') {
      flags.push('Ningún indicador tiene dato para el ejercicio: revisar carga de datos.');
    }

    if (depth === 'full' && coveragePct > 0 && coveragePct < 40) {
      flags.push('Cobertura baja de datos con disclosure “completo”: riesgo de brecha de reporting.');
    }

    return {
      topicId: topic.id,
      topicName: topic.name,
      esrsCode: esrsCode || '—',
      impactScore: topic.impactScore,
      financialScore: topic.financialScore,
      impactAboveThreshold: impactAbove,
      financialAboveThreshold: financialAbove,
      passesMaterialityRule,
      disclosureDepth: depth,
      expectedDatapoints,
      datapointsWithData,
      coveragePct,
      flags
    };
  });
}

export function aggregateDiagnostics(rows: TopicDiagnosticRow[]) {
  const withFlags = rows.filter((r) => r.flags.length > 0).length;
  const avgCoverage =
    rows.length === 0
      ? 0
      : Math.round(rows.reduce((s, r) => s + r.coveragePct, 0) / rows.length);
  const materialByDepth = rows.filter((r) => r.disclosureDepth !== 'omit').length;
  return { withFlags, avgCoverage, materialByDepth, total: rows.length };
}
