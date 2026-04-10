import { StandardSection, ConsolidatedDatapoint, ConsolidationSource } from '../types';
import {
  retryWithBackoff,
  handleApiError,
  GeminiServiceError,
  generateContentUnified,
} from './geminiService';
import { createSourceFromImport } from './hierarchyService';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Represents a column mapping from source data to a datapoint code
 */
export interface ColumnMapping {
  sourceColumn: string; // Original column name from Excel/CSV
  datapointCode: string; // Target datapoint code (e.g., "E1-6-01")
  confidence: number; // 0-100, how confident the AI is about this mapping
  reasoning?: string; // Explanation of why this mapping was chosen
}

/**
 * Represents a single row of bulk import data
 */
export interface BulkImportRow {
  [columnName: string]: string | number | null; // Key-value pairs from source data
}

/**
 * Result of a bulk import operation
 */
export interface BulkImportResult {
  success: boolean;
  totalRows: number;
  processedRows: number;
  failedRows: number;
  mappings: ColumnMapping[];
  errors: BulkImportError[];
  datapointsUpdated: string[];
  /** Avisos (ej. filas omitidas en modo consolidación por falta de fuente) */
  warnings?: Array<{ rowIndex: number; message: string }>;
}

/**
 * Error information for failed import rows
 */
export interface BulkImportError {
  rowIndex: number;
  column?: string;
  message: string;
  datapointCode?: string;
}

/**
 * Configuration for bulk import
 */
export interface BulkImportConfig {
  standardId?: string; // Optional: filter to specific standard
  year?: number; // Target reporting year (defaults to current year)
  overwriteExisting?: boolean; // Whether to overwrite existing values
  validateBeforeImport?: boolean; // Whether to validate data before importing
  dryRun?: boolean; // If true, don't actually update datapoints
  /** Modo consolidación bottom-up: columna que identifica la fuente (ej: "Fuente", "Instalación", "Source") */
  consolidationMode?: boolean;
  /** Nombre de la columna de fuente cuando consolidationMode=true */
  sourceColumn?: string;
  /** IDs de datapoints que deben habilitar consolidación tras importar */
  enableConsolidationForDatapoints?: string[];
  /** Usuario por defecto para nuevas fuentes */
  defaultUserId?: string;
  /** Nombre del usuario por defecto */
  defaultUserName?: string;
  /** Departamento/función responsable (para ConsolidationSource.responsibleDepartment) */
  responsibleDepartment?: string;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Extracts column names from bulk data
 */
const extractColumns = (data: BulkImportRow[]): string[] => {
  if (data.length === 0) return [];
  
  const allColumns = new Set<string>();
  data.forEach(row => {
    Object.keys(row).forEach(key => allColumns.add(key));
  });
  
  return Array.from(allColumns);
};

/**
 * Gets all available datapoint codes from sections
 */
const getAllDatapointCodes = (sections: StandardSection[]): Array<{ code: string; name: string; description: string }> => {
  const codes: Array<{ code: string; name: string; description: string }> = [];
  
  sections.forEach(section => {
    section.datapoints.forEach(dp => {
      codes.push({
        code: dp.code,
        name: dp.name,
        description: dp.description
      });
    });
  });
  
  return codes;
};

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Uses AI to automatically map source columns to datapoint codes
 */
export const mapColumnsToDatapoints = async (
  columns: string[],
  sections: StandardSection[],
  sampleData?: BulkImportRow[] // Optional sample data to help AI understand context
): Promise<ColumnMapping[]> => {
  const datapointCodes = getAllDatapointCodes(sections);
  
  if (datapointCodes.length === 0) {
    throw new GeminiServiceError("No datapoints available for mapping", 'NO_DATAPOINTS', false);
  }

  return await retryWithBackoff(async () => {
    const modelId = 'gemini-3-flash-preview';

    // Prepare sample data context if available
    const sampleContext = sampleData && sampleData.length > 0
      ? `\n\nSAMPLE DATA (first 3 rows):\n${JSON.stringify(sampleData.slice(0, 3), null, 2)}`
      : '';

    const prompt = `
      You are an AI assistant specialized in ESG data mapping for CSRD/ESRS compliance.
      
      TASK: Map source data columns to ESG datapoint codes.
      
      SOURCE COLUMNS TO MAP:
      ${columns.map((col, idx) => `${idx + 1}. "${col}"`).join('\n')}
      
      AVAILABLE DATAPOINT CODES:
      ${JSON.stringify(datapointCodes, null, 2)}
      ${sampleContext}
      
      INSTRUCTIONS:
      1. Analyze each source column name and try to match it to the most appropriate datapoint code.
      2. Consider:
         - Column name similarity (e.g., "Consumo Elec" → "E1-6-02" for Scope 2 emissions)
         - Data type hints from sample data
         - Common ESG terminology and abbreviations
      3. If a column cannot be confidently mapped, set confidence < 50 and provide reasoning.
      4. Some columns might be metadata (dates, IDs, notes) - map these with low confidence or skip.
      5. A single column might map to multiple datapoints if it contains aggregated data - choose the most specific match.
      
      Return ONLY a JSON array with this structure:
      [
        {
          "sourceColumn": "Column Name",
          "datapointCode": "E1-6-01",
          "confidence": 85,
          "reasoning": "Column name matches Scope 1 emissions description"
        }
      ]
      
      IMPORTANT:
      - Include ALL source columns, even if confidence is low
      - Confidence should be 0-100
      - If no match is found, use confidence 0 and reasoning "No matching datapoint found"
    `;

    try {
      const jsonStr = await generateContentUnified({
        model: modelId,
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const jsonSafe = jsonStr || "[]";
      const mappings: ColumnMapping[] = JSON.parse(jsonSafe);
      
      // Validate mappings
      return mappings.map(mapping => ({
        ...mapping,
        confidence: Math.max(0, Math.min(100, mapping.confidence || 0))
      }));
    } catch (error) {
      handleApiError(error, 'mapColumnsToDatapoints');
    }
  }, 3, 'mapColumnsToDatapoints');
};

/**
 * Processes bulk import data and updates datapoints
 * Supports consolidation mode (bottom-up): each row = one source, columns = metrics
 */
export const importBulkData = async (
  data: BulkImportRow[],
  mappings: ColumnMapping[],
  sections: StandardSection[],
  config: BulkImportConfig = {},
  onProgress?: (progress: { processed: number; total: number }) => void,
  updateDatapointFn?: (datapointId: string, updates: Partial<import('../types').Datapoint>) => void | Promise<void>
): Promise<BulkImportResult> => {
  const result: BulkImportResult = {
    success: true,
    totalRows: data.length,
    processedRows: 0,
    failedRows: 0,
    mappings,
    errors: [],
    datapointsUpdated: []
  };

  const targetYear = config.year || new Date().getFullYear();
  const yearKey = targetYear.toString();
  const defaultUserId = config.defaultUserId || 'user-1';
  const defaultUserName = config.defaultUserName || 'Usuario';
  const responsibleDepartment = config.responsibleDepartment;

  const codeToColumnMap = new Map<string, string>();
  const excludeColumns = new Set(
    consolidationMode && config.sourceColumn ? [config.sourceColumn, 'Fuente', 'Source', 'Instalación'] : []
  );
  mappings.forEach(mapping => {
    if (mapping.confidence >= 50 && !excludeColumns.has(mapping.sourceColumn)) {
      codeToColumnMap.set(mapping.datapointCode, mapping.sourceColumn);
    }
  });

  const consolidationMode = config.consolidationMode && config.sourceColumn;
  const sourceColumnName = config.sourceColumn || 'Fuente';

  // Consolidation mode: accumulate sources per datapoint (Map<datapointId, Map<sourceName, ConsolidationSource>>)
  const sourcesByDatapoint = new Map<string, Map<string, ConsolidationSource>>();

  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];

    try {
      const sourceName = consolidationMode
        ? (row[sourceColumnName] ?? row['Source'] ?? row['Instalación'] ?? row['Fuente'] ?? '')
        : null;

      if (consolidationMode && (!sourceName || String(sourceName).trim() === '')) {
        (result.warnings ||= []).push({
          rowIndex,
          message: `Fila ${rowIndex + 1}: falta valor en columna "${sourceColumnName}". Se omite.`
        });
        result.processedRows++;
        if (onProgress) onProgress({ processed: rowIndex + 1, total: data.length });
        continue;
      }

      for (const section of sections) {
        for (const datapoint of section.datapoints) {
          const dataColumn = codeToColumnMap.get(datapoint.code);
          const value = dataColumn != null ? row[dataColumn] : undefined;

          if (value === undefined || value === null || value === '') continue;

          if (datapoint.type === 'quantitative') {
            const numValue = typeof value === 'number' ? value : parseFloat(String(value));
            if (isNaN(numValue)) {
              result.errors.push({
                rowIndex,
                column: dataColumn,
                message: `Valor no numérico: ${value}`,
                datapointCode: datapoint.code
              });
              result.failedRows++;
              continue;
            }
          }

          if (!config.dryRun) {
            if (consolidationMode && sourceName) {
              let dpSources = sourcesByDatapoint.get(datapoint.id);
              if (!dpSources) {
                dpSources = new Map();
                sourcesByDatapoint.set(datapoint.id, dpSources);
              }
              const existing = Array.from(dpSources.values());
              const source = createSourceFromImport(
                String(sourceName).trim(),
                value,
                targetYear,
                defaultUserId,
                defaultUserName,
                existing,
                responsibleDepartment
              );
              dpSources.set(source.name, source);
            } else {
              const updatedValues = { ...datapoint.values, [yearKey]: value };
              if (updateDatapointFn) {
                try {
                  const updateResult = updateDatapointFn(datapoint.id, { values: updatedValues });
                  if (updateResult instanceof Promise) await updateResult;
                  if (!result.datapointsUpdated.includes(datapoint.id)) {
                    result.datapointsUpdated.push(datapoint.id);
                  }
                } catch (error) {
                  result.errors.push({
                    rowIndex,
                    column: dataColumn,
                    message: `Error actualizando ${datapoint.code}: ${error instanceof Error ? error.message : String(error)}`,
                    datapointCode: datapoint.code
                  });
                  result.failedRows++;
                }
              } else if (!result.datapointsUpdated.includes(datapoint.id)) {
                result.datapointsUpdated.push(datapoint.id);
              }
            }
          }
        }
      }

      result.processedRows++;
    } catch (error) {
      result.success = false;
      result.failedRows++;
      result.errors.push({
        rowIndex,
        message: error instanceof Error ? error.message : String(error)
      });
    }

    if (onProgress) {
      onProgress({ processed: rowIndex + 1, total: data.length });
    }
  }

  // Consolidation mode: apply accumulated sources to datapoints
  if (consolidationMode && !config.dryRun && updateDatapointFn && sourcesByDatapoint.size > 0) {
    for (const [datapointId, sourceMap] of sourcesByDatapoint) {
      const datapoint = sections.flatMap(s => s.datapoints).find(d => d.id === datapointId);
      if (!datapoint) continue;

      const sources = Array.from(sourceMap.values());
      const consolidatedValue = sources.reduce((sum, s) => {
        const v = s.values[yearKey];
        const num = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
        return sum + (isNaN(num) ? 0 : num);
      }, 0);

      try {
        const updates: Partial<ConsolidatedDatapoint> = {
          consolidationEnabled: true,
          consolidationMethod: 'sum',
          sources,
          values: { ...datapoint.values, [yearKey]: consolidatedValue },
          lastConsolidated: new Date().toISOString()
        };
        const updateResult = updateDatapointFn(datapointId, updates);
        if (updateResult instanceof Promise) await updateResult;
        if (!result.datapointsUpdated.includes(datapointId)) {
          result.datapointsUpdated.push(datapointId);
        }
      } catch (error) {
        result.errors.push({
          rowIndex: -1,
          message: `Error aplicando consolidación a ${datapoint.code}: ${error instanceof Error ? error.message : String(error)}`,
          datapointCode: datapoint.code
        });
      }
    }
  }

  return result;
};

/**
 * Complete bulk import workflow: map columns and import data
 */
export const executeBulkImport = async (
  data: BulkImportRow[],
  sections: StandardSection[],
  config: BulkImportConfig = {},
  onProgress?: (stage: string, progress?: { processed: number; total: number }) => void,
  updateDatapointFn?: (datapointId: string, updates: Partial<import('../types').Datapoint>) => void | Promise<void>
): Promise<BulkImportResult> => {
  try {
    // Stage 1: Extract columns
    onProgress?.('Extracting columns...');
    const columns = extractColumns(data);
    
    if (columns.length === 0) {
      throw new GeminiServiceError("No columns found in import data", 'NO_COLUMNS', false);
    }
    
    // Stage 2: Map columns to datapoints using AI
    onProgress?.('Mapping columns to datapoints...');
    const mappings = await mapColumnsToDatapoints(columns, sections, data.slice(0, 5));
    
    // Stage 3: Review mappings (optional - could show to user for confirmation)
    const highConfidenceMappings = mappings.filter(m => m.confidence >= 70);
    const lowConfidenceMappings = mappings.filter(m => m.confidence < 70 && m.confidence >= 50);
    const unmappedColumns = mappings.filter(m => m.confidence < 50);
    
    console.log(`Mapping results: ${highConfidenceMappings.length} high confidence, ${lowConfidenceMappings.length} low confidence, ${unmappedColumns.length} unmapped`);
    
    // Stage 4: Import data
    onProgress?.('Importing data...');
    const importResult = await importBulkData(data, mappings, sections, config, (progress) => {
      onProgress?.('Importing data...', progress);
    }, updateDatapointFn);
    
    return importResult;
  } catch (error) {
    if (error instanceof GeminiServiceError) {
      throw error;
    }
    throw new GeminiServiceError(
      `Bulk import failed: ${String(error)}`,
      'IMPORT_ERROR',
      false,
      error
    );
  }
};

/**
 * Validates bulk import data before processing
 */
export const validateBulkImportData = (
  data: BulkImportRow[],
  mappings: ColumnMapping[]
): { valid: boolean; errors: BulkImportError[] } => {
  const errors: BulkImportError[] = [];
  
  if (data.length === 0) {
    errors.push({
      rowIndex: -1,
      message: "No data rows provided"
    });
    return { valid: false, errors };
  }
  
  // Check that all mapped columns exist in data
  const availableColumns = extractColumns(data);
  mappings.forEach((mapping, idx) => {
    if (!availableColumns.includes(mapping.sourceColumn)) {
      errors.push({
        rowIndex: -1,
        column: mapping.sourceColumn,
        message: `Mapped column "${mapping.sourceColumn}" not found in data`,
        datapointCode: mapping.datapointCode
      });
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
};
