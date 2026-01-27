# Módulo de Gestión de Evidencias y Consolidación de Datos

## Resumen

Se han implementado dos módulos principales para mejorar la gestión de evidencias y permitir la consolidación de datos de múltiples responsables:

1. **Módulo de Gestión de Evidencias**: Sistema completo para subir, gestionar y extraer información automáticamente de evidencias usando IA.
2. **Consolidador de Datos**: Sistema para gestionar múltiples responsables (geografía, unidad de negocio, etc.) y generar métricas consolidadas con desgloses.

## Archivos Creados/Modificados

### Nuevos Archivos

1. **`services/evidenceService.ts`**
   - `extractEvidenceInformation()`: Extrae información automáticamente de archivos de evidencia
   - `analyzeEvidenceRequirements()`: Analiza si las evidencias cumplen con requisitos de información
   - `autoExtractFromEvidences()`: Extracción automática desde múltiples archivos con sugerencia de valor

2. **`services/consolidationService.ts`**
   - `consolidateValues()`: Consolida valores de múltiples fuentes según método configurado
   - `validateConsolidationSources()`: Valida consistencia de fuentes de consolidación
   - `generateConsolidationSummary()`: Genera estadísticas y resúmenes de consolidación

3. **`components/EvidenceManager.tsx`**
   - Componente completo para gestión de evidencias
   - Subida de archivos (PDF, Excel, Word, imágenes)
   - Extracción automática de información usando IA
   - Análisis de requisitos de información
   - Verificación de evidencias contra valores reportados

4. **`components/DataConsolidator.tsx`**
   - Componente para gestión de consolidación de datos
   - Gestión de múltiples fuentes (geografía, unidad de negocio, instalación)
   - Configuración de métodos de consolidación (suma, promedio, ponderado, etc.)
   - Visualizaciones (gráficos de pastel y barras)
   - Estadísticas y resúmenes

### Archivos Modificados

1. **`types.ts`**
   - Nuevos tipos: `EvidenceFile`, `ExtractedEvidenceData`, `EvidenceAnalysis`, `InformationRequirement`
   - Nuevos tipos: `ConsolidationSource`, `ConsolidatedDatapoint`, `ConsolidationBreakdown`, `ConsolidationConfig`

2. **`components/DataInput.tsx`**
   - Integración de `EvidenceManager` y `DataConsolidator`
   - Sistema de pestañas para alternar entre Datos, Evidencias y Consolidación
   - Mantiene compatibilidad con funcionalidad existente

3. **`services/geminiService.ts`**
   - Exportación de `getClient()` para uso en otros servicios

## Características Principales

### Gestión de Evidencias

- **Subida de Archivos**: Soporte para PDF, Excel, Word, imágenes
- **Extracción Automática**: IA extrae valores, unidades, años y texto relevante
- **Análisis de Requisitos**: Verifica si las evidencias cumplen requisitos de información específicos
- **Verificación Automática**: Compara valores extraídos con valores reportados
- **Extracción Masiva**: Procesa múltiples archivos y sugiere valor consolidado

### Consolidación de Datos

- **Múltiples Fuentes**: Gestiona fuentes por geografía, unidad de negocio, subsidiaria o instalación
- **Métodos de Consolidación**:
  - Suma
  - Promedio
  - Promedio Ponderado (con pesos configurables)
  - Máximo
  - Mínimo
  - Personalizado (fórmula)

- **Visualizaciones**:
  - Gráfico de pastel con desglose por dimensión
  - Gráfico de barras comparando fuentes
  - Estadísticas de cobertura y resumen

- **Validación**: Detecta inconsistencias y advertencias en los datos

## Uso

### Gestión de Evidencias

1. En la vista de "Data Ingestion", selecciona un datapoint
2. Ve a la pestaña "Evidencias"
3. Sube archivos de evidencia
4. Usa "Extraer información" para extraer datos automáticamente
5. Usa "Analizar requisitos" para verificar cumplimiento
6. Usa "Verificar evidencia" para comparar con valor reportado
7. Usa "Extracción Automática" para procesar múltiples archivos

### Consolidación de Datos

1. En la vista de "Data Ingestion", selecciona un datapoint
2. Ve a la pestaña "Consolidación"
3. Haz clic en "Habilitar Consolidación"
4. Agrega fuentes (geografía, unidad de negocio, etc.)
5. Asigna responsables a cada fuente
6. Ingresa valores por fuente y año
7. Configura el método de consolidación
8. Visualiza métricas consolidadas y desgloses

## Integración con Base de Datos

Los nuevos tipos están diseñados para integrarse con el esquema de base de datos existente:

- `evidence_files` table: Almacena metadatos de archivos de evidencia
- `datapoints` table: Puede almacenar datos de consolidación en campos JSONB
- Nuevos campos sugeridos:
  - `extracted_data` (JSONB) en `evidence_files`
  - `consolidation_config` (JSONB) en `datapoints`
  - `consolidation_sources` (JSONB) en `datapoints`

## Próximos Pasos Sugeridos

1. **Integración con Storage**: Conectar subida de archivos con Supabase Storage
2. **OCR Mejorado**: Implementar OCR para PDFs escaneados
3. **Fórmulas Personalizadas**: Editor visual para fórmulas de consolidación personalizadas
4. **Exportación**: Exportar reportes de consolidación en Excel/PDF
5. **Historial**: Mantener historial de cambios en consolidación
6. **Notificaciones**: Alertas cuando fuentes no han actualizado datos
7. **Aprobación de Consolidación**: Workflow de aprobación para valores consolidados

## Notas Técnicas

- Los servicios de IA usan el mismo sistema de reintentos y manejo de errores que `geminiService.ts`
- Los componentes son completamente responsivos y siguen el tema PALANTIR
- La consolidación se calcula en tiempo real cuando cambian los datos
- Las validaciones se ejecutan automáticamente y muestran advertencias
