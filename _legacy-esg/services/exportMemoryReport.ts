import { StandardSection } from '../types';

function escapeCsvCell(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/**
 * Export tipo memoria / datos: CSV (compatible Excel) de todos los datapoints.
 */
export function buildMemoryExportCsv(
  sections: StandardSection[],
  reportingYear: number
): string {
  const yearKey = String(reportingYear);
  const headers = [
    'section_code',
    'section_title',
    'datapoint_code',
    'datapoint_name',
    'type',
    'status',
    'unit',
    `value_${yearKey}`,
    'reporting_frequency',
    'assigned_to_user_id'
  ];
  const lines = [headers.join(',')];

  for (const sec of sections) {
    for (const dp of sec.datapoints) {
      const val = dp.values[yearKey];
      const row = [
        escapeCsvCell(sec.code),
        escapeCsvCell(sec.title),
        escapeCsvCell(dp.code),
        escapeCsvCell(dp.name),
        dp.type,
        escapeCsvCell(String(dp.status)),
        dp.unit ? escapeCsvCell(dp.unit) : '',
        val === null || val === undefined ? '' : escapeCsvCell(String(val)),
        dp.reportingFrequency || 'annual',
        dp.assignedToUserId || ''
      ];
      lines.push(row.join(','));
    }
  }

  return lines.join('\n');
}

export function downloadMemoryCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export mínimo viable JSON (trazabilidad, integraciones, archivo de respaldo).
 */
export function buildReportingPackJson(
  sections: StandardSection[],
  reportingYear: number,
  meta?: { organizationId?: string; reportingCycleId?: string | null }
): string {
  const payload = {
    exportedAt: new Date().toISOString(),
    reportingYear,
    organizationId: meta?.organizationId,
    reportingCycleId: meta?.reportingCycleId ?? null,
    sections: sections.map((s) => ({
      id: s.id,
      code: s.code,
      title: s.title,
      datapoints: s.datapoints.map((dp) => ({
        id: dp.id,
        code: dp.code,
        name: dp.name,
        type: dp.type,
        status: dp.status,
        unit: dp.unit,
        values: dp.values,
        reportingFrequency: dp.reportingFrequency
      }))
    }))
  };
  return JSON.stringify(payload, null, 2);
}

export function downloadJson(filename: string, json: string): void {
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
