import { GoogleGenAI } from "@google/genai";
import { Datapoint, EvidenceFile, ExtractedEvidenceData, InformationRequirement, EvidenceAnalysis } from '../types';
import { retryWithBackoff, handleApiError, GeminiServiceError, getClient } from './geminiService';

const DEFAULT_MODEL = 'gemini-3-flash-preview';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILE_CONTENT_PREVIEW = 50000; // 50KB preview for AI

/** Safe Buffer check - Buffer is Node-only, undefined in browser */
const isBuffer = (val: unknown): boolean =>
  typeof Buffer !== 'undefined' && Buffer.isBuffer(val);

// Valid file types
const VALID_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/json',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif'
];

/**
 * Validates file before processing
 */
const validateFile = (file: File | Buffer): { valid: boolean; error?: string } => {
  if (file instanceof File) {
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB` };
    }
    if (file.size === 0) {
      return { valid: false, error: 'File is empty' };
    }
    if (!VALID_MIME_TYPES.includes(file.type) && !file.name.match(/\.(pdf|xlsx|xls|doc|docx|txt|csv|json|png|jpg|jpeg|gif)$/i)) {
      return { valid: false, error: 'Invalid file type. Supported: PDF, Excel, Word, Text, CSV, JSON, Images' };
    }
  } else if (isBuffer(file)) {
    if (file.length > MAX_FILE_SIZE) {
      return { valid: false, error: `Buffer size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB` };
    }
    if (file.length === 0) {
      return { valid: false, error: 'Buffer is empty' };
    }
  }
  return { valid: true };
};

/**
 * Extracts information from evidence file to automatically fill datapoint requirements
 */
export const extractEvidenceInformation = async (
  evidenceFile: File | Buffer,
  datapoint: Datapoint,
  informationRequirements?: InformationRequirement[]
): Promise<ExtractedEvidenceData> => {
  // Validate file first
  const validation = validateFile(evidenceFile);
  if (!validation.valid) {
    throw new GeminiServiceError(validation.error || 'Invalid file', 'VALIDATION_ERROR', false);
  }

  if (!datapoint || !datapoint.id) {
    throw new GeminiServiceError('Invalid datapoint provided', 'VALIDATION_ERROR', false);
  }

  return await retryWithBackoff(async () => {
    const ai = getClient();
    const modelId = DEFAULT_MODEL;

    let fileContent: string = '';
    let fileName: string = '';
    let mimeType: string = '';

    try {
      // Process file based on type
      if (evidenceFile instanceof File) {
        fileName = evidenceFile.name;
        mimeType = evidenceFile.type || 'application/octet-stream';
        
        if (evidenceFile.type.startsWith('text/') || evidenceFile.type === 'application/json') {
          const text = await evidenceFile.text();
          fileContent = text.substring(0, MAX_FILE_CONTENT_PREVIEW);
          if (text.length > MAX_FILE_CONTENT_PREVIEW) {
            fileContent += `\n[... ${text.length - MAX_FILE_CONTENT_PREVIEW} more characters ...]`;
          }
        } else if (evidenceFile.type === 'application/pdf') {
          // For PDFs, we'll need to extract text (simplified for now)
          // In production, use a PDF parsing library
          fileContent = `[PDF file: ${fileName}, Size: ${(evidenceFile.size / 1024).toFixed(2)} KB. Content extraction requires PDF parser.]`;
        } else if (evidenceFile.type.includes('spreadsheet') || evidenceFile.name.match(/\.(xlsx|xls)$/i)) {
          // For Excel files
          fileContent = `[Excel file: ${fileName}, Size: ${(evidenceFile.size / 1024).toFixed(2)} KB. Content extraction requires Excel parser.]`;
        } else if (evidenceFile.type.startsWith('image/')) {
          fileContent = `[Image file: ${fileName}, Size: ${(evidenceFile.size / 1024).toFixed(2)} KB. OCR extraction requires image processing.]`;
        } else {
          // For other binary files, provide metadata only
          fileContent = `[Binary file: ${fileName}, Type: ${mimeType}, Size: ${(evidenceFile.size / 1024).toFixed(2)} KB]`;
        }
      } else if (isBuffer(evidenceFile)) {
        fileName = 'evidence_file';
        mimeType = 'application/octet-stream';
        fileContent = `[Buffer data: ${evidenceFile.length} bytes]`;
      } else {
        throw new GeminiServiceError('Invalid file type provided', 'VALIDATION_ERROR', false);
      }
    } catch (error) {
      if (error instanceof GeminiServiceError) {
        throw error;
      }
      throw new GeminiServiceError(`Error processing file: ${error instanceof Error ? error.message : String(error)}`, 'FILE_PROCESSING_ERROR', false, error);
    }

    // Build requirements context
    const requirementsContext = informationRequirements && informationRequirements.length > 0
      ? `\n\nINFORMATION REQUIREMENTS TO EXTRACT:\n${informationRequirements.map(r => `- ${r.requirement}`).join('\n')}`
      : '';

    const prompt = `
      You are an AI assistant specialized in extracting ESG data from evidence documents.
      
      TASK: Extract relevant information from the provided evidence file to populate the datapoint: "${datapoint.name}" (${datapoint.code}).
      
      DATAPOINT CONTEXT:
      - Code: ${datapoint.code}
      - Name: ${datapoint.name}
      - Description: ${datapoint.description}
      - Type: ${datapoint.type}
      - Unit: ${datapoint.unit || 'N/A'}
      ${requirementsContext}
      
      EVIDENCE FILE:
      - Name: ${fileName}
      - Type: ${mimeType}
      - Content Preview: ${fileContent.substring(0, MAX_FILE_CONTENT_PREVIEW)}
      
      INSTRUCTIONS:
      1. Extract the specific value or information that corresponds to this datapoint.
      2. For quantitative datapoints, extract the numeric value and unit.
      3. For qualitative datapoints, extract the relevant text or description.
      4. Identify the reporting year/period if available.
      5. Assess your confidence level (0-100) in the extraction.
      6. If multiple values are found, use the most relevant one based on the datapoint description.
      7. If information requirements are specified, prioritize extracting those.
      
      Return ONLY a JSON object with this structure:
      {
        "extractedValue": "The extracted value (number for quantitative, string for qualitative)",
        "extractedUnit": "Unit if found (e.g., 'tCO2e', '%', 'hours')",
        "extractedYear": 2024,
        "extractedText": "Additional context or full text for qualitative datapoints",
        "confidence": 85,
        "extractionMethod": "ai",
        "extractedAt": "${new Date().toISOString()}"
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text || "{}";
      let result: any;
      
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new GeminiServiceError(
          `Invalid JSON response from AI: ${responseText.substring(0, 200)}`,
          'PARSE_ERROR',
          false,
          parseError
        );
      }
      
      // Validate and sanitize result
      const extractedValue = result.extractedValue !== undefined ? result.extractedValue : null;
      const extractedUnit = result.extractedUnit || null;
      const extractedYear = typeof result.extractedYear === 'number' && result.extractedYear > 1900 && result.extractedYear < 2100
        ? result.extractedYear
        : null;
      const extractedText = result.extractedText || null;
      const confidence = Math.max(0, Math.min(100, typeof result.confidence === 'number' ? result.confidence : 0));
      
      return {
        extractedValue,
        extractedUnit,
        extractedYear,
        extractedText,
        confidence,
        extractionMethod: 'ai',
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof GeminiServiceError) {
        throw error;
      }
      handleApiError(error, 'extractEvidenceInformation');
    }
  }, 3, 'extractEvidenceInformation');
};

/**
 * Analyzes evidence file to check if it meets information requirements
 */
export const analyzeEvidenceRequirements = async (
  evidenceFile: File | Buffer,
  datapoint: Datapoint,
  requirements: InformationRequirement[]
): Promise<EvidenceAnalysis> => {
  // Validate inputs
  const validation = validateFile(evidenceFile);
  if (!validation.valid) {
    throw new GeminiServiceError(validation.error || 'Invalid file', 'VALIDATION_ERROR', false);
  }

  if (!requirements || requirements.length === 0) {
    throw new GeminiServiceError('No requirements provided for analysis', 'VALIDATION_ERROR', false);
  }

  if (!datapoint || !datapoint.id) {
    throw new GeminiServiceError('Invalid datapoint provided', 'VALIDATION_ERROR', false);
  }

  return await retryWithBackoff(async () => {
    const ai = getClient();
    const modelId = DEFAULT_MODEL;

    let fileName: string = '';
    let fileContent: string = '';

    try {
      if (evidenceFile instanceof File) {
        fileName = evidenceFile.name;
        if (evidenceFile.type.startsWith('text/')) {
          const text = await evidenceFile.text();
          fileContent = text.substring(0, MAX_FILE_CONTENT_PREVIEW);
          if (text.length > MAX_FILE_CONTENT_PREVIEW) {
            fileContent += `\n[... ${text.length - MAX_FILE_CONTENT_PREVIEW} more characters ...]`;
          }
        } else {
          fileContent = `[File: ${fileName}, Type: ${evidenceFile.type || 'unknown'}, Size: ${(evidenceFile.size / 1024).toFixed(2)} KB]`;
        }
      } else if (isBuffer(evidenceFile)) {
        fileName = 'evidence_file';
        fileContent = `[Buffer data: ${(evidenceFile as { length: number }).length} bytes]`;
      }
    } catch (error) {
      throw new GeminiServiceError(`Error processing file: ${error instanceof Error ? error.message : String(error)}`, 'FILE_PROCESSING_ERROR', false, error);
    }

    const prompt = `
      You are an AI auditor analyzing evidence files for ESG compliance.
      
      TASK: Determine if the evidence file meets the information requirements for datapoint "${datapoint.name}" (${datapoint.code}).
      
      DATAPOINT: ${datapoint.name}
      DESCRIPTION: ${datapoint.description}
      
      INFORMATION REQUIREMENTS:
      ${requirements.map((r, idx) => `${idx + 1}. ${r.requirement} (Required: ${r.required ? 'Yes' : 'No'})`).join('\n')}
      
      EVIDENCE FILE:
      - Name: ${fileName}
      - Content: ${fileContent.substring(0, MAX_FILE_CONTENT_PREVIEW)}
      
      INSTRUCTIONS:
      1. Check if each requirement is met by the evidence file.
      2. Extract the value if found.
      3. Provide reasoning for each requirement status.
      4. Return a confidence score (0-100).
      
      Return ONLY a JSON object:
      {
        "status": "verified" | "mismatch" | "pending" | "unverified",
        "extractedValue": "Value found in evidence",
        "confidence": 85,
        "reasoning": "Explanation of findings",
        "requirementsMet": ["Requirement 1", "Requirement 2"],
        "missingRequirements": ["Requirement 3"]
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text || "{}";
      let result: any;
      
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new GeminiServiceError(
          `Invalid JSON response from AI: ${responseText.substring(0, 200)}`,
          'PARSE_ERROR',
          false,
          parseError
        );
      }
      
      // Validate status
      const validStatuses = ['verified', 'mismatch', 'pending', 'unverified'];
      const status = validStatuses.includes(result.status) ? result.status : 'unverified';
      
      return {
        status,
        extractedValue: result.extractedValue !== undefined ? result.extractedValue : null,
        confidence: typeof result.confidence === 'number' ? Math.max(0, Math.min(100, result.confidence)) : 0,
        reasoning: result.reasoning || 'No reasoning provided',
        lastChecked: new Date().toISOString(),
        requirementsMet: Array.isArray(result.requirementsMet) ? result.requirementsMet : [],
        missingRequirements: Array.isArray(result.missingRequirements) ? result.missingRequirements : []
      };
    } catch (error) {
      if (error instanceof GeminiServiceError) {
        throw error;
      }
      handleApiError(error, 'analyzeEvidenceRequirements');
    }
  }, 3, 'analyzeEvidenceRequirements');
};

/**
 * Automatically extracts information from multiple evidence files and suggests datapoint values
 */
export const autoExtractFromEvidences = async (
  evidenceFiles: File[],
  datapoint: Datapoint,
  requirements?: InformationRequirement[]
): Promise<{
  suggestedValue: string | number | null;
  confidence: number;
  sources: Array<{ fileName: string; extractedValue: string | number; confidence: number }>;
  reasoning: string;
}> => {
  // Validate inputs
  if (!evidenceFiles || evidenceFiles.length === 0) {
    throw new GeminiServiceError('No evidence files provided', 'VALIDATION_ERROR', false);
  }

  if (!datapoint || !datapoint.id) {
    throw new GeminiServiceError('Invalid datapoint provided', 'VALIDATION_ERROR', false);
  }

  // Validate all files first
  const invalidFiles = evidenceFiles.filter(file => !validateFile(file).valid);
  if (invalidFiles.length > 0) {
    throw new GeminiServiceError(
      `Invalid files: ${invalidFiles.map(f => f.name).join(', ')}`,
      'VALIDATION_ERROR',
      false
    );
  }

  const extractions = await Promise.allSettled(
    evidenceFiles.map(async (file) => {
      const extracted = await extractEvidenceInformation(file, datapoint, requirements);
      return {
        fileName: file.name,
        extractedValue: extracted.extractedValue,
        confidence: extracted.confidence || 0
      };
    })
  );

  // Process results, filtering out failed extractions
  const validExtractions = extractions
    .filter((result): result is PromiseFulfilledResult<{ fileName: string; extractedValue: string | number; confidence: number }> => 
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value);

  const failedExtractions = extractions.filter(result => result.status === 'rejected');
  
  if (failedExtractions.length > 0) {
    console.warn(`${failedExtractions.length} extraction(s) failed:`, failedExtractions.map(r => 
      r.status === 'rejected' ? r.reason : null
    ).filter(Boolean));
  }

  if (validExtractions.length === 0) {
    return {
      suggestedValue: null,
      confidence: 0,
      sources: [],
      reasoning: `No valid extractions found from ${evidenceFiles.length} evidence file(s). ${failedExtractions.length > 0 ? 'All extractions failed.' : ''}`
    };
  }

  // For quantitative datapoints, calculate average or sum based on context
  if (datapoint.type === 'quantitative') {
    const numericValues = validExtractions
      .map(e => {
        const val = typeof e.extractedValue === 'number' ? e.extractedValue : parseFloat(String(e.extractedValue));
        return isNaN(val) || !isFinite(val) ? null : val;
      })
      .filter((v): v is number => v !== null);

    if (numericValues.length > 0) {
      // Use weighted average based on confidence
      const totalConfidence = validExtractions.reduce((sum, e) => sum + Math.max(0, Math.min(100, e.confidence)), 0);
      
      if (totalConfidence > 0) {
        const weightedSum = validExtractions.reduce((sum, e) => {
          const val = typeof e.extractedValue === 'number' ? e.extractedValue : parseFloat(String(e.extractedValue));
          if (isNaN(val) || !isFinite(val)) return sum;
          return sum + (val * Math.max(0, Math.min(100, e.confidence)));
        }, 0);
        
        const suggestedValue = weightedSum / totalConfidence;
        const avgConfidence = totalConfidence / validExtractions.length;

        if (!isFinite(suggestedValue)) {
          // Fallback to simple average if weighted average fails
          const simpleAvg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
          return {
            suggestedValue: isFinite(simpleAvg) ? simpleAvg : numericValues[0],
            confidence: Math.round(avgConfidence),
            sources: validExtractions,
            reasoning: `Extracted from ${validExtractions.length} evidence file(s). Using simple average (weighted calculation failed).`
          };
        }

        return {
          suggestedValue,
          confidence: Math.round(avgConfidence),
          sources: validExtractions,
          reasoning: `Extracted from ${validExtractions.length} evidence file(s). Using weighted average based on confidence scores.`
        };
      } else {
        // Fallback to simple average
        const simpleAvg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        return {
          suggestedValue: isFinite(simpleAvg) ? simpleAvg : numericValues[0],
          confidence: 0,
          sources: validExtractions,
          reasoning: `Extracted from ${validExtractions.length} evidence file(s). Using simple average (no confidence scores available).`
        };
      }
    }
  }

  // For qualitative, use the highest confidence extraction
  if (validExtractions.length > 0) {
    const bestExtraction = validExtractions.reduce((best, current) => 
      (current.confidence || 0) > (best.confidence || 0) ? current : best
    );

    return {
      suggestedValue: bestExtraction.extractedValue,
      confidence: bestExtraction.confidence,
      sources: validExtractions,
      reasoning: `Extracted from ${validExtractions.length} evidence file(s). Using highest confidence extraction.`
    };
  }

  // Fallback (should not reach here)
  return {
    suggestedValue: null,
    confidence: 0,
    sources: [],
    reasoning: 'Unable to extract value from evidence files.'
  };
};
