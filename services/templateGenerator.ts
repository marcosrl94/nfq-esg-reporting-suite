import { StandardSection, Datapoint } from '../types';

/**
 * Generates a CSV template for bulk import
 */
export const generateCSVTemplate = (sections: StandardSection[], reportingYear: number): string => {
  // Collect all datapoints
  const datapoints: Datapoint[] = [];
  sections.forEach(section => {
    section.datapoints.forEach(dp => {
      datapoints.push(dp);
    });
  });

  // Create headers
  const headers = ['Datapoint Code', 'Datapoint Name', `Value ${reportingYear}`, 'Unit', 'Notes'];
  
  // Create rows
  const rows = datapoints.map(dp => {
    const code = dp.code;
    const name = dp.name.replace(/"/g, '""'); // Escape quotes
    const value = dp.values[reportingYear.toString()] || '';
    const unit = dp.unit || '';
    const notes = '';
    
    return [code, name, value, unit, notes].map(field => `"${field}"`).join(',');
  });

  return [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
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
