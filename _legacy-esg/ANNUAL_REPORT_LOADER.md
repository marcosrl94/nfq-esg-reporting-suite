# Annual Report Loader - Documentación

## Descripción

El **Annual Report Loader** es un módulo que permite cargar informes anuales previos (EINF, Informes Anuales, Informes de Sostenibilidad) y extraer automáticamente datos históricos usando IA para cumplimentar time-series por indicador y información cualitativa.

## Características

### 1. Carga de Informes
- Soporta archivos PDF y Word (.pdf, .doc, .docx)
- Selección de tipo de informe (EINF, Annual Report, Sustainability Report, Other)
- Especificación del año del informe

### 2. Extracción Automática con IA
- **Datos Cuantitativos**: Extrae valores numéricos históricos por indicador
- **Datos Cualitativos**: Extrae narrativas relevantes para requisitos ESG
- **Tendencias**: Identifica tendencias (aumento, disminución, estabilidad) y proporciona explicaciones

### 3. Revisión y Aplicación
- Visualización de datos extraídos con nivel de confianza
- Selección manual de qué datos aplicar
- Aplicación selectiva a los datapoints existentes

## Uso

### Paso 1: Cargar Informe
1. Selecciona el tipo de informe (EINF, Annual Report, etc.)
2. Especifica el año del informe
3. Selecciona el archivo PDF o Word
4. Haz clic en "Procesar Informe con IA"

### Paso 2: Revisar Datos Extraídos
- Revisa los datos cuantitativos extraídos
- Revisa las narrativas cualitativas
- Revisa las tendencias identificadas
- Verifica el nivel de confianza de cada extracción

### Paso 3: Seleccionar y Aplicar
- Marca/desmarca los datapoints que quieres aplicar
- Haz clic en "Aplicar Datos Seleccionados"
- Los datos se aplicarán automáticamente a los datapoints correspondientes

## Estructura de Datos Extraídos

```typescript
interface ExtractedHistoricalData {
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
}
```

## Procesamiento con IA

El sistema usa Google Gemini API para:
1. Analizar el contenido del informe
2. Identificar indicadores ESG mencionados
3. Extraer valores numéricos con contexto (año, unidad)
4. Extraer narrativas cualitativas relevantes
5. Identificar tendencias y proporcionar explicaciones

### Prompt de Extracción

El prompt incluye:
- Lista completa de indicadores ESG disponibles
- Instrucciones específicas para extracción
- Formato JSON estructurado para respuesta
- Validación de confianza y fuente

## Integración

El componente se integra con:
- `sections`: Lista de secciones ESRS con datapoints
- `onUpdateDatapoint`: Función para actualizar datapoints
- `reportingYear`: Año de reporting actual

## Limitaciones Actuales

1. **Extracción de PDF/Word**: Actualmente usa placeholders. Para producción, necesitarías:
   - `pdf-parse` o `pdfjs-dist` para PDFs
   - `mammoth` o `docx` para documentos Word

2. **Tamaño de archivo**: Los archivos grandes pueden requerir chunking

3. **Confianza**: Los niveles de confianza son estimaciones de la IA

## Mejoras Futuras

1. **Procesamiento de PDF/Word real**: Integrar librerías de extracción
2. **Validación cruzada**: Comparar con datos existentes
3. **Aplicación automática**: Opción para aplicar automáticamente datos de alta confianza
4. **Historial**: Guardar informes procesados para referencia
5. **Múltiples informes**: Procesar varios informes a la vez

## Ejemplo de Uso

```typescript
<AnnualReportLoader
  sections={sections}
  reportingYear={2024}
  onUpdateDatapoint={(id, updates) => {
    // Actualizar datapoint
  }}
  onDataExtracted={(data) => {
    console.log('Datos extraídos:', data);
  }}
/>
```

## Archivos Relacionados

- `components/AnnualReportLoader.tsx` - Componente principal
- `services/annualReportProcessor.ts` - Servicio de procesamiento con IA
- `App.tsx` - Integración en la aplicación principal

---

**Creado**: Enero 2026  
**Versión**: 1.0
