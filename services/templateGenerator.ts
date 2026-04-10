import { StandardSection, Datapoint, Department } from '../types';

/**
 * Filtra datapoints por departamento/función
 */
export const getDatapointsByDepartment = (
  sections: StandardSection[],
  department?: Department
): Datapoint[] => {
  const all = sections.flatMap(s => s.datapoints);
  if (!department) return all;
  return all.filter(dp => dp.department === department);
};

/**
 * Generates a CSV template for bulk import
 */
export const generateCSVTemplate = (sections: StandardSection[], reportingYear: number): string => {
  const datapoints: Datapoint[] = [];
  sections.forEach(section => {
    section.datapoints.forEach(dp => datapoints.push(dp));
  });
  const headers = ['Datapoint Code', 'Datapoint Name', `Value ${reportingYear}`, 'Unit', 'Notes'];
  const rows = datapoints.map(dp => {
    const code = dp.code;
    const name = dp.name.replace(/"/g, '""');
    const value = dp.values[reportingYear.toString()] || '';
    const unit = dp.unit || '';
    const notes = '';
    return [code, name, value, unit, notes].map(field => `"${field}"`).join(',');
  });
  return [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
};

/**
 * Generates a CSV template for BOTTOM-UP consolidation import (Workiva/Enablon style)
 * One row per source (instalación, subsidiaria, etc.), columns = metrics
 */
export const generateConsolidationCSVTemplate = (
  sections: StandardSection[],
  reportingYear: number
): string => {
  const datapoints = sections.flatMap(s => s.datapoints.filter(dp => dp.type === 'quantitative'));
  const metricHeaders = datapoints.slice(0, 8).map(dp => dp.code); // Limit for readability
  const headers = ['Fuente', 'Tipo', ...metricHeaders];
  const emptyCols = metricHeaders.map(() => '');
  const exampleRows = [
    ['Planta Madrid', 'facility', ...emptyCols],
    ['Planta Barcelona', 'facility', ...emptyCols],
    ['España (ejemplo)', 'geography', ...emptyCols]
  ];
  const allRows = [headers.map(h => `"${h}"`).join(',')];
  exampleRows.forEach(row => {
    allRows.push(row.map(field => `"${field}"`).join(','));
  });
  return allRows.join('\n');
};

/**
 * Generates a JSON template for bulk import
 */
export const generateJSONTemplate = (sections: StandardSection[], reportingYear: number): string => {
  const datapoints: Array<{
    datapointCode: string;
    datapointName: string;
    value: string | number | null;
    unit?: string;
    notes?: string;
  }> = [];

  sections.forEach(section => {
    section.datapoints.forEach(dp => {
      datapoints.push({
        datapointCode: dp.code,
        datapointName: dp.name,
        value: dp.values[reportingYear.toString()] || null,
        unit: dp.unit,
        notes: ''
      });
    });
  });

  return JSON.stringify(datapoints, null, 2);
};

/**
 * Generates an Excel template (CSV format that can be opened in Excel)
 */
export const generateExcelTemplate = (sections: StandardSection[], reportingYear: number): string => {
  // Excel-compatible CSV with BOM for UTF-8
  const csv = generateCSVTemplate(sections, reportingYear);
  return '\uFEFF' + csv; // Add BOM for Excel UTF-8 support
};

/**
 * Downloads a template file
 */
export const downloadTemplate = (
  content: string,
  filename: string,
  mimeType: string = 'text/csv'
): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generates and downloads a CSV template
 */
export const downloadCSVTemplate = (sections: StandardSection[], reportingYear: number): void => {
  const content = generateCSVTemplate(sections, reportingYear);
  downloadTemplate(content, `esg-bulk-import-template-${reportingYear}.csv`, 'text/csv');
};

/**
 * Generates and downloads a JSON template
 */
export const downloadJSONTemplate = (sections: StandardSection[], reportingYear: number): void => {
  const content = generateJSONTemplate(sections, reportingYear);
  downloadTemplate(content, `esg-bulk-import-template-${reportingYear}.json`, 'application/json');
};

/**
 * Generates and downloads an Excel template (CSV with BOM)
 */
export const downloadExcelTemplate = (sections: StandardSection[], reportingYear: number): void => {
  const content = generateExcelTemplate(sections, reportingYear);
  downloadTemplate(content, `esg-bulk-import-template-${reportingYear}.csv`, 'text/csv;charset=utf-8;');
};

/**
 * Downloads a template for BOTTOM-UP consolidation (una fila por fuente)
 */
export const downloadConsolidationTemplate = (
  sections: StandardSection[],
  reportingYear: number
): void => {
  const content = '\uFEFF' + generateConsolidationCSVTemplate(sections, reportingYear);
  downloadTemplate(
    content,
    `esg-consolidacion-bottom-up-${reportingYear}.csv`,
    'text/csv;charset=utf-8;'
  );
};

/**
 * Genera template CSV filtrado por función/departamento (para carga por función)
 */
export const generateCSVTemplateByFunction = (
  sections: StandardSection[],
  reportingYear: number,
  department: Department
): string => {
  const datapoints = getDatapointsByDepartment(sections, department);
  if (datapoints.length === 0) return '';
  const headers = ['Datapoint Code', 'Datapoint Name', `Value ${reportingYear}`, 'Unit', 'Notes'];
  const rows = datapoints.map(dp => {
    const code = dp.code;
    const name = dp.name.replace(/"/g, '""');
    const value = dp.values[reportingYear.toString()] || '';
    const unit = dp.unit || '';
    const notes = '';
    return [code, name, value, unit, notes].map(field => `"${field}"`).join(',');
  });
  return [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
};

/**
 * Genera template de consolidación por función (una fila por fuente)
 */
export const generateConsolidationCSVTemplateByFunction = (
  sections: StandardSection[],
  reportingYear: number,
  department: Department
): string => {
  const datapoints = getDatapointsByDepartment(sections, department)
    .filter(dp => dp.type === 'quantitative');
  if (datapoints.length === 0) return '';
  const metricHeaders = datapoints.slice(0, 12).map(dp => dp.code);
  const headers = ['Fuente', 'Tipo', 'Responsable', ...metricHeaders];
  const emptyCols = metricHeaders.map(() => '');
  const exampleRows = [
    ['Planta Madrid', 'facility', '', ...emptyCols],
    ['Planta Barcelona', 'facility', '', ...emptyCols],
    ['España (ejemplo)', 'geography', '', ...emptyCols]
  ];
  const allRows = [headers.map(h => `"${h}"`).join(',')];
  exampleRows.forEach(row => allRows.push(row.map(field => `"${field}"`).join(',')));
  return allRows.join('\n');
};

/**
 * Descarga template por función (estándar o consolidación)
 */
export const downloadTemplateByFunction = (
  sections: StandardSection[],
  reportingYear: number,
  department: Department,
  mode: 'standard' | 'consolidation' = 'standard'
): void => {
  const deptSlug = department.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').toLowerCase();
  if (mode === 'consolidation') {
    const content = '\uFEFF' + generateConsolidationCSVTemplateByFunction(sections, reportingYear, department);
    downloadTemplate(content, `esg-${deptSlug}-consolidacion-${reportingYear}.csv`, 'text/csv;charset=utf-8;');
  } else {
    const content = '\uFEFF' + generateCSVTemplateByFunction(sections, reportingYear, department);
    downloadTemplate(content, `esg-${deptSlug}-carga-${reportingYear}.csv`, 'text/csv;charset=utf-8;');
  }
};
