import { GoogleGenAI } from "@google/genai";
import { Datapoint, MaterialityTopic } from '../types';

// ============================================
// ERROR TYPES & HANDLING
// ============================================

export class GeminiServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'GeminiServiceError';
  }
}

export class RateLimitError extends GeminiServiceError {
  constructor(message: string = 'Rate limit exceeded', originalError?: unknown) {
    super(message, 'RATE_LIMIT', true, originalError);
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends GeminiServiceError {
  constructor(message: string = 'Authentication failed', originalError?: unknown) {
    super(message, 'AUTH_ERROR', false, originalError);
    this.name = 'AuthenticationError';
  }
}

export class NetworkError extends GeminiServiceError {
  constructor(message: string = 'Network error', originalError?: unknown) {
    super(message, 'NETWORK_ERROR', true, originalError);
    this.name = 'NetworkError';
  }
}

// ============================================
// CONFIGURATION & CLIENT
// ============================================

const DEFAULT_MODEL = 'gemini-3-flash-preview';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 10000; // 10 seconds
const RATE_LIMIT_DELAY = 2000; // 2 seconds between requests

let lastRequestTime = 0;
let requestQueue: Promise<void> = Promise.resolve();

export const getClient = (): GoogleGenAI => {
  // Try both API_KEY and GEMINI_API_KEY for compatibility
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  
  // Check for missing or invalid API key
  if (!apiKey || apiKey === 'undefined' || apiKey === 'null' || apiKey === '') {
    throw new AuthenticationError(
      "API Key de Google Gemini no configurada. Por favor, configura la variable de entorno GEMINI_API_KEY en un archivo .env.local"
    );
  }
  
  // Check for placeholder values
  if (apiKey.includes('PLACEHOLDER') || apiKey.includes('tu_clave') || apiKey.includes('your_api_key') || apiKey.length < 20) {
    throw new AuthenticationError(
      "La API Key configurada parece ser un placeholder. Por favor, reemplaza 'PLACEHOLDER_API_KEY' con tu API key real de Google Gemini en el archivo .env.local"
    );
  }
  
  return new GoogleGenAI({ apiKey });
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Exponential backoff retry with jitter
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const calculateBackoffDelay = (attempt: number): number => {
  const exponentialDelay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
  const jitter = Math.random() * 1000; // Add randomness to prevent thundering herd
  return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY);
};

/**
 * Rate limiting: ensures minimum delay between requests
 */
const rateLimit = async (): Promise<void> => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    await sleep(RATE_LIMIT_DELAY - timeSinceLastRequest);
  }
  
  lastRequestTime = Date.now();
};

/**
 * Wraps an async function with retry logic
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  operationName: string = 'Operation'
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await rateLimit();
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's not a retryable error
      if (error instanceof GeminiServiceError && !error.retryable) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Handle specific error types
      if (error instanceof RateLimitError) {
        const delay = calculateBackoffDelay(attempt);
        console.warn(`${operationName} rate limited. Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(delay);
      } else if (error instanceof NetworkError || isNetworkError(error)) {
        const delay = calculateBackoffDelay(attempt);
        console.warn(`${operationName} network error. Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(delay);
      } else {
        // Unknown error, don't retry
        throw error;
      }
    }
  }
  
  // If we get here, all retries failed
  if (lastError instanceof GeminiServiceError) {
    throw lastError;
  }
  throw new GeminiServiceError(
    `${operationName} failed after ${maxRetries} retries`,
    'MAX_RETRIES_EXCEEDED',
    false,
    lastError
  );
}

/**
 * Checks if an error is a network-related error
 */
const isNetworkError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('fetch') ||
      message.includes('connection')
    );
  }
  return false;
};

/**
 * Parses Google API error response to extract user-friendly message
 */
const parseGoogleApiError = (error: any): string => {
  // Try to extract error message from Google API error structure
  if (error?.error?.message) {
    return error.error.message;
  }
  if (error?.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Error desconocido';
};

/**
 * Wraps API errors into typed errors
 */
export const handleApiError = (error: unknown, operation: string): never => {
  if (error instanceof GeminiServiceError) {
    throw error;
  }
  
  // Try to parse Google API error structure
  let errorMessage = '';
  let errorCode = '';
  
  if (error && typeof error === 'object') {
    const errorObj = error as any;
    
    // Check for Google API error structure
    if (errorObj.error) {
      errorMessage = errorObj.error.message || '';
      errorCode = errorObj.error.code?.toString() || errorObj.code?.toString() || '';
      
      // Check for API key errors specifically
      if (errorObj.error.details) {
        const apiKeyError = errorObj.error.details.find((d: any) => 
          d.reason === 'API_KEY_INVALID' || d.reason === 'API_KEY_NOT_FOUND'
        );
        if (apiKeyError) {
          throw new AuthenticationError(
            "La API Key de Google Gemini no es válida. Por favor, verifica que la clave esté correctamente configurada en el archivo .env.local",
            error
          );
        }
      }
    }
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('api key') || message.includes('authentication') || message.includes('unauthorized') || errorCode === '400') {
      const parsedMessage = parseGoogleApiError(error);
      if (parsedMessage.includes('API key not valid') || parsedMessage.includes('API_KEY_INVALID')) {
        throw new AuthenticationError(
          "La API Key de Google Gemini no es válida. Por favor, verifica que la clave esté correctamente configurada en el archivo .env.local",
          error
        );
      }
      throw new AuthenticationError(`Error de autenticación: ${parsedMessage}`, error);
    }
    
    if (message.includes('rate limit') || message.includes('quota') || message.includes('429')) {
      throw new RateLimitError(`Límite de tasa excedido: ${error.message}`, error);
    }
    
    if (isNetworkError(error)) {
      throw new NetworkError(`Error de red: ${error.message}`, error);
    }
  }
  
  const parsedMessage = parseGoogleApiError(error);
  throw new GeminiServiceError(
    `${operation} falló: ${parsedMessage}`,
    'UNKNOWN_ERROR',
    true,
    error
  );
};

// ============================================
// CORE SERVICE FUNCTIONS
// ============================================

export const generateNarrativeStream = async (
  datapoints: Datapoint[],
  sectionTitle: string,
  tone: string,
  onChunk: (text: string) => void
): Promise<void> => {
  await retryWithBackoff(async () => {
    const ai = getClient();
    const modelId = DEFAULT_MODEL;

    // Filter and format data for the AI, including history
    const approvedData = datapoints
      .filter(d => d.values && Object.values(d.values).some(v => v !== null && v !== ''))
      .map(d => ({
        code: d.code,
        name: d.name,
        reportedValues: d.values,
        unit: d.unit,
        description: d.description
      }));
    
    const prompt = `
      You are an expert AI reporting assistant for a large corporation, specializing in ESRS (European Sustainability Reporting Standards) and CSRD compliance.
      
      TASK: Write a narrative disclosure section for the standard: "${sectionTitle}".
      
      TONE: ${tone} (Corporate, Professional, Transparent).
      
      DATA SOURCE (Strictly adhere to these approved datapoints):
      ${JSON.stringify(approvedData, null, 2)}
      
      INSTRUCTIONS:
      1. Structure the text clearly with professional headings if necessary.
      2. Synthesize the quantitative data into a coherent story.
      3. CRITICAL: Analyze the TRENDS. Compare the current year's data (latest year) against previous years. State whether performance improved or declined (e.g., "Emissions decreased by 5% compared to 2023 due to...").
      4. Explain the qualitative aspects based on the input descriptions.
      5. If data is missing for a critical area, mention that it is currently being assessed, but do not make up a value.
      6. Maintain a high level of technical accuracy suitable for an Annual Report.
    `;

    try {
      // Use generateContentStream with correct API format
      const responseStream = await ai.models.generateContentStream({
        model: modelId,
        contents: prompt,
      });

      // Process stream chunks
      for await (const chunk of responseStream) {
        const text = chunk.text || chunk.response?.text || '';
        if (text) {
          onChunk(text);
        }
      }
    } catch (error) {
      console.error('Error in generateNarrativeStream:', error);
      handleApiError(error, 'generateNarrativeStream');
      throw error; // Re-throw to trigger retry
    }
  }, MAX_RETRIES, 'generateNarrativeStream');
};

export const checkConsistency = async (datapoints: Datapoint[]): Promise<string> => {
  return await retryWithBackoff(async () => {
    const ai = getClient();
    const modelId = DEFAULT_MODEL;

    const prompt = `
      Analyze the following ESG datapoints for logical consistency, potential errors, and significant deviations (outliers).
      
      Datapoints with history:
      ${JSON.stringify(datapoints.map(d => ({ code: d.code, name: d.name, values: d.values })), null, 2)}

      INSTRUCTIONS:
      1. Check if values fluctuate unrealistically between years (e.g. >50% change without context).
      2. Check if related metrics contradict (e.g. Production up but Emissions down - might be efficiency, but worth flagging).
      3. Return a concise list of warnings.
    `;

    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
      });

      const responseText = response.text || response.response?.text || "No consistency issues found.";
      return responseText;
    } catch (error) {
      console.error('Error in checkConsistency:', error);
      handleApiError(error, 'checkConsistency');
      throw error; // Re-throw to trigger retry
    }
  }, MAX_RETRIES, 'checkConsistency');
};

export const generateMaterialityMatrix = async (
  sectors: string[], 
  countries: string[], 
  userContext: string = "",
  contextLevel: string = "Group"
): Promise<MaterialityTopic[]> => {
  return await retryWithBackoff(async () => {
    const ai = getClient();
    const modelId = DEFAULT_MODEL;

    const prompt = `
      Act as a Chief Sustainability Officer performing a Double Materiality Assessment for a multinational infrastructure and services company.
      
      CONTEXT - TOP 5 EXPOSURES:
      - Business Sectors: ${sectors.join(', ')}
      - Operating Geographies: ${countries.join(', ')}
      
      ADDITIONAL INPUT FROM ENTITY (${contextLevel} Level):
      "${userContext}"
      
      INSTRUCTIONS:
      Identify 12-18 key material topics (IROs - Impacts, Risks, and Opportunities) relevant to this context. 
      Adhere strictly to ESRS/CSRD guidelines.
      
      CRITICAL ANALYSIS:
      1. Cross-reference the sector/country risks (e.g., Water Stress in Chile).
      2. INTEGRATE USER INPUT: If the user provided specific risks or findings in the "Additional Input", these MUST be included and weighted heavily in the scoring. Treat the user input as expert knowledge from internal workshops or audits.
      3. If the Context Level is "Subsidiary", focus on operational impacts. If "Group", focus on strategic/reputational impacts.

      SCORING:
      For each topic, assign a score from 0-100 for:
      1. "Financial Materiality" (X-axis: impact on enterprise value, capex, access to finance).
      2. "Impact Materiality" (Y-axis: impact on people, environment, human rights).
      
      Return ONLY a JSON array with the following structure:
      [
        {
          "id": "1",
          "name": "Topic Name",
          "category": "Environmental" | "Social" | "Governance",
          "financialScore": 85,
          "impactScore": 90,
          "description": "Brief reason linking sectors, countries, and user input."
        }
      ]
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
      try {
        return JSON.parse(jsonStr) as MaterialityTopic[];
      } catch (e) {
        console.error("Error parsing materiality JSON", e);
        return [];
      }
    } catch (error) {
      handleApiError(error, 'generateMaterialityMatrix');
    }
  }, MAX_RETRIES, 'generateMaterialityMatrix');
};

/**
 * Verifies evidence file against entered datapoint value.
 * Now supports both file names (legacy) and actual File/Buffer objects.
 */
export const verifyEvidence = async (
  datapointName: string,
  enteredValue: string | number,
  evidenceFile: File | Buffer | string, // Accept File, Buffer, or filename (legacy)
  unit: string = ""
): Promise<{
  status: 'verified' | 'mismatch' | 'pending' | 'unverified';
  extractedValue?: string | number;
  confidence?: number;
  reasoning?: string;
  lastChecked?: string;
}> => {
  return await retryWithBackoff(async () => {
    const ai = getClient();
    const modelId = DEFAULT_MODEL;

    let fileContent: string = '';
    let fileName: string = '';
    let mimeType: string = '';

    // Handle different input types
    if (evidenceFile instanceof File) {
      fileName = evidenceFile.name;
      mimeType = evidenceFile.type;
      // Convert File to base64 or text for AI processing
      if (evidenceFile.type.startsWith('text/') || evidenceFile.type === 'application/json') {
        fileContent = await evidenceFile.text();
      } else {
        // For binary files (PDF, Excel), convert to base64
        const arrayBuffer = await evidenceFile.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        fileContent = `[Base64 encoded ${evidenceFile.type} file: ${base64.substring(0, 1000)}...]`;
      }
    } else if (Buffer.isBuffer(evidenceFile)) {
      fileName = 'evidence_file';
      mimeType = 'application/octet-stream';
      // Convert Buffer to base64
      fileContent = `[Base64 encoded file: ${evidenceFile.toString('base64').substring(0, 1000)}...]`;
    } else {
      // Legacy: filename string (fallback for demo)
      fileName = evidenceFile;
      fileContent = `[File content not available - using filename heuristic: ${fileName}]`;
    }

    const prompt = `
      You are an AI Auditor for ESG data.
      
      TASK: Verify if the user-entered data matches the provided evidence file.
      
      DATAPOINT: "${datapointName}"
      USER ENTERED VALUE: "${enteredValue}" ${unit}
      EVIDENCE FILE NAME: "${fileName}"
      EVIDENCE FILE TYPE: "${mimeType}"
      
      ${fileContent ? `EVIDENCE FILE CONTENT:\n${fileContent}` : ''}
      
      INSTRUCTIONS:
      1. Extract the relevant numeric or text value from the evidence file that corresponds to the datapoint.
      2. Compare the extracted value with the user-entered value.
      3. If values match (within reasonable tolerance for numeric values), return status "verified".
      4. If values don't match, return status "mismatch" and explain the discrepancy.
      5. If the file cannot be processed or the value cannot be found, return status "unverified".
      6. Provide a confidence score (0-100) based on how certain you are of the extraction.
      
      OUTPUT JSON ONLY:
      {
        "status": "verified" | "mismatch" | "unverified",
        "extractedValue": "The value found in the file (as string or number)",
        "confidence": 0-100,
        "reasoning": "Explanation of the finding"
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || "{}");
      
      return {
        status: result.status || 'unverified',
        extractedValue: result.extractedValue,
        confidence: result.confidence,
        reasoning: result.reasoning,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      // If JSON parsing fails, return unverified status
      console.error("Error parsing verification response:", error);
      return {
        status: 'unverified',
        reasoning: "AI processing error",
        lastChecked: new Date().toISOString()
      };
    }
  }, MAX_RETRIES, 'verifyEvidence').catch((error) => {
    // Fallback error handling
    console.error("Error in verifyEvidence:", error);
    return {
      status: 'unverified' as const,
      reasoning: error instanceof Error ? error.message : "Unknown error",
      lastChecked: new Date().toISOString()
    };
  });
};
