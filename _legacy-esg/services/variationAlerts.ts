import { Datapoint } from '../types';

export interface VariationAlert {
  datapointId: string;
  code: string;
  name: string;
  currentYear: number;
  previousYear: number;
  currentValue: number;
  previousValue: number;
  pctChange: number;
  severity: 'high' | 'medium' | 'low';
}

const THRESHOLD_HIGH = 0.25;
const THRESHOLD_MEDIUM = 0.1;

/**
 * Alarmas de variación interanual (Sygris / control de calidad)
 */
export function computeYoYVariationAlerts(
  datapoints: Datapoint[],
  reportingYear: number
): VariationAlert[] {
  const prev = reportingYear - 1;
  const cy = String(reportingYear);
  const py = String(prev);
  const out: VariationAlert[] = [];

  for (const dp of datapoints) {
    if (dp.type !== 'quantitative') continue;
    const cur = dp.values[cy];
    const old = dp.values[py];
    if (typeof cur !== 'number' || typeof old !== 'number' || old === 0) continue;

    const pct = (cur - old) / Math.abs(old);
    const absPct = Math.abs(pct);
    let severity: VariationAlert['severity'] = 'low';
    if (absPct >= THRESHOLD_HIGH) severity = 'high';
    else if (absPct >= THRESHOLD_MEDIUM) severity = 'medium';
    else continue;

    out.push({
      datapointId: dp.id,
      code: dp.code,
      name: dp.name,
      currentYear: reportingYear,
      previousYear: prev,
      currentValue: cur,
      previousValue: old,
      pctChange: pct * 100,
      severity
    });
  }

  return out.sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange));
}
