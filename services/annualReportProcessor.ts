/**
 * Annual Report Processor - Extracción de datos históricos usando AI
 */
import { StandardSection, Datapoint } from '../types';
import { isGeminiProxyEnabled } from './geminiInvocation';
import { generateContentUnified } from './geminiService';

export interface ExtractedHistoricalData {
  reportYear: number;
  reportType: 'EINF' | 'Annual Report' | 'Sustainability Report' | 'Other';
  quantitativeData: Array<{
    datapointCode: string;
    datapointName: string;
    values: Record<string, number>; // year -> value
    unit?: string;
    confidence: number;
    sourcePage?: number;
  }>;
  qualitativeData: Array<{
    datapointCode: string;
    datapointName: string;
    narrative: string;
    year: number;
    confidence: number;
    sourcePage?: number;
  }>;
  trends: Array<{
    datapointCode: string;
    trend: 'increasing' | 'decreasing' | 'stable';
    explanation: string;
    years: number[];
  }>;
  metadata: {
    fileName: string;
    fileSize: number;
    processedAt: string;
    totalPages?: number;
  };
}


/**
 * Procesa un informe anual y extrae datos históricos
 */
export async function processAnnualReport(
  file: File,
  reportType: 'EINF' | 'Annual Report' | 'Sustainability Report' | 'Other',
  reportYear: number,
  sections: StandardSection[]
): Promise<ExtractedHistoricalData> {
  // 1. Leer contenido del archivo
  const fileContent = await extractFileContent(file);

  // 2. Construir lista de datapoints disponibles
  const datapointsList = sections.flatMap(s => 
    s.datapoints.map(dp => ({
      code: dp.code,
      name: dp.name,
      type: dp.type,
      unit: dp.unit
    }))
  );

  // 3. Preparar prompt para Gemini
  const prompt = buildExtractionPrompt(
    fileContent,
    reportType,
    reportYear,
    datapointsList
  );

  // 4. Llamar a Gemini (proxy Edge o clave local)
  if (!isGeminiProxyEnabled() && !resolveGeminiKeyOk()) {
    return getMockExtractedData(file, reportType, reportYear);
  }

  const modelId = 'gemini-3-flash-preview';

  try {
    const jsonStr = await generateContentUnified({
      model: modelId,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    let extractedData: unknown;
    try {
      const cleanedText = jsonStr
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      extractedData = JSON.parse(cleanedText || '{}');
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Response text:', jsonStr);
      throw new Error('Error al parsear respuesta de IA. Por favor, intenta de nuevo.');
    }

    // 6. Validar y estructurar datos
    return validateAndStructureData(extractedData, file, reportType, reportYear);
  } catch (error: any) {
    console.error('Error calling Gemini API:', error);
    const errorMessage = error?.message || error?.toString() || 'Error desconocido';
    throw new Error(`Error al procesar el informe: ${errorMessage}`);
  }
}

/**
 * Construye el prompt para extracción de datos
 */
function buildExtractionPrompt(
  fileContent: string,
  reportType: string,
  reportYear: number,
  datapointsList: Array<{ code: string; name: string; type: string; unit?: string }>
): string {
  const datapointsJSON = JSON.stringify(datapointsList, null, 2);

  return `
Eres un experto en análisis de informes ESG y reporting CSRD/ESRS.

TAREA:
Analiza el siguiente informe ${reportType} del año ${reportYear} y extrae:
1. Datos cuantitativos que correspondan a los indicadores ESG listados
2. Narrativas cualitativas relevantes para los requisitos ESG
3. Tendencias identificadas en los datos

INFORME:
${fileContent.substring(0, 100000)} ${fileContent.length > 100000 ? '...' : ''}

INDICADORES ESG DISPONIBLES:
${datapointsJSON}

INSTRUCCIONES:
1. Para cada indicador cuantitativo encontrado:
   - Extrae el valor numérico
   - Identifica la unidad (tCO2e, %, horas, etc.)
   - Extrae valores para todos los años mencionados en el informe
   - Indica el nivel de confianza (0-100)
   - Indica la página donde se encontró (si es posible)

2. Para cada requisito cualitativo:
   - Extrae la narrativa relevante
   - Identifica el año al que corresponde
   - Indica el nivel de confianza

3. Identifica tendencias:
   - Compara valores entre años
   - Identifica si hay aumentos, disminuciones o estabilidad
   - Proporciona explicaciones breves

RESPONDE EN FORMATO JSON ESTRICTO:
{
  "quantitativeData": [
    {
      "datapointCode": "E1-6-01",
      "datapointName": "Gross Scope 1 GHG emissions",
      "values": {
        "2023": 48500,
        "2022": 51000
      },
      "unit": "tCO2e",
      "confidence": 95,
      "sourcePage": 45
    }
  ],
  "qualitativeData": [
    {
      "datapointCode": "E1-1",
      "datapointName": "Transition plan for climate change mitigation",
      "narrative": "Texto extraído del informe...",
      "year": 2023,
      "confidence": 90,
      "sourcePage": 12
    }
  ],
  "trends": [
    {
      "datapointCode": "E1-6-01",
      "trend": "decreasing",
      "explanation": "Las emisiones Scope 1 disminuyeron un 5% respecto al año anterior debido a...",
      "years": [2022, 2023]
    }
  ]
}

IMPORTANTE:
- Solo incluye datos que realmente aparezcan en el informe
- Si no encuentras datos para un indicador, no lo incluyas
- La confianza debe reflejar qué tan seguro estás de la extracción
- Los valores deben ser numéricos (no texto) para datos cuantitativos
`;
}

/**
 * Extrae contenido de un archivo
 */
async function extractFileContent(file: File): Promise<string> {
  const mimeType = file.type;

  if (mimeType === 'application/pdf') {
    // Para PDF, necesitarías una librería como pdf-parse
    // Por ahora, retornamos un placeholder
    return `[PDF Content - ${file.name}]`;
  } else if (
    mimeType.includes('wordprocessingml') ||
    mimeType === 'application/msword'
  ) {
    // Para Word, necesitarías una librería como mammoth
    // Por ahora, retornamos un placeholder
    return `[Word Document Content - ${file.name}]`;
  } else {
    // Texto plano
    return await file.text();
  }
}

/**
 * Valida y estructura los datos extraídos
 */
function validateAndStructureData(
  extractedData: any,
  file: File,
  reportType: string,
  reportYear: number
): ExtractedHistoricalData {
  // Validar estructura básica
  if (!extractedData.quantitativeData) {
    extractedData.quantitativeData = [];
  }
  if (!extractedData.qualitativeData) {
    extractedData.qualitativeData = [];
  }
  if (!extractedData.trends) {
    extractedData.trends = [];
  }

  // Validar y limpiar datos cuantitativos
  const quantitativeData = extractedData.quantitativeData
    .filter((d: any) => d.datapointCode && d.values)
    .map((d: any) => ({
      datapointCode: d.datapointCode,
      datapointName: d.datapointName || d.datapointCode,
      values: normalizeValues(d.values),
      unit: d.unit,
      confidence: Math.max(0, Math.min(100, d.confidence || 70)),
      sourcePage: d.sourcePage
    }));

  // Validar y limpiar datos cualitativos
  const qualitativeData = extractedData.qualitativeData
    .filter((d: any) => d.datapointCode && d.narrative)
    .map((d: any) => ({
      datapointCode: d.datapointCode,
      datapointName: d.datapointName || d.datapointCode,
      narrative: d.narrative.trim(),
      year: d.year || reportYear,
      confidence: Math.max(0, Math.min(100, d.confidence || 70)),
      sourcePage: d.sourcePage
    }));

  // Validar tendencias
  const trends = extractedData.trends
    .filter((t: any) => t.datapointCode && t.trend && t.explanation)
    .map((t: any) => ({
      datapointCode: t.datapointCode,
      trend: ['increasing', 'decreasing', 'stable'].includes(t.trend) 
        ? t.trend 
        : 'stable',
      explanation: t.explanation.trim(),
      years: Array.isArray(t.years) ? t.years : []
    }));

  return {
    reportYear,
    reportType: reportType as any,
    quantitativeData,
    qualitativeData,
    trends,
    metadata: {
      fileName: file.name,
      fileSize: file.size,
      processedAt: new Date().toISOString()
    }
  };
}

/** Resumen compacto para el prompt de explicación (evita exceder límites de contexto). */
function buildExplanationPayload(data: ExtractedHistoricalData): string {
  const q = data.quantitativeData.map((d) => ({
    code: d.datapointCode,
    name: d.datapointName,
    values: d.values,
    unit: d.unit,
    confidence: d.confidence,
    sourcePage: d.sourcePage
  }));
  const qual = data.qualitativeData.map((d) => ({
    code: d.datapointCode,
    name: d.datapointName,
    year: d.year,
    confidence: d.confidence,
    narrativePreview: d.narrative.length > 600 ? `${d.narrative.slice(0, 600)}…` : d.narrative
  }));
  const trends = data.trends.map((t) => ({
    code: t.datapointCode,
    trend: t.trend,
    years: t.years,
    explanation: t.explanation.length > 400 ? `${t.explanation.slice(0, 400)}…` : t.explanation
  }));
  return JSON.stringify(
    {
      reportYear: data.reportYear,
      reportType: data.reportType,
      fileName: data.metadata.fileName,
      counts: {
        quantitative: data.quantitativeData.length,
        qualitative: data.qualitativeData.length,
        trends: data.trends.length
      },
      quantitativeData: q,
      qualitativeData: qual,
      trends
    },
    null,
    2
  );
}

function resolveGeminiKeyOk(): boolean {
  let apiKey = '';
  try {
    apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
    if ((!apiKey || apiKey === 'undefined' || apiKey === 'null' || apiKey === '') &&
      typeof process !== 'undefined' &&
      process.env) {
      apiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '') as string;
    }
  } catch {
    /* ignore */
  }
  return Boolean(
    apiKey &&
      apiKey.length >= 10 &&
      !apiKey.includes('PLACEHOLDER') &&
      !apiKey.includes('tu_clave')
  );
}

function mockExtractionExplanation(data: ExtractedHistoricalData): string {
  const nQ = data.quantitativeData.length;
  const nQual = data.qualitativeData.length;
  const nT = data.trends.length;
  const lowConf =
    [...data.quantitativeData, ...data.qualitativeData].filter((d) => d.confidence < 60).length;
  return [
    '**Resumen (sin conexión a IA)**',
    '',
    `Se procesó el informe **${data.metadata.fileName}** (${data.reportType}, año de referencia ${data.reportYear}).`,
    '',
    `- Indicadores cuantitativos detectados: **${nQ}**`,
    `- Narrativas cualitativas: **${nQual}**`,
    `- Tendencias identificadas: **${nT}**`,
    lowConf > 0
      ? `- Hay **${lowConf}** extracción(es) con confianza inferior al 60%; conviene revisarlas antes de aplicar.`
      : '- Las confianzas medias son aceptables; revisa igualmente los valores críticos.',
    '',
    'Configura el proxy de Gemini o `GEMINI_API_KEY` para obtener una explicación detallada generada por el agente.'
  ].join('\n');
}

/**
 * Genera una explicación en lenguaje natural del resultado de la extracción (segunda pasada con IA).
 */
export async function generateExtractionExplanation(data: ExtractedHistoricalData): Promise<string> {
  if (!isGeminiProxyEnabled() && !resolveGeminiKeyOk()) {
    return mockExtractionExplanation(data);
  }

  const payload = buildExplanationPayload(data);
  const prompt = `Eres un analista senior de reporting ESG (CSRD/ESRS). Tu audiencia son responsables de datos y sostenibilidad.

Te paso el RESULTADO ESTRUCTURADO de una extracción automática desde un informe (no el informe completo). Tu tarea es EXPLICAR en español, de forma clara y accionable:

1. **Qué se ha extraído**: qué tipo de información y para qué indicadores (códigos).
2. **Calidad del resultado**: cobertura, niveles de confianza si son relevantes, y posibles lagunas.
3. **Tendencias**: si hay, qué implican en términos de negocio o cumplimiento.
4. **Recomendaciones**: qué validar manualmente antes de aplicar los datos al sistema, y qué riesgos vigilar.

Datos de extracción (JSON):
${payload}

Formato de respuesta:
- Usa secciones con títulos en negrita Markdown (por ejemplo **Resumen**, **Detalle por bloques**, **Recomendaciones**).
- Sé conciso pero completo (máximo unas 400 palabras).
- No inventes cifras que no aparezcan en el JSON.
- Si el JSON indica conteos en cero, explica que no hubo coincidencias con los indicadores del sistema o que el documento no aportó datos mapeables.`;

  const modelId = 'gemini-3-flash-preview';
  const text = await generateContentUnified({
    model: modelId,
    contents: prompt
  });
  return text.trim() || mockExtractionExplanation(data);
}

/**
 * Normaliza valores numéricos
 */
function normalizeValues(values: Record<string, any>): Record<string, number> {
  const normalized: Record<string, number> = {};

  for (const [year, value] of Object.entries(values)) {
    if (typeof value === 'number') {
      normalized[year] = value;
    } else if (typeof value === 'string') {
      // Intentar parsear número (remover comas, espacios, etc.)
      const cleaned = value.replace(/[,\s]/g, '');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) {
        normalized[year] = parsed;
      }
    }
  }

  return normalized;
}

/**
 * Retorna datos de ejemplo cuando no hay API key configurada
 */
function getMockExtractedData(
  file: File,
  reportType: string,
  reportYear: number
): ExtractedHistoricalData {
  return {
    reportYear,
    reportType: reportType as any,
    quantitativeData: [],
    qualitativeData: [],
    trends: [],
    metadata: {
      fileName: file.name,
      fileSize: file.size,
      processedAt: new Date().toISOString()
    }
  };
}

/**
 * Aplica datos extraídos a los datapoints existentes
 */
export async function applyExtractedData(
  quantitativeData: ExtractedHistoricalData['quantitativeData'],
  qualitativeData: ExtractedHistoricalData['qualitativeData'],
  sections: StandardSection[],
  updateDatapoint: (datapointId: string, updates: Partial<Datapoint>) => void
): Promise<{ applied: number; errors: string[] }> {
  const errors: string[] = [];
  let applied = 0;

  // Aplicar datos cuantitativos
  for (const data of quantitativeData) {
    try {
      // Buscar datapoint por código
      const datapoint = sections
        .flatMap(s => s.datapoints)
        .find(dp => dp.code === data.datapointCode);

      if (!datapoint) {
        errors.push(`Datapoint ${data.datapointCode} no encontrado`);
        continue;
      }

      // Actualizar valores históricos
      const updatedValues = {
        ...datapoint.values,
        ...data.values
      };

      updateDatapoint(datapoint.id, {
        values: updatedValues
      });

      applied++;
    } catch (error: any) {
      errors.push(`Error aplicando ${data.datapointCode}: ${error.message}`);
    }
  }

  // Aplicar datos cualitativos
  for (const data of qualitativeData) {
    try {
      const datapoint = sections
        .flatMap(s => s.datapoints)
        .find(dp => dp.code === data.datapointCode);

      if (!datapoint) {
        errors.push(`Datapoint ${data.datapointCode} no encontrado`);
        continue;
      }

      // Actualizar valor cualitativo para el año correspondiente
      const updatedValues = {
        ...datapoint.values,
        [data.year.toString()]: data.narrative
      };

      updateDatapoint(datapoint.id, {
        values: updatedValues
      });

      applied++;
    } catch (error: any) {
      errors.push(`Error aplicando narrativa ${data.datapointCode}: ${error.message}`);
    }
  }

  return { applied, errors };
}
