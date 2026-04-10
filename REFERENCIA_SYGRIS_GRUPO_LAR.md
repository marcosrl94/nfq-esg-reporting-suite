# Referencia: Implantación Sygris Reporting (Grupo LAR)

Documento de alineación basado en la propuesta **"Grupo LAR - Implantación Sygris Reporting"** (Nfq Advisory Services, Marzo 2024). Sirve como guía para alinear la NFQ ESG Reporting Suite con el modelo Sygris.

---

## 1. Modelo Sygris: Tres Niveles de Configuración

Sygris estructura los datos en tres niveles (doc. p.18-19):

| Sygris | NFQ ESG Suite | Estado |
|--------|---------------|--------|
| **Networks** | Jerarquía organizacional, `ConsolidationSource`, `OrganizationalHierarchy` | ✅ Parcial: hierarchyService, fuentes por geografía/instalación |
| **Alcance** | Indicadores/datapoints (ESRS E1-1, S1-9, etc.) | ✅ Completo: StandardSection, Datapoint |
| **Frecuencia** | Anual, trimestral, mensual | ⚠️ Solo anual (reportingYear) |

---

## 2. Módulos Sygris vs Implementación Actual

### 01. Alta y Hosting
- **Sygris**: Hosting AWS, usuarios, roles, carga históricos
- **NFQ**: App local/Vite, usuarios mock, datos en contexto

### 02. Módulo de Autogestión
- **Sygris**: Configuración permisos, alcance, networks, frecuencia. Unidades de medida. Árboles de agregación.
- **NFQ**: Materialidad (topics, disclosure depth), DataView (función, sección), templates por función

### 03. Automatización del Reporte
- **Sygris**: Control de tareas, asignaciones automáticas, cuestionarios, avisos por email
- **NFQ**: WorkflowStatusBoard (Draft/Review/Approved), ReportingCycleBanner (plazo cierre), My Tasks en Dashboard

### 04. Imputación de Datos
- **Sygris**: Pantallas manuales, plantillas Excel masivas, comentarios, evidencias, alarmas variación, histórico, one source of truth
- **NFQ**: DataHub (hub unificado) → Indicadores ESG, Huella Carbono, Cuestionarios, Carga masiva. DataInput, BulkImportModal, CarbonFootprintModule, DataRequestQuestionnaire, AnnualReportLoader

### 05. Validación de Datos
- **Sygris**: Validar/rechazar, conversaciones, reapertura de cuestionarios
- **NFQ**: Workflow Draft→Review→Approved, comentarios, botones Submit/Reject/Approve

### 06. Panel de Seguimiento
- **Sygris**: Info en tiempo real (reportado/validado/pendiente), acciones email, export Excel
- **NFQ**: Dashboard (KPIs, ReadinessScoring, GapAnalysis, ESRSCoverageHeatmap, RecentActivityLog, WorkflowStatusBoard)

### 07. Explotación
- **Sygris**: Tablas maestras, gráficos, 3 pantallas de explotación
- **NFQ**: DataConsolidator (gráficos pastel/barras), NarrativeEngine, FinalReport

### 08. Informe Resultados Globales
- **Sygris**: Repositorio INF, tablas personalizadas, memoria .xls/.csv
- **NFQ**: FinalReport, reportGeneratorService, export configurable

### 09. Acceso Auditorías
- **Sygris**: Usuarios tipo auditor, conversaciones, evidencias, no conformidades
- **NFQ**: Role.VIEWER (Auditor), evidencias por datapoint, trazabilidad en DataConsolidator

### 10. Huella de Carbono
- **Sygris**: Factores emisión, alcances 1/2/3, DEFRA, auditoría
- **NFQ**: CarbonFootprintModule (dentro de DataHub), datapoints E1-6-01/02/03 para Scope 1/2/3

### 11. Report Builder
- **Sygris**: Índice jerárquico, vinculación datos/tablas/imágenes, xHTML, Word
- **NFQ**: IndexComposer, FinalReport, FinalReportGuided

---

## 3. Fases del Proyecto (Grupo LAR)

| Fase | Sygris/Nfq | NFQ ESG Suite |
|------|------------|---------------|
| **01. Análisis y definición** | Materialidad, roles, data readiness, internal audit | MaterialityAssessment, MaterialityContext, GapAnalysis |
| **02. Implantación** | Data collection, plantillas, validación, UATs | DataView, BulkImport, DataConsolidator, workflow |
| **03. Proyección estratégica** | Informe recomendaciones | (Fuera de scope herramienta) |
| **04. Escalabilidad** | Mantenimiento, interoperabilidad | (Futuro) |

---

## 4. Principios Clave (doc. Grupo LAR)

1. **Responsables del dato** → `ownerId`, `department`, `responsibleUserId` en fuentes
2. **One source of truth** → Un dato, metadatos, usuario, flujo aprobación
3. **Trazabilidad** → lastModified, evidencias, comentarios, metadata consolidación
4. **Control de calidad** → Comentarios, evidencias, alarmas variación entre periodos
5. **Transición Ley 11/2018 → CSRD** → ESRS, materialidad doble, disclosure depth

---

## 5. Mejoras Prioritarias (alineadas con Sygris)

| Mejora | Origen doc. | Esfuerzo |
|--------|-------------|----------|
| Cuestionarios / envío a responsables | Módulo 03, 04 | Alto |
| Avisos por email (recordatorios) | Módulo 03 | Medio |
| Frecuencia (trimestral/mensual) | Alcance | Medio |
| Huella carbono (factores emisión, alcances) | Módulo 10 | Alto |
| Export memoria .xls/.csv completo | Módulo 08 | Bajo |
| Usuarios tipo auditor con interfaz específica | Módulo 09 | Medio |
| Alarmas variación entre periodos | Módulo 04 | Bajo |

---

## 6. Glosario Alineado

| Término Sygris | Equivalente NFQ |
|----------------|-----------------|
| Indicador | Datapoint |
| Alcance | StandardSection + Datapoints |
| Network | ConsolidationSource (geografía, instalación, etc.) |
| Cuestionario | (Por implementar) |
| Panel de seguimiento | Dashboard |
| Imputación | DataInput, BulkImport |
| Validación | Workflow Review → Approve |
| Explotación | DataConsolidator, NarrativeEngine |
| Report Builder | FinalReport, IndexComposer |

---

*Referencia: Grupo LAR - Implantación Sygris Reporting.pdf (Nfq Advisory Services, 04 Marzo 2024)*
