import { GoogleGenAI } from "@google/genai";
import { StandardSection } from '../types';
import { retryWithBackoff, handleApiError, GeminiServiceError } from './geminiService';

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
  datapointsUpdated: string[]; // IDs of datapoints that were updated
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
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

const getClient = (): GoogleGenAI => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new GeminiServiceError("API Key is missing", 'AUTH_ERROR', false);
  }
  return new GoogleGenAI({ apiKey });
};

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
    const ai = getClient();
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
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const jsonStr = response.text || "[]";
      const mappings: ColumnMapping[] = JSON.parse(jsonStr);
      
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

  // Create a lookup map: datapointCode -> sourceColumn
  const codeToColumnMap = new Map<string, string>();
  mappings.forEach(mapping => {
    if (mapping.confidence >= 50) { // Only use high-confidence mappings
      codeToColumnMap.set(mapping.datapointCode, mapping.sourceColumn);
    }
  });

  // Process each row
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    
    try {
      // Find and update matching datapoints
      // Use for...of loops instead of forEach to support await
      for (const section of sections) {
        for (const datapoint of section.datapoints) {
          const sourceColumn = codeToColumnMap.get(datapoint.code);
          
          if (sourceColumn && row[sourceColumn] !== undefined && row[sourceColumn] !== null) {
            const value = row[sourceColumn];
            
            // Validate value type matches datapoint type
            if (datapoint.type === 'quantitative') {
              const numValue = typeof value === 'number' ? value : parseFloat(String(value));
              if (isNaN(numValue)) {
                result.errors.push({
                  rowIndex,
                  column: sourceColumn,
                  message: `Invalid numeric value: ${value}`,
                  datapointCode: datapoint.code
                });
                result.failedRows++;
                continue; // Skip this datapoint
              }
            }
            
            // Update datapoint (if not dry run)
            if (!config.dryRun) {
              const updatedValues = {
                ...datapoint.values,
                [yearKey]: value
              };
              
              // Update datapoint using provided function or track for later
              if (updateDatapointFn) {
                try {
                  // Handle both sync and async functions
                  const updateResult = updateDatapointFn(datapoint.id, { values: updatedValues });
                  if (updateResult instanceof Promise) {
                    await updateResult;
                  }
                  if (!result.datapointsUpdated.includes(datapoint.id)) {
                    result.datapointsUpdated.push(datapoint.id);
                  }
                } catch (error) {
                  result.errors.push({
                    rowIndex,
                    column: sourceColumn,
                    message: `Failed to update datapoint ${datapoint.code}: ${error instanceof Error ? error.message : String(error)}`,
                    datapointCode: datapoint.code
                  });
                  result.failedRows++;
                }
              } else {
                // Fallback: just track which datapoints would be updated
                if (!result.datapointsUpdated.includes(datapoint.id)) {
                  result.datapointsUpdated.push(datapoint.id);
                }
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
    
    // Report progress
    if (onProgress) {
      onProgress({
        processed: rowIndex + 1,
        total: data.length
      });
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
