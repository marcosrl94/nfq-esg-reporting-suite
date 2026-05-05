# Mejoras de Consolidación ESG (Workiva, Enablon, Sygris)

Este documento describe las mejoras implementadas siguiendo las mejores prácticas de herramientas líderes en reportes ESG.

## Resumen de Mejoras

### 1. **Consolidación Bottom-Up de Ficheros** (Workiva / Enablon)

**Problema:** La importación masiva original trataba cada fila como datos directos para datapoints, sin soportar múltiples fuentes por indicador.

**Solución:**
- **Modo consolidación** en Bulk Import: una fila = una fuente (instalación, subsidiaria, geografía)
- Columna obligatoria `Fuente` que identifica el origen de los datos
- Al importar, se crean/actualizan automáticamente las `ConsolidationSource` y se habilita la consolidación
- Template específico `esg-consolidacion-bottom-up-YYYY.csv` con estructura:
  - `Fuente`, `Tipo`, `E1-6-01`, `E1-6-02`, ... (métricas por columna)

**Uso:** Activar "Modo consolidación bottom-up" en el modal de Bulk Import antes de subir el fichero.

---

### 2. **Servicio de Jerarquía Organizacional** (`services/hierarchyService.ts`)

Inspirado en Enablon (datos a nivel activo) y Sygris (agregación multi-nivel):

- `inferSourceType(sourceName)`: infiere tipo (facility, subsidiary, geography) desde el nombre
- `createSourceFromImport()`: crea ConsolidationSource desde datos de importación
- `groupSourcesByHierarchy()`: agrupa fuentes por jerarquía para roll-up
- `buildHierarchyTree()`: construye árbol para visualización (futuro uso en UI)

**Tipos inferidos:**
- "Planta X", "Fábrica", "Instalación" → `facility`
- "Subsidiaria", "Filial" → `subsidiary`
- "División", "Unidad" → `business_unit`
- "España", "Francia", países → `geography`

---

### 3. **Trazabilidad de Consolidación** (Sygris / Enablon)

En `DataConsolidator`:
- Sección expandible **"Trazabilidad del cálculo"** que muestra:
  - Fuentes incluidas en el valor consolidado
  - Fuentes excluidas y motivo (valor no numérico, etc.)
- Información de auditoría compatible con CSRD y requisitos de aseguramiento

---

### 4. **Collect Once, Report Multiple**

La arquitectura existente ya soporta:
- `mappings` en datapoints para GRI, SASB, TCFD
- `reportConfigurationService` con múltiples estándares
- Un datapoint puede alimentar varios reportes/ frameworks

---

## Flujo Recomendado (Bottom-Up)

1. **Definir jerarquía** (opcional): futura UI de jerarquía organizacional
2. **Preparar datos**: cada fila = una fuente, columnas = métricas
3. **Descargar template** de consolidación desde Bulk Import (modo activo)
4. **Rellenar** con datos por instalación/subsidiaria
5. **Importar** con modo consolidación activado
6. **Revisar** en pestaña Consolidación: valor consolidado, desglose, trazabilidad
7. **Exportar** a reportes ESRS, GRI, etc.

---

## Formatos de Importación Soportados

| Modo | Estructura | Uso |
|------|------------|-----|
| Estándar | Una fila por datapoint | Datos directos, sin consolidación |
| Consolidación | Una fila por fuente, columna `Fuente` | Bottom-up, múltiples instalaciones/subsidiarias |

---

---

## 5. Mejoras adicionales (Sygris / Workiva) - 2025

### Gap Analysis (Workiva)
- Componente `GapAnalysis` en Dashboard
- Compara topics materiales (de Materialidad) vs cobertura de datos por sección ESRS
- Identifica gaps (cobertura <50%), parcial (50-79%), OK (80%+)
- Botón "Cerrar gaps en Data" para navegar a la vista de carga

### ESRS Coverage Heatmap (Sygris)
- Mapa de calor de cobertura por sección E1-E5, S1-S4, G1
- Colores: verde (80%+), amarillo (50-79%), rojo (<50%)
- Respeta materialidad: solo secciones materiales cuando hay evaluación

### Reporting Cycle Banner (Sygris campaigns)
- Banner con ciclo de reporte y plazo de cierre de datos
- Indicador de días restantes (amarillo si <7 días, rojo si vencido)
- Estilo "campañas de recogida de datos"

### Recent Activity Log (Sygris/Workiva audit trail)
- Trazabilidad de cambios recientes en datapoints
- Ordenado por lastModified para auditoría
- Iconos por tipo: modificado, en revisión, aprobado

---

## Referencias

- [Workiva ESG Data Consolidation](https://marketplace.workiva.com/en-us/services/consolidate-esg-data-reporting)
- [Workiva CSRD Reporting](https://www.workiva.com/uk/solutions/csrd-reporting)
- [Enablon ESG Best Practices](https://wolterskluwer.com/en/expert-insights/enablon-esg-best-practice-templates)
- [Sygris Data Integration](https://sygris.com/en/2024/06/27/data-integration-consolidated-management-report/)
- [Sygris ESG Reporting](https://sygris.com/en/sygris-reporting/)
