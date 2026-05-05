# Ejemplos de Implementación - Arquitectura Empresarial

Este documento contiene ejemplos de código concretos para implementar las características clave de la arquitectura empresarial.

---

## 1. Backend API - Estructura Base

### 1.1 Estructura de Proyecto

```
backend/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── datapoints.ts
│   │   │   ├── evidence.ts
│   │   │   ├── consolidation.ts
│   │   │   └── dashboard.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── authorization.ts
│   │   │   └── audit.ts
│   │   └── validators/
│   │       └── datapoint.ts
│   ├── services/
│   │   ├── datapointService.ts
│   │   ├── consolidationService.ts
│   │   ├── evidenceService.ts
│   │   ├── auditService.ts
│   │   └── aiService.ts
│   ├── models/
│   │   ├── Datapoint.ts
│   │   ├── Organization.ts
│   │   └── User.ts
│   ├── repositories/
│   │   ├── datapointRepository.ts
│   │   └── auditRepository.ts
│   └── utils/
│       ├── permissions.ts
│       └── validation.ts
├── database/
│   ├── migrations/
│   └── seeds/
└── tests/
```

### 1.2 Ejemplo: Endpoint de Datapoints con RBAC

```typescript
// src/api/routes/datapoints.ts
import express from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorization';
import { auditMiddleware } from '../middleware/audit';
import { datapointService } from '../../services/datapointService';
import { datapointValidator } from '../validators/datapoint';

const router = express.Router();

// GET /api/datapoints - Listar datapoints
router.get(
  '/',
  authenticate,
  authorize('datapoint', 'read'),
  async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { cycleId, status, department, standardCode } = req.query;
      
      const datapoints = await datapointService.list({
        organizationId,
        cycleId: cycleId as string,
        status: status as string,
        department: department as string,
        standardCode: standardCode as string,
        userId: req.user.id // Para filtrado por permisos
      });
      
      res.json(datapoints);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/datapoints/:id - Obtener datapoint específico
router.get(
  '/:id',
  authenticate,
  authorize('datapoint', 'read'),
  async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { id } = req.params;
      
      const datapoint = await datapointService.getById(
        organizationId,
        id,
        req.user.id
      );
      
      if (!datapoint) {
        return res.status(404).json({ error: 'Datapoint not found' });
      }
      
      res.json(datapoint);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// POST /api/datapoints - Crear datapoint
router.post(
  '/',
  authenticate,
  authorize('datapoint', 'create'),
  datapointValidator.create,
  auditMiddleware('datapoint', 'created'),
  async (req, res) => {
    try {
      const { organizationId } = req.user;
      const datapointData = req.body;
      
      // Validar que el usuario puede crear en este departamento
      if (datapointData.department !== req.user.department && 
          req.user.role !== 'Sustainability Lead') {
        return res.status(403).json({ 
          error: 'Cannot create datapoint in this department' 
        });
      }
      
      const datapoint = await datapointService.create({
        ...datapointData,
        organizationId,
        ownerId: req.user.id
      });
      
      res.status(201).json(datapoint);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// PATCH /api/datapoints/:id - Actualizar datapoint
router.patch(
  '/:id',
  authenticate,
  authorize('datapoint', 'update'),
  datapointValidator.update,
  auditMiddleware('datapoint', 'updated'),
  async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { id } = req.params;
      const updates = req.body;
      
      // Obtener estado anterior para auditoría
      const beforeState = await datapointService.getById(
        organizationId,
        id,
        req.user.id
      );
      
      const datapoint = await datapointService.update(
        organizationId,
        id,
        updates,
        req.user.id
      );
      
      // El middleware de auditoría capturará el afterState
      req.auditContext = {
        beforeState,
        afterState: datapoint,
        changes: calculateChanges(beforeState, datapoint)
      };
      
      res.json(datapoint);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// POST /api/datapoints/:id/approve - Aprobar datapoint
router.post(
  '/:id/approve',
  authenticate,
  authorize('datapoint', 'approve'),
  auditMiddleware('datapoint', 'approved'),
  async (req, res) => {
    try {
      const { organizationId } = req.user;
      const { id } = req.params;
      const { comments } = req.body;
      
      const datapoint = await datapointService.approve(
        organizationId,
        id,
        req.user.id,
        comments
      );
      
      res.json(datapoint);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
```

### 1.3 Middleware de Autorización

```typescript
// src/api/middleware/authorization.ts
import { Request, Response, NextFunction } from 'express';
import { permissionService } from '../../services/permissionService';

export function authorize(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const hasPermission = await permissionService.checkPermission(
        user.id,
        resource,
        action,
        {
          organizationId: user.organizationId,
          department: req.body.department || req.query.department,
          status: req.body.status || req.query.status
        }
      );
      
      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: `User does not have permission to ${action} ${resource}`
        });
      }
      
      next();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
}
```

### 1.4 Middleware de Auditoría

```typescript
// src/api/middleware/audit.ts
import { Request, Response, NextFunction } from 'express';
import { auditService } from '../../services/auditService';

export function auditMiddleware(
  entityType: string,
  eventType: string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Capturar estado antes (si aplica)
    const beforeState = req.auditContext?.beforeState || null;
    
    // Interceptar respuesta para capturar estado después
    const originalJson = res.json.bind(res);
    res.json = function(body: any) {
      const afterState = req.auditContext?.afterState || body;
      
      // Crear evento de auditoría de forma asíncrona
      auditService.createEvent({
        organizationId: req.user.organizationId,
        entityType,
        entityId: req.params.id || body.id,
        eventType,
        userId: req.user.id,
        userName: req.user.name,
        beforeState,
        afterState,
        changes: req.auditContext?.changes || [],
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          reason: req.body.reason || req.body.comments
        }
      }).catch(err => {
        console.error('Failed to create audit event:', err);
        // No fallar la request si falla la auditoría
      });
      
      return originalJson(body);
    };
    
    next();
  };
}
```

---

## 2. Servicio de Consolidación Avanzado

### 2.1 Consolidación Multi-Nivel

```typescript
// src/services/consolidationService.ts
import { ConsolidationSource, ConsolidatedValue, OrganizationalHierarchy } from '../models';
import { unitConversionService } from './unitConversionService';
import { validationService } from './validationService';

export class ConsolidationService {
  /**
   * Consolidación multi-nivel: Facility → Subsidiary → Country → Region → Group
   */
  async consolidateMultiLevel(
    organizationId: string,
    datapointId: string,
    reportingYear: number,
    targetLevel: 'facility' | 'subsidiary' | 'country' | 'region' | 'group'
  ): Promise<ConsolidatedValue> {
    // 1. Obtener jerarquía organizacional
    const hierarchy = await this.getOrganizationalHierarchy(organizationId);
    
    // 2. Obtener todas las fuentes para este datapoint
    const allSources = await this.getConsolidationSources(
      organizationId,
      datapointId,
      reportingYear
    );
    
    // 3. Agrupar fuentes por nivel jerárquico
    const sourcesByLevel = this.groupSourcesByLevel(allSources, hierarchy);
    
    // 4. Consolidar desde el nivel más bajo hacia arriba
    const consolidated = await this.rollUp(
      sourcesByLevel,
      targetLevel,
      hierarchy
    );
    
    return consolidated;
  }
  
  /**
   * Roll-up recursivo por niveles jerárquicos
   */
  private async rollUp(
    sourcesByLevel: Map<string, ConsolidationSource[]>,
    targetLevel: string,
    hierarchy: OrganizationalHierarchy[]
  ): Promise<ConsolidatedValue> {
    // Empezar desde el nivel más bajo (facility)
    let currentLevel = 'facility';
    let consolidatedValues = new Map<string, ConsolidatedValue>();
    
    // Consolidar nivel por nivel
    while (currentLevel !== targetLevel) {
      const sources = sourcesByLevel.get(currentLevel) || [];
      
      // Consolidar cada grupo de este nivel
      for (const sourceGroup of this.groupByParent(sources, hierarchy)) {
        const parentId = sourceGroup.parentId;
        const consolidated = await this.consolidateGroup(
          sourceGroup.sources,
          sourceGroup.method
        );
        
        consolidatedValues.set(parentId, consolidated);
      }
      
      // Subir al siguiente nivel
      currentLevel = this.getNextLevel(currentLevel);
    }
    
    // Consolidación final al nivel objetivo
    const finalSources = Array.from(consolidatedValues.values());
    return this.consolidateGroup(finalSources, 'sum');
  }
  
  /**
   * Consolidar un grupo de fuentes
   */
  private async consolidateGroup(
    sources: ConsolidationSource[],
    method: 'sum' | 'average' | 'weighted_average'
  ): Promise<ConsolidatedValue> {
    // 1. Convertir unidades a unidad base
    const convertedSources = await Promise.all(
      sources.map(async (source) => {
        const converted = await unitConversionService.convertToBaseUnit(
          source.values,
          source.unit
        );
        return { ...source, convertedValue: converted };
      })
    );
    
    // 2. Validar fuentes
    const validationResults = await validationService.validateSources(
      convertedSources
    );
    
    // 3. Filtrar fuentes válidas
    const validSources = convertedSources.filter((source, index) => 
      validationResults[index].passed
    );
    
    // 4. Aplicar método de consolidación
    const consolidatedValue = this.applyConsolidationMethod(
      validSources,
      method
    );
    
    // 5. Calcular metadata
    const coveragePercentage = (validSources.length / sources.length) * 100;
    const qualityScore = this.calculateQualityScore(validSources);
    
    return {
      value: consolidatedValue,
      unit: this.getBaseUnit(sources[0]),
      method,
      sourcesCount: validSources.length,
      coveragePercentage,
      calculationDetails: {
        includedSourceIds: validSources.map(s => s.id),
        excludedSourceIds: sources
          .filter(s => !validSources.find(vs => vs.id === s.id))
          .map(s => s.id),
        exclusionReasons: this.buildExclusionReasons(
          sources,
          validSources,
          validationResults
        ),
        unitConversions: this.buildUnitConversions(convertedSources)
      },
      metadata: {
        calculatedAt: new Date().toISOString(),
        calculatedBy: 'system',
        calculationId: `consolidation_${Date.now()}`,
        qualityScore
      }
    };
  }
  
  private applyConsolidationMethod(
    sources: ConsolidationSource[],
    method: string
  ): number {
    const values = sources.map(s => s.convertedValue || 0);
    
    switch (method) {
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'average':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'weighted_average':
        // Implementar con pesos
        return values.reduce((a, b) => a + b, 0) / values.length;
      default:
        return values.reduce((a, b) => a + b, 0);
    }
  }
}
```

---

## 3. Servicio de AI - Análisis de Evidencias

### 3.1 Evidence Analyzer

```typescript
// src/services/ai/evidenceAnalyzer.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { EvidenceFile, EvidenceAnalysis } from '../../models';

export class EvidenceAnalyzer {
  private genAI: GoogleGenerativeAI;
  
  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }
  
  /**
   * Analiza un archivo de evidencia contra un valor reportado
   */
  async analyzeEvidence(
    file: File | Buffer,
    datapointCode: string,
    reportedValue: number | string,
    unit?: string,
    datapointName?: string
  ): Promise<EvidenceAnalysis> {
    // 1. Leer contenido del archivo
    const fileContent = await this.extractFileContent(file);
    
    // 2. Preparar prompt para Gemini
    const prompt = this.buildAnalysisPrompt(
      fileContent,
      datapointCode,
      datapointName || datapointCode,
      reportedValue,
      unit
    );
    
    // 3. Llamar a Gemini
    const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisJson = JSON.parse(response.text());
    
    // 4. Procesar respuesta
    return this.processAnalysisResponse(analysisJson, reportedValue);
  }
  
  private buildAnalysisPrompt(
    fileContent: string,
    datapointCode: string,
    datapointName: string,
    reportedValue: number | string,
    unit?: string
  ): string {
    return `
Eres un auditor ESG especializado en validar evidencias para reportes CSRD/ESRS.

TAREA:
Analiza el siguiente documento y verifica si respalda el valor reportado para el datapoint ${datapointCode} (${datapointName}).

VALOR REPORTADO: ${reportedValue}${unit ? ` ${unit}` : ''}

DOCUMENTO:
${fileContent.substring(0, 50000)} ${fileContent.length > 50000 ? '...' : ''}

INSTRUCCIONES:
1. Busca en el documento el valor numérico que corresponde a ${datapointCode}
2. Compara con el valor reportado: ${reportedValue}${unit ? ` ${unit}` : ''}
3. Verifica que el documento contiene:
   - Valor numérico claro
   - Unidad especificada (si aplica)
   - Período de reporting (año)
   - Fuente identificable
4. Determina el nivel de confianza (0-100)
5. Identifica qué requisitos de información se cumplen

RESPONDE EN FORMATO JSON:
{
  "status": "verified" | "mismatch" | "pending" | "unverified",
  "extractedValue": número o null,
  "extractedUnit": string o null,
  "extractedYear": número o null,
  "confidence": número (0-100),
  "reasoning": "explicación detallada",
  "requirementsMet": ["requisito1", "requisito2"],
  "missingRequirements": ["requisito1", "requisito2"]
}
`;
  }
  
  private processAnalysisResponse(
    analysisJson: any,
    reportedValue: number | string
  ): EvidenceAnalysis {
    const status = this.determineStatus(
      analysisJson,
      reportedValue
    );
    
    return {
      status,
      extractedValue: analysisJson.extractedValue || null,
      confidence: analysisJson.confidence || 0,
      reasoning: analysisJson.reasoning || '',
      lastChecked: new Date().toISOString(),
      requirementsMet: analysisJson.requirementsMet || [],
      missingRequirements: analysisJson.missingRequirements || []
    };
  }
  
  private determineStatus(
    analysis: any,
    reportedValue: number | string
  ): 'verified' | 'mismatch' | 'pending' | 'unverified' {
    if (!analysis.extractedValue) {
      return 'unverified';
    }
    
    if (analysis.confidence < 50) {
      return 'pending';
    }
    
    // Comparar valores (con tolerancia del 1%)
    const extracted = Number(analysis.extractedValue);
    const reported = Number(reportedValue);
    
    if (isNaN(extracted) || isNaN(reported)) {
      return 'pending';
    }
    
    const difference = Math.abs(extracted - reported);
    const tolerance = Math.abs(reported) * 0.01; // 1% de tolerancia
    
    if (difference <= tolerance) {
      return 'verified';
    } else {
      return 'mismatch';
    }
  }
  
  private async extractFileContent(
    file: File | Buffer
  ): Promise<string> {
    // Implementar extracción según tipo de archivo
    // PDF → pdf-parse
    // Excel → xlsx
    // Word → mammoth
    // Texto → lectura directa
    
    if (file instanceof File) {
      const mimeType = file.type;
      
      if (mimeType === 'application/pdf') {
        return this.extractPDFContent(file);
      } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
        return this.extractExcelContent(file);
      } else if (mimeType.includes('text')) {
        return file.text();
      }
    }
    
    // Buffer o formato desconocido
    return file.toString('utf-8');
  }
  
  private async extractPDFContent(file: File): Promise<string> {
    // Usar pdf-parse o similar
    // Implementación simplificada
    return 'PDF content extraction not implemented';
  }
  
  private async extractExcelContent(file: File): Promise<string> {
    // Usar xlsx o similar
    // Implementación simplificada
    return 'Excel content extraction not implemented';
  }
}
```

---

## 4. Frontend - Dashboard con Drill-Down

### 4.1 Componente de KPI Card

```typescript
// src/components/dashboard/KPICard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: number;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  onClick?: () => void;
  breakdown?: {
    byFunction?: Record<string, number>;
    byESRS?: Record<string, number>;
    byStatus?: Record<string, number>;
  };
}

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  trend,
  trendValue,
  onClick,
  breakdown
}) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (breakdown) {
      // Abrir modal con breakdown
      navigate('/dashboard/breakdown', {
        state: { label, value, breakdown }
      });
    }
  };
  
  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };
  
  return (
    <div
      onClick={handleClick}
      className="bg-[#1e1e1e] p-6 rounded border border-[#2a2a2a] 
                 cursor-pointer hover:border-[#0066ff] transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-[#6a6a6a]">{label}</p>
        {trend && getTrendIcon()}
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold text-white">{value.toLocaleString()}</p>
        {trendValue && (
          <span className={`text-sm ${
            trend === 'up' ? 'text-green-500' : 
            trend === 'down' ? 'text-red-500' : 
            'text-gray-500'
          }`}>
            {trend === 'up' ? '+' : ''}{trendValue}%
          </span>
        )}
      </div>
    </div>
  );
};
```

### 4.2 Componente de Readiness Scoring

```typescript
// src/components/dashboard/ReadinessScoring.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ReadinessScore {
  dimension: 'function' | 'esrs';
  dimensionValue: string;
  score: number;
  total: number;
  completed: number;
  inProgress: number;
  blocked: number;
}

interface ReadinessScoringProps {
  scores: ReadinessScore[];
  type: 'function' | 'esrs';
  onCellClick?: (dimension: string, value: string) => void;
}

export const ReadinessScoring: React.FC<ReadinessScoringProps> = ({
  scores,
  type,
  onCellClick
}) => {
  const navigate = useNavigate();
  
  const data = scores.map(score => ({
    name: score.dimensionValue,
    score: score.score,
    total: score.total,
    completed: score.completed,
    inProgress: score.inProgress,
    blocked: score.blocked
  }));
  
  const getColor = (score: number) => {
    if (score >= 90) return '#00ff88';
    if (score >= 70) return '#ffaa00';
    if (score >= 50) return '#ff6600';
    return '#ff4444';
  };
  
  const handleBarClick = (data: any) => {
    if (onCellClick) {
      onCellClick(type, data.name);
    } else {
      navigate('/datapoints', {
        state: {
          filter: {
            [type === 'function' ? 'department' : 'standardCode']: data.name
          }
        }
      });
    }
  };
  
  return (
    <div className="bg-[#1e1e1e] p-6 rounded border border-[#2a2a2a]">
      <h3 className="text-lg font-bold text-white mb-4">
        Readiness by {type === 'function' ? 'Function' : 'ESRS Standard'}
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <XAxis type="number" domain={[0, 100]} stroke="#6a6a6a" />
          <YAxis dataKey="name" type="category" width={120} stroke="#6a6a6a" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e1e1e',
              border: '1px solid #2a2a2a',
              borderRadius: '4px'
            }}
            formatter={(value: any) => [`${value}%`, 'Readiness']}
          />
          <Bar
            dataKey="score"
            fill="#0066ff"
            radius={[0, 4, 4, 0]}
            onClick={handleBarClick}
            cursor="pointer"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
```

### 4.3 Hook para Dashboard Data

```typescript
// src/hooks/useDashboard.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

interface DashboardKPIs {
  total: number;
  ready: number;
  atRisk: number;
  blocked: number;
}

interface ReadinessScore {
  dimension: 'function' | 'esrs';
  dimensionValue: string;
  score: number;
  total: number;
  completed: number;
  inProgress: number;
  blocked: number;
}

export function useDashboard(organizationId: string, cycleId: string) {
  const { data: kpis, isLoading: kpisLoading } = useQuery<DashboardKPIs>({
    queryKey: ['dashboard', 'kpis', organizationId, cycleId],
    queryFn: () => apiClient.get(`/dashboard/kpis?cycleId=${cycleId}`)
  });
  
  const { data: readinessScores, isLoading: readinessLoading } = useQuery<ReadinessScore[]>({
    queryKey: ['dashboard', 'readiness', organizationId, cycleId],
    queryFn: () => apiClient.get(`/dashboard/readiness?cycleId=${cycleId}`)
  });
  
  const { data: workflowStatus, isLoading: workflowLoading } = useQuery({
    queryKey: ['dashboard', 'workflow', organizationId, cycleId],
    queryFn: () => apiClient.get(`/dashboard/workflow-status?cycleId=${cycleId}`)
  });
  
  return {
    kpis,
    readinessScores,
    workflowStatus,
    isLoading: kpisLoading || readinessLoading || workflowLoading
  };
}
```

---

## 5. Servicio de Validación Temporal

```typescript
// src/services/temporalConsistencyValidator.ts
import { Datapoint } from '../models';

export class TemporalConsistencyValidator {
  /**
   * Valida consistencia temporal de un datapoint
   */
  async validateTemporalConsistency(
    datapoint: Datapoint,
    historicalValues: Record<string, number>
  ): Promise<ConsistencyReport> {
    const currentYear = Object.keys(datapoint.values)
      .map(Number)
      .sort((a, b) => b - a)[0];
    
    const currentValue = Number(datapoint.values[currentYear.toString()]);
    
    if (isNaN(currentValue)) {
      return {
        status: 'no_data',
        message: 'No current value available'
      };
    }
    
    // Calcular tendencia histórica
    const historicalArray = Object.entries(historicalValues)
      .map(([year, value]) => ({ year: Number(year), value }))
      .sort((a, b) => a.year - b.year);
    
    if (historicalArray.length < 2) {
      return {
        status: 'insufficient_data',
        message: 'Insufficient historical data for comparison'
      };
    }
    
    // Calcular promedio y desviación estándar
    const values = historicalArray.map(h => h.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Calcular rango esperado (mean ± 2*stdDev)
    const expectedMin = mean - 2 * stdDev;
    const expectedMax = mean + 2 * stdDev;
    
    // Detectar anomalías
    if (currentValue < expectedMin || currentValue > expectedMax) {
      const changePercent = ((currentValue - mean) / mean) * 100;
      
      return {
        status: 'anomaly_detected',
        currentValue,
        expectedRange: { min: expectedMin, max: expectedMax },
        anomalyType: currentValue < expectedMin ? 'significant_decrease' : 'significant_increase',
        changePercent: Math.abs(changePercent),
        suggestedActions: this.generateSuggestedActions(
          currentValue,
          mean,
          changePercent
        ),
        confidence: this.calculateConfidence(stdDev, mean)
      };
    }
    
    return {
      status: 'consistent',
      currentValue,
      expectedRange: { min: expectedMin, max: expectedMax },
      confidence: 95
    };
  }
  
  private generateSuggestedActions(
    currentValue: number,
    historicalMean: number,
    changePercent: number
  ): string[] {
    const actions: string[] = [];
    
    if (Math.abs(changePercent) > 30) {
      actions.push('Verificar que no se excluyeron instalaciones o unidades de negocio');
      actions.push('Confirmar cambios en metodología de cálculo');
      actions.push('Revisar evidencias de reducción/aumento significativo');
    }
    
    if (changePercent < -20) {
      actions.push('Verificar que las reducciones son reales y no errores de datos');
      actions.push('Documentar iniciativas de reducción implementadas');
    }
    
    if (changePercent > 20) {
      actions.push('Verificar causas del aumento (expansión, cambios operativos)');
      actions.push('Documentar medidas de mitigación planificadas');
    }
    
    return actions;
  }
  
  private calculateConfidence(stdDev: number, mean: number): number {
    // Mayor confianza si la desviación estándar es pequeña relativa a la media
    const coefficientOfVariation = stdDev / mean;
    
    if (coefficientOfVariation < 0.1) {
      return 95; // Muy consistente históricamente
    } else if (coefficientOfVariation < 0.2) {
      return 85; // Moderadamente consistente
    } else {
      return 70; // Variable históricamente
    }
  }
}

interface ConsistencyReport {
  status: 'consistent' | 'anomaly_detected' | 'no_data' | 'insufficient_data';
  currentValue?: number;
  expectedRange?: { min: number; max: number };
  anomalyType?: 'significant_increase' | 'significant_decrease';
  changePercent?: number;
  suggestedActions?: string[];
  confidence?: number;
  message?: string;
}
```

---

Estos ejemplos muestran cómo implementar las características clave de la arquitectura empresarial. Cada componente está diseñado para ser modular, testeable y escalable.
