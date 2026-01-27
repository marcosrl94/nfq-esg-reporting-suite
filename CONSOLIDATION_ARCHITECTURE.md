# Arquitectura de Consolidación Gobernada - NFQ ESG Reporting Suite

## 1. Análisis de Arquitectura Actual

### Estado Actual del Módulo de Consolidación

#### ✅ Componentes Existentes
- **Tipos Base**: `ConsolidationSource`, `ConsolidatedDatapoint`, `ConsolidationConfig`
- **Servicio de Consolidación**: `consolidationService.ts` con métodos básicos
- **UI de Consolidación**: `DataConsolidator.tsx` con gestión de fuentes
- **Gestión de Evidencias por Fuente**: `SourceEvidenceManager.tsx`
- **Base de Datos**: Schema SQL con soporte para `consolidation_sources` (JSONB)

#### ⚠️ Limitaciones Identificadas
1. **Falta de jerarquía multi-nivel**: Solo soporta un nivel de consolidación
2. **Sin gestión de perímetros**: No hay concepto de perímetro consolidado vs perímetro fuente
3. **Trazabilidad limitada**: No hay versionado ni historial de consolidaciones
4. **Validaciones básicas**: Faltan reglas de negocio complejas
5. **Sin gestión de unidades**: No hay conversión automática de unidades
6. **Workflow simplificado**: No hay estados intermedios de revisión central

---

## 2. Modelo de Datos Extendido

### 2.1 Entidades Principales

```typescript
// ============================================
// JERARQUÍA Y PERÍMETRO
// ============================================

export interface OrganizationalHierarchy {
  id: string;
  code: string; // e.g., "EU-ES", "NA-US-CA", "APAC-SG"
  name: string; // e.g., "España", "California", "Singapur"
  level: 'region' | 'country' | 'state' | 'city' | 'business_unit' | 'subsidiary' | 'facility';
  parentId?: string; // Para jerarquías multi-nivel
  metadata: {
    countryCode?: string; // ISO 3166-1 alpha-2
    region?: string;
    timezone?: string;
    currency?: string;
  };
}

export interface ConsolidationPerimeter {
  id: string;
  datapointId: string;
  name: string; // e.g., "Group Consolidated", "EU Only", "Manufacturing Division"
  scope: {
    type: 'all' | 'hierarchy' | 'custom';
    hierarchyIds?: string[]; // IDs de OrganizationalHierarchy
    customSourceIds?: string[]; // IDs específicos de ConsolidationSource
  };
  effectiveFrom: string; // ISO date
  effectiveTo?: string; // ISO date (null = vigente)
  isActive: boolean;
}

// ============================================
// MÉTRICA Y UNIDADES
// ============================================

export interface MetricDefinition {
  id: string;
  code: string; // e.g., "E1-6-01"
  name: string;
  description: string;
  type: 'quantitative' | 'qualitative';
  baseUnit: string; // Unidad base (e.g., "tCO2e", "MWh")
  allowedUnits: UnitConversion[]; // Conversiones permitidas
  validationRules: ValidationRule[];
}

export interface UnitConversion {
  unit: string; // e.g., "kgCO2e", "GWh"
  conversionFactor: number; // Factor de conversión a unidad base
  isStandard: boolean; // Si es unidad estándar del estándar
}

export interface ValidationRule {
  id: string;
  type: 'range' | 'format' | 'consistency' | 'evidence_required' | 'custom';
  config: Record<string, any>; // Configuración específica de la regla
  errorMessage: string;
  warningMessage?: string;
}

// ============================================
// FUENTE DE CONSOLIDACIÓN MEJORADA
// ============================================

export interface ConsolidationSource {
  id: string;
  datapointId: string;
  name: string;
  type: 'geography' | 'business_unit' | 'subsidiary' | 'facility';
  
  // Jerarquía organizacional
  hierarchyId?: string; // Referencia a OrganizationalHierarchy
  hierarchyPath?: string[]; // Path completo: ["EU", "ES", "Madrid"]
  
  // Responsabilidad
  responsibleUserId: string;
  responsibleUserName: string;
  responsibleDepartment: string;
  
  // Valores por período
  values: Record<string, SourceValue>; // Year -> SourceValue
  
  // Evidencias asociadas
  evidenceIds: string[];
  evidenceSummary?: {
    totalFiles: number;
    verifiedFiles: number;
    lastVerified?: string;
    averageConfidence?: number;
  };
  
  // Metadatos
  lastUpdated: string;
  lastUpdatedBy: string;
  status: WorkflowStatus;
  
  // Trazabilidad
  version: number; // Versión del source
  parentVersionId?: string; // Si es corrección de versión anterior
  changeReason?: string; // Razón del cambio
}

export interface SourceValue {
  value: string | number | null;
  unit?: string; // Unidad reportada (puede diferir de unidad base)
  convertedValue?: number; // Valor convertido a unidad base
  period: {
    start: string; // ISO date
    end: string; // ISO date
    type: 'annual' | 'quarterly' | 'monthly' | 'custom';
  };
  metadata: {
    reportingMethod?: string; // e.g., "location-based", "market-based"
    dataSource?: string; // e.g., "ERP", "Manual", "External Report"
    qualityScore?: number; // 0-100
    lastValidated?: string;
    validatedBy?: string;
  };
}

// ============================================
// CONSOLIDACIÓN CON TRAZABILIDAD
// ============================================

export interface ConsolidatedDatapoint extends Datapoint {
  consolidationEnabled: boolean;
  
  // Configuración de consolidación
  consolidationConfig: ConsolidationConfig;
  
  // Fuentes de consolidación
  sources: ConsolidationSource[];
  
  // Perímetros de consolidación
  perimeters: ConsolidationPerimeter[];
  activePerimeterId?: string; // Perímetro activo actual
  
  // Valores consolidados
  consolidatedValues: Record<string, ConsolidatedValue>; // Year -> ConsolidatedValue
  
  // Desgloses
  breakdowns: ConsolidationBreakdown[];
  
  // Trazabilidad
  consolidationHistory: ConsolidationRecord[];
  lastConsolidated?: string;
  lastConsolidatedBy?: string;
  consolidationVersion: number;
}

export interface ConsolidatedValue {
  value: string | number | null;
  unit: string; // Siempre en unidad base
  method: 'sum' | 'average' | 'weighted_average' | 'max' | 'min' | 'custom';
  sourcesCount: number; // Número de fuentes incluidas
  coveragePercentage: number; // % de cobertura del perímetro
  calculationDetails: {
    includedSourceIds: string[];
    excludedSourceIds: string[];
    exclusionReasons?: Record<string, string>; // sourceId -> reason
    unitConversions?: Record<string, UnitConversionApplied>; // sourceId -> conversion
  };
  metadata: {
    calculatedAt: string;
    calculatedBy: string;
    calculationId: string; // ID único de esta consolidación
    qualityScore?: number; // Score basado en calidad de fuentes
  };
}

export interface UnitConversionApplied {
  fromUnit: string;
  toUnit: string;
  originalValue: number;
  convertedValue: number;
  conversionFactor: number;
}

export interface ConsolidationRecord {
  id: string;
  consolidationId: string; // ID único de esta ejecución
  datapointId: string;
  perimeterId?: string;
  version: number;
  timestamp: string;
  performedBy: string;
  method: string;
  inputSources: string[]; // Source IDs
  result: ConsolidatedValue;
  validationResults: ValidationResult[];
  status: 'draft' | 'validated' | 'approved' | 'rejected';
  notes?: string;
}

export interface ValidationResult {
  ruleId: string;
  ruleType: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
  details?: Record<string, any>;
}

// ============================================
// WORKFLOW DE CONSOLIDACIÓN
// ============================================

export enum ConsolidationWorkflowStage {
  SOURCE_INPUT = 'source_input', // Responsables regionales ingresan datos
  SOURCE_VALIDATION = 'source_validation', // Validación automática de fuentes
  CENTRAL_REVIEW = 'central_review', // Revisión por equipo central
  CONSOLIDATION_PENDING = 'consolidation_pending', // Listo para consolidar
  CONSOLIDATED = 'consolidated', // Consolidado calculado
  VALIDATED = 'validated', // Consolidado validado
  APPROVED = 'approved', // Consolidado aprobado para reporting
  LOCKED = 'locked' // Bloqueado para reporting
}

export interface ConsolidationWorkflow {
  id: string;
  datapointId: string;
  currentStage: ConsolidationWorkflowStage;
  stages: WorkflowStageRecord[];
  blockers: WorkflowBlocker[];
  nextActions: WorkflowAction[];
}

export interface WorkflowStageRecord {
  stage: ConsolidationWorkflowStage;
  enteredAt: string;
  enteredBy: string;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

export interface WorkflowBlocker {
  id: string;
  type: 'missing_data' | 'validation_error' | 'missing_evidence' | 'manual_review_required';
  severity: 'error' | 'warning';
  sourceId?: string;
  message: string;
  resolution?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface WorkflowAction {
  id: string;
  type: 'validate' | 'review' | 'approve' | 'reject' | 'request_changes';
  label: string;
  requiredRole: Role[];
  targetStage: ConsolidationWorkflowStage;
}

---

## 3. Arquitectura Funcional y Lógica

### 3.1 Flujo de Consolidación Paso a Paso

```
┌─────────────────────────────────────────────────────────────┐
│ FASE 1: INPUT DESCENTRALIZADO                              │
└─────────────────────────────────────────────────────────────┘
│
│ 1.1 Responsable Regional/Segmento ingresa métrica
│     ├─ Selecciona datapoint (ej: "E1-6-01")
│     ├─ Asigna jerarquía (ej: "España" → hierarchyId)
│     ├─ Ingresa valor + unidad + período
│     └─ Sube evidencias asociadas
│
│ 1.2 Validación Automática Inmediata
│     ├─ Validación de formato (tipo, unidad, rango)
│     ├─ Validación de consistencia (vs años anteriores)
│     ├─ Validación de evidencias (completitud, vigencia)
│     └─ Score de calidad calculado
│
│ 1.3 Estado: SOURCE_INPUT → SOURCE_VALIDATION
│
┌─────────────────────────────────────────────────────────────┐
│ FASE 2: VALIDACIÓN Y REVISIÓN CENTRAL                      │
└─────────────────────────────────────────────────────────────┘
│
│ 2.1 Dashboard Central muestra:
│     ├─ Fuentes pendientes de revisión
│     ├─ Alertas de validación (errores/warnings)
│     ├─ Fuentes con evidencias faltantes
│     └─ Score de calidad por fuente
│
│ 2.2 Revisor Central puede:
│     ├─ Aprobar fuente individual
│     ├─ Solicitar cambios a responsable
│     ├─ Rechazar fuente con motivo
│     └─ Marcar para consolidación
│
│ 2.3 Estado: SOURCE_VALIDATION → CENTRAL_REVIEW → CONSOLIDATION_PENDING
│
┌─────────────────────────────────────────────────────────────┐
│ FASE 3: CONSOLIDACIÓN AUTOMÁTICA                           │
└─────────────────────────────────────────────────────────────┘
│
│ 3.1 Sistema detecta que todas las fuentes están aprobadas
│
│ 3.2 Ejecuta Consolidación:
│     ├─ Selecciona perímetro activo
│     ├─ Filtra fuentes según perímetro
│     ├─ Convierte unidades a unidad base
│     ├─ Aplica método de consolidación
│     ├─ Calcula desgloses por dimensión
│     ├─ Valida resultado (reglas de negocio)
│     └─ Genera registro de consolidación
│
│ 3.3 Estado: CONSOLIDATION_PENDING → CONSOLIDATED
│
┌─────────────────────────────────────────────────────────────┐
│ FASE 4: VALIDACIÓN Y APROBACIÓN                            │
└─────────────────────────────────────────────────────────────┘
│
│ 4.1 Revisor Central valida consolidado:
│     ├─ Revisa cálculo y desgloses
│     ├─ Verifica trazabilidad completa
│     ├─ Valida backing de evidencias
│     └─ Aproba o solicita cambios
│
│ 4.2 Estado: CONSOLIDATED → VALIDATED → APPROVED → LOCKED
│
┌─────────────────────────────────────────────────────────────┐
│ FASE 5: REPORTING Y AUDITORÍA                              │
└─────────────────────────────────────────────────────────────┘
│
│ 5.1 Consolidado aprobado disponible para:
│     ├─ Reportes CSRD
│     ├─ Taxonomía UE
│     ├─ Net Zero
│     └─ Auditorías externas
│
│ 5.2 Trazabilidad completa:
│     ├─ Quién reportó cada fuente
│     ├─ Quién validó y aprobó
│     ├─ Qué evidencias respaldan cada valor
│     └─ Historial de versiones
│
```

### 3.2 Reglas de Consolidación

#### 3.2.1 Roll-up por Jerarquía

```typescript
// Ejemplo: Consolidar de Facility → Subsidiary → Country → Region → Group
const hierarchyRollup = {
  level1: 'facility',      // Instalaciones individuales
  level2: 'subsidiary',    // Subsidiarias (suma de facilities)
  level3: 'country',       // Países (suma de subsidiaries)
  level4: 'region',        // Regiones (suma de countries)
  level5: 'group'          // Grupo consolidado (suma de regions)
};
```

#### 3.2.2 Gestión de Unidades y Conversiones

```typescript
// Conversión automática a unidad base
const unitConversions = {
  'E1-6-01': { // Scope 1 GHG emissions
    baseUnit: 'tCO2e',
    allowedUnits: [
      { unit: 'kgCO2e', factor: 0.001 },
      { unit: 'MtCO2e', factor: 1000 },
      { unit: 'GgCO2e', factor: 1 } // Gigagram = tonelada métrica
    ]
  },
  'E1-6-02': { // Scope 2 GHG emissions (Location-based)
    baseUnit: 'MWh',
    allowedUnits: [
      { unit: 'kWh', factor: 0.001 },
      { unit: 'GWh', factor: 1000 },
      { unit: 'TJ', factor: 3.6 } // Terajoule conversion
    ]
  }
};
```

#### 3.2.3 Resolución de Duplicidades

```typescript
// Estrategias de deduplicación
const deduplicationStrategies = {
  // Por jerarquía: Si Facility está en Subsidiary, no duplicar
  hierarchy_based: {
    rule: 'exclude_child_if_parent_included',
    apply: true
  },
  // Por período: Si hay solapamiento temporal, usar regla de prioridad
  temporal_overlap: {
    rule: 'use_most_recent' | 'use_most_specific' | 'manual_resolution',
    apply: true
  },
  // Por fuente de datos: Priorizar fuentes de mayor calidad
  data_quality: {
    rule: 'prefer_higher_quality_score',
    minQualityScore: 70
  }
};
```

### 3.3 Validaciones Automáticas y Checks de Calidad

#### 3.3.1 Validaciones de Fuente Individual

```typescript
const sourceValidations = [
  {
    id: 'required_fields',
    type: 'format',
    check: (source) => {
      return source.name && source.responsibleUserId && source.values;
    },
    errorMessage: 'Campos requeridos faltantes'
  },
  {
    id: 'value_range',
    type: 'range',
    check: (source, datapoint) => {
      const value = source.values[year];
      if (datapoint.type === 'quantitative') {
        const num = Number(value);
        // Ejemplo: Emisiones no pueden ser negativas
        if (datapoint.code.startsWith('E1-6') && num < 0) {
          return { passed: false, message: 'Las emisiones no pueden ser negativas' };
        }
      }
      return { passed: true };
    }
  },
  {
    id: 'evidence_completeness',
    type: 'evidence_required',
    check: (source, datapoint) => {
      const requiredEvidenceTypes = datapoint.requiredEvidenceTypes || [];
      const providedTypes = source.evidenceIds.map(id => getEvidenceType(id));
      const missing = requiredEvidenceTypes.filter(t => !providedTypes.includes(t));
      return {
        passed: missing.length === 0,
        message: missing.length > 0 ? `Evidencias faltantes: ${missing.join(', ')}` : undefined
      };
    }
  },
  {
    id: 'temporal_consistency',
    type: 'consistency',
    check: (source, datapoint) => {
      // Comparar con años anteriores (variación razonable)
      const currentValue = source.values[year];
      const previousValue = source.values[year - 1];
      if (currentValue && previousValue) {
        const change = Math.abs((currentValue - previousValue) / previousValue) * 100;
        if (change > 50) { // Más del 50% de cambio
          return {
            passed: false,
            severity: 'warning',
            message: `Variación significativa respecto al año anterior: ${change.toFixed(1)}%`
          };
        }
      }
      return { passed: true };
    }
  }
];
```

#### 3.3.2 Validaciones de Consolidación

```typescript
const consolidationValidations = [
  {
    id: 'coverage_threshold',
    type: 'consistency',
    check: (consolidated, perimeter) => {
      const expectedSources = perimeter.scope.customSourceIds?.length || 0;
      const includedSources = consolidated.calculationDetails.includedSourceIds.length;
      const coverage = (includedSources / expectedSources) * 100;
      return {
        passed: coverage >= 80, // Mínimo 80% de cobertura
        message: coverage < 80 ? `Cobertura insuficiente: ${coverage.toFixed(1)}%` : undefined
      };
    }
  },
  {
    id: 'unit_consistency',
    type: 'consistency',
    check: (consolidated) => {
      // Verificar que todas las conversiones fueron exitosas
      const failedConversions = Object.values(consolidated.calculationDetails.unitConversions || {})
        .filter(c => !c.convertedValue || isNaN(c.convertedValue));
      return {
        passed: failedConversions.length === 0,
        message: failedConversions.length > 0 
          ? `${failedConversions.length} conversiones de unidad fallaron` 
          : undefined
      };
    }
  },
  {
    id: 'evidence_backing',
    type: 'evidence_required',
    check: (consolidated, sources) => {
      // Verificar que todas las fuentes incluidas tienen evidencias
      const sourcesWithoutEvidence = consolidated.calculationDetails.includedSourceIds
        .filter(id => {
          const source = sources.find(s => s.id === id);
          return !source || !source.evidenceIds || source.evidenceIds.length === 0;
        });
      return {
        passed: sourcesWithoutEvidence.length === 0,
        message: sourcesWithoutEvidence.length > 0
          ? `${sourcesWithoutEvidence.length} fuentes sin evidencias` 
          : undefined
      };
    }
  }
];
```

---

## 4. Esquema de Entidades y Relaciones

### 4.1 Diagrama de Entidades

```
┌─────────────────────┐
│  MetricDefinition   │
│  - id               │
│  - code             │
│  - baseUnit         │
│  - allowedUnits[]   │
│  - validationRules[]│
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼──────────┐         ┌──────────────────────┐
│    Datapoint        │────────▶│ OrganizationalHierarchy│
│  - id               │         │  - id                │
│  - code             │         │  - code              │
│  - metricDefId      │         │  - level             │
│  - consolidationEnabled│       │  - parentId          │
└──────────┬──────────┘         └──────────────────────┘
           │
           │ 1:N
           │
┌──────────▼──────────┐
│ ConsolidationSource │
│  - id               │
│  - datapointId      │
│  - hierarchyId      │────────┐
│  - values{}         │        │
│  - evidenceIds[]   │        │
│  - version          │        │
└──────────┬──────────┘        │
           │                    │
           │ N:1                │
           │                    │
┌──────────▼──────────┐         │
│ ConsolidatedDatapoint│        │
│  - sources[]        │────────┘
│  - perimeters[]     │
│  - consolidatedValues{}│
│  - consolidationHistory[]│
└─────────────────────┘

┌─────────────────────┐
│ ConsolidationRecord │
│  - id               │
│  - consolidationId  │
│  - datapointId      │
│  - inputSources[]   │
│  - result           │
│  - validationResults[]│
└─────────────────────┘

┌─────────────────────┐
│  EvidenceFile       │
│  - id               │
│  - datapointId      │
│  - sourceId         │
│  - hierarchy{}      │
│  - extractedData{}  │
└─────────────────────┘
```

### 4.2 Relaciones Clave

1. **Datapoint → ConsolidationSource**: 1:N (un datapoint puede tener múltiples fuentes)
2. **ConsolidationSource → OrganizationalHierarchy**: N:1 (cada fuente pertenece a una jerarquía)
3. **ConsolidationSource → EvidenceFile**: 1:N (cada fuente puede tener múltiples evidencias)
4. **ConsolidatedDatapoint → ConsolidationRecord**: 1:N (historial de consolidaciones)
5. **ConsolidationPerimeter → ConsolidationSource**: N:M (un perímetro puede incluir múltiples fuentes)

---

## 5. MVP vs Versión Avanzada

### 5.1 MVP (Fase 1 - Implementación Inmediata)

#### Alcance MVP
- ✅ Consolidación básica por región/segmento (ya implementado)
- ✅ Gestión de evidencias por fuente (ya implementado)
- ✅ Validaciones básicas de formato y consistencia
- ✅ Workflow simplificado: Input → Validación → Consolidación → Aprobación
- ✅ Trazabilidad básica: quién reportó, quién aprobó

#### Limitaciones MVP
- ⚠️ Un solo nivel de consolidación (no multi-nivel)
- ⚠️ Sin gestión de perímetros dinámicos
- ⚠️ Conversión de unidades manual (no automática)
- ⚠️ Sin versionado de consolidaciones
- ⚠️ Validaciones básicas (sin reglas complejas)

### 5.2 Versión Avanzada (Fase 2 - Roadmap)

#### Extensiones Propuestas

1. **Jerarquías Multi-Nivel**
   - Roll-up automático: Facility → Subsidiary → Country → Region → Group
   - Consolidación recursiva por niveles
   - Visualización de jerarquía completa

2. **Gestión de Perímetros Dinámicos**
   - Definición de perímetros por métrica
   - Cambios de perímetro con versionado
   - Múltiples perímetros simultáneos (ej: "EU Only", "Manufacturing Only")

3. **Conversión Automática de Unidades**
   - Catálogo de unidades por métrica
   - Conversión automática a unidad base
   - Validación de conversiones

4. **Versionado y Historial**
   - Historial completo de consolidaciones
   - Comparación de versiones
   - Rollback a versiones anteriores

5. **Validaciones Avanzadas**
   - Reglas de negocio configurables
   - Validaciones cruzadas entre métricas
   - Alertas proactivas de inconsistencias

6. **Workflow Avanzado**
   - Estados intermedios de revisión
   - Aprobaciones multi-nivel
   - Notificaciones automáticas

---

## 6. Propuesta de Implementación Incremental

### Fase 1: Extensión del Modelo de Datos (Semana 1-2)

1. **Extender `types.ts`** con nuevos tipos:
   - `OrganizationalHierarchy`
   - `ConsolidationPerimeter`
   - `SourceValue` (extendido)
   - `ConsolidatedValue` (extendido)
   - `ConsolidationRecord`

2. **Actualizar `database/schema.sql`**:
   - Tabla `organizational_hierarchy`
   - Tabla `consolidation_perimeters`
   - Tabla `consolidation_records`
   - Campos adicionales en `datapoints` (JSONB)

### Fase 2: Servicios de Consolidación Avanzados (Semana 3-4)

1. **Nuevo servicio**: `consolidationWorkflowService.ts`
   - Gestión de estados del workflow
   - Detección de blockers
   - Transiciones de estado

2. **Extender**: `consolidationService.ts`
   - Conversión automática de unidades
   - Roll-up multi-nivel
   - Resolución de duplicidades
   - Validaciones avanzadas

3. **Nuevo servicio**: `unitConversionService.ts`
   - Catálogo de unidades
   - Conversión automática
   - Validación de conversiones

### Fase 3: UI de Workflow (Semana 5-6)

1. **Nuevo componente**: `ConsolidationWorkflowView.tsx`
   - Visualización de estados
   - Gestión de blockers
   - Acciones disponibles

2. **Extender**: `DataConsolidator.tsx`
   - Gestión de perímetros
   - Historial de consolidaciones
   - Comparación de versiones

3. **Nuevo componente**: `HierarchyManager.tsx`
   - Gestión de jerarquías organizacionales
   - Visualización de árbol jerárquico

### Fase 4: Validaciones y Calidad (Semana 7-8)

1. **Nuevo servicio**: `validationService.ts`
   - Motor de reglas de validación
   - Validaciones configurables
   - Scoring de calidad

2. **Extender**: UI para mostrar validaciones
   - Dashboard de calidad
   - Alertas proactivas
   - Reportes de validación

---

## 7. Recomendaciones de Diseño

### 7.1 Escalabilidad Regulatoria

- **Abstracción de Estándares**: El modelo debe ser independiente del estándar (ESRS, GRI, etc.)
- **Mapeo Flexible**: Permitir mapeo de métricas entre estándares
- **Configuración por Regulación**: Reglas de validación configurables por jurisdicción

### 7.2 Auditoría

- **Audit Trail Completo**: Todo cambio debe quedar registrado
- **Inmutabilidad de Aprobados**: Una vez aprobado, solo se puede crear nueva versión
- **Evidencias Inmutables**: Las evidencias no se pueden modificar, solo agregar nuevas
- **Reportes de Auditoría**: Generación automática de reportes de trazabilidad

### 7.3 Performance

- **Cálculo Incremental**: Solo recalcular cuando cambian fuentes relevantes
- **Cache de Consolidaciones**: Cachear resultados hasta que cambien inputs
- **Indexación**: Índices en campos de búsqueda frecuente (hierarchyId, status, etc.)

---

## 8. Próximos Pasos

1. ✅ **Revisar y aprobar arquitectura propuesta**
2. ⏳ **Implementar Fase 1 (Modelo de Datos)**
3. ⏳ **Implementar Fase 2 (Servicios)**
4. ⏳ **Implementar Fase 3 (UI)**
5. ⏳ **Implementar Fase 4 (Validaciones)**

---

**Documento creado**: 2024
**Versión**: 1.0
**Estado**: Propuesta de Arquitectura
