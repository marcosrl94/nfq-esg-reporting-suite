export enum WorkflowStatus {
  DRAFT = 'Draft',
  REVIEW = 'Review',
  APPROVED = 'Approved',
  LOCKED = 'Locked',
}

export enum StandardType {
  ESRS = 'ESRS',
  GRI = 'GRI',
  ISSB = 'ISSB',
  TCFD = 'TCFD',
  SASB = 'SASB'
}

/** Origen de datos configurado para un indicador (canales de ingesta). */
export type DataOrigin = 'questionnaire' | 'bulk_import' | 'erp' | 'manual';

export enum Role {
  ADMIN = 'Sustainability Lead',
  EDITOR = 'Data Owner',
  VIEWER = 'Auditor'
}

export enum Department {
  SUSTAINABILITY = 'Sustainability Office',
  ENVIRONMENT = 'Environment / Ops',
  HR = 'Human Resources',
  FINANCE = 'Finance',
  LEGAL = 'Legal'
}

export type ReportingFrequency = 'annual' | 'quarterly' | 'monthly';

export interface User {
  id: string;
  name: string;
  role: Role;
  department: Department;
  avatar: string;
  /** Multi-tenant: organización activa (Supabase / BFF) */
  organizationId?: string;
  email?: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
}

export interface Datapoint {
  id: string;
  code: string; // e.g., "E1-1"
  name: string;
  description: string;
  values: Record<string, string | number | null>; 
  unit?: string;
  type: 'quantitative' | 'qualitative';
  status: WorkflowStatus;
  ownerId?: string; 
  department: Department;
  lastModified?: string;
  evidence?: string[]; 
  comments: Comment[]; 
  // New: Cross referencing (ESRS suele inferirse por sección; otros estándares explícitos)
  mappings?: {
    [StandardType.ESRS]?: string;
    [StandardType.GRI]?: string;
    [StandardType.ISSB]?: string;
    [StandardType.SASB]?: string;
    [StandardType.TCFD]?: string;
  };
  // New: AI Verification
  aiVerification?: {
    status: 'verified' | 'mismatch' | 'pending' | 'unverified';
    extractedValue?: string | number;
    confidence?: number;
    reasoning?: string;
    lastChecked?: string;
  };
  /** Sygris-style: frecuencia de imputación del indicador */
  reportingFrequency?: ReportingFrequency;
  /** Responsable asignado (cuestionario / tarea) */
  assignedToUserId?: string;
  /** Indicador añadido por el usuario (catálogo ampliado); no solo taxonomía base. */
  isCustom?: boolean;
}

export interface StandardSection {
  id: string;
  code: string; // e.g. "E1"
  title: string;
  datapoints: Datapoint[];
}

/** Nivel de profundidad de disclosure según materialidad del topic (ESRS) */
export type DisclosureDepth = 'omit' | 'simplified' | 'full';

/** Criterio para considerar un topic “material” frente a umbrales de impacto y financiero */
export type MaterialityCriterion = 'both' | 'either';

/** Umbrales parametrizables (0–100) para materialidad de impacto y financiera */
export interface MaterialityThresholdConfig {
  impactMin: number;
  financialMin: number;
}

export interface MaterialityTopic {
  id: string;
  name: string; // e.g. "Climate Change Adaptation"
  category: 'Environmental' | 'Social' | 'Governance';
  impactScore: number; // Y-axis (0-100)
  financialScore: number; // X-axis (0-100)
  description: string;
  /** Código ESRS asociado (E1, E2, S1, etc.) - determina qué datapoints reportar */
  esrsSectionCode?: string;
  /** Nivel de profundidad: omit=no reportar, simplified=mínimo, full=completo */
  disclosureDepth?: DisclosureDepth;
}

// ============================================
// EVIDENCE MANAGEMENT TYPES
// ============================================

export interface EvidenceFile {
  id: string;
  datapointId: string;
  sourceId?: string; // Optional: ID of consolidation source this evidence belongs to
  fileName: string;
  filePath?: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
  extractedData?: ExtractedEvidenceData;
  aiAnalysis?: EvidenceAnalysis;
  hierarchy?: {
    level: 'geography' | 'business_unit' | 'subsidiary' | 'facility';
    value: string; // e.g., "Spain", "Manufacturing Division"
  };
}

export interface ExtractedEvidenceData {
  extractedValue?: string | number;
  extractedUnit?: string;
  extractedYear?: number;
  extractedText?: string; // For qualitative datapoints
  confidence: number; // 0-100
  extractionMethod: 'ai' | 'manual' | 'ocr';
  extractedAt: string;
}

export interface EvidenceAnalysis {
  status: 'verified' | 'mismatch' | 'pending' | 'unverified';
  extractedValue?: string | number;
  confidence?: number;
  reasoning?: string;
  lastChecked?: string;
  requirementsMet?: string[]; // List of information requirements satisfied
  missingRequirements?: string[]; // List of missing information requirements
}

export interface InformationRequirement {
  id: string;
  datapointCode: string;
  requirement: string; // e.g., "Provide Scope 1 emissions breakdown by facility"
  required: boolean;
  evidenceTypes: string[]; // e.g., ["verification_certificate", "emissions_report"]
}

// ============================================
// DATA CONSOLIDATION TYPES
// ============================================

// Organizational Hierarchy for multi-level consolidation
export interface OrganizationalHierarchy {
  id: string;
  code: string; // e.g., "EU-ES", "NA-US-CA", "APAC-SG"
  name: string; // e.g., "España", "California", "Singapur"
  level: 'region' | 'country' | 'state' | 'city' | 'business_unit' | 'subsidiary' | 'facility';
  parentId?: string; // For multi-level hierarchies
  metadata?: {
    countryCode?: string; // ISO 3166-1 alpha-2
    region?: string;
    timezone?: string;
    currency?: string;
    [key: string]: any;
  };
}

// Unit conversion definition
export interface UnitConversion {
  unit: string; // e.g., "kgCO2e", "GWh"
  conversionFactor: number; // Factor to convert to base unit
  isStandard: boolean; // If it's a standard unit for the standard
}

// Validation rule configuration
export interface ValidationRule {
  id: string;
  type: 'range' | 'format' | 'consistency' | 'evidence_required' | 'custom';
  config: Record<string, any>; // Rule-specific configuration
  errorMessage: string;
  warningMessage?: string;
}

// Extended source value with metadata
export interface SourceValue {
  value: string | number | null;
  unit?: string; // Reported unit (may differ from base unit)
  convertedValue?: number; // Value converted to base unit
  period?: {
    start: string; // ISO date
    end: string; // ISO date
    type: 'annual' | 'quarterly' | 'monthly' | 'custom';
  };
  metadata?: {
    reportingMethod?: string; // e.g., "location-based", "market-based"
    dataSource?: string; // e.g., "ERP", "Manual", "External Report"
    qualityScore?: number; // 0-100
    lastValidated?: string;
    validatedBy?: string;
    [key: string]: any;
  };
}

// Consolidation source with enhanced metadata
export interface ConsolidationSource {
  id: string;
  datapointId?: string; // Backward compatibility
  name: string; // e.g., "Spain Operations", "USA Operations"
  type: 'geography' | 'business_unit' | 'subsidiary' | 'facility';
  
  // Organizational hierarchy
  hierarchyId?: string; // Reference to OrganizationalHierarchy
  hierarchyPath?: string[]; // Full path: ["EU", "ES", "Madrid"]
  
  // Responsibility
  responsibleUserId: string;
  responsibleUserName: string;
  responsibleDepartment?: string;
  
  // Values - enhanced format
  values: Record<string, string | number | null | SourceValue>; // Year -> Value or SourceValue
  // Backward compatibility: also support simple Record<string, string | number | null>
  
  // Evidence
  evidence?: string[]; // Evidence file IDs (backward compatibility)
  evidenceIds?: string[]; // Preferred field name
  evidenceSummary?: {
    totalFiles: number;
    verifiedFiles: number;
    lastVerified?: string;
    averageConfidence?: number;
  };
  
  // Metadata
  lastUpdated: string;
  lastUpdatedBy?: string;
  status: WorkflowStatus;
  
  // Traceability
  version?: number; // Version of the source
  parentVersionId?: string; // If this is a correction of a previous version
  changeReason?: string; // Reason for change
}

// Consolidation perimeter definition
export interface ConsolidationPerimeter {
  id: string;
  datapointId: string;
  name: string; // e.g., "Group Consolidated", "EU Only", "Manufacturing Division"
  scope: {
    type: 'all' | 'hierarchy' | 'custom';
    hierarchyIds?: string[]; // IDs of OrganizationalHierarchy
    customSourceIds?: string[]; // Specific ConsolidationSource IDs
  };
  effectiveFrom: string; // ISO date
  effectiveTo?: string; // ISO date (null = currently active)
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

// Unit conversion applied during consolidation
export interface UnitConversionApplied {
  fromUnit: string;
  toUnit: string;
  originalValue: number;
  convertedValue: number;
  conversionFactor: number;
}

// Consolidated value with full traceability
export interface ConsolidatedValue {
  value: string | number | null;
  unit: string; // Always in base unit
  method: 'sum' | 'average' | 'weighted_average' | 'max' | 'min' | 'custom';
  sourcesCount: number; // Number of sources included
  coveragePercentage: number; // % coverage of perimeter
  calculationDetails: {
    includedSourceIds: string[];
    excludedSourceIds: string[];
    exclusionReasons?: Record<string, string>; // sourceId -> reason
    unitConversions?: Record<string, UnitConversionApplied>; // sourceId -> conversion
  };
  metadata: {
    calculatedAt: string;
    calculatedBy: string;
    calculationId: string; // Unique ID for this consolidation
    qualityScore?: number; // Score based on source quality
  };
}

// Validation result
export interface ValidationResult {
  ruleId: string;
  ruleType: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
  details?: Record<string, any>;
}

// Consolidation workflow stages
export enum ConsolidationWorkflowStage {
  SOURCE_INPUT = 'source_input',
  SOURCE_VALIDATION = 'source_validation',
  CENTRAL_REVIEW = 'central_review',
  CONSOLIDATION_PENDING = 'consolidation_pending',
  CONSOLIDATED = 'consolidated',
  VALIDATED = 'validated',
  APPROVED = 'approved',
  LOCKED = 'locked'
}

// Workflow stage record
export interface WorkflowStageRecord {
  stage: ConsolidationWorkflowStage;
  enteredAt: string;
  enteredBy: string;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

// Workflow blocker
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

// Workflow action
export interface WorkflowAction {
  id: string;
  type: 'validate' | 'review' | 'approve' | 'reject' | 'request_changes';
  label: string;
  requiredRole: Role[];
  targetStage: ConsolidationWorkflowStage;
}

// Consolidation record for audit trail
export interface ConsolidationRecord {
  id: string;
  consolidationId: string; // Unique ID for this execution
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

// Consolidated datapoint with full traceability
export interface ConsolidatedDatapoint extends Datapoint {
  consolidationEnabled: boolean;
  
  // Configuration
  consolidationConfig?: ConsolidationConfig;
  consolidationMethod: 'sum' | 'average' | 'weighted_average' | 'max' | 'min' | 'custom';
  
  // Sources
  sources: ConsolidationSource[];
  
  // Perimeters
  perimeters?: ConsolidationPerimeter[];
  activePerimeterId?: string; // Currently active perimeter
  
  // Consolidated values - enhanced format
  consolidatedValue?: Record<string, string | number | null>; // Backward compatibility
  consolidatedValues?: Record<string, ConsolidatedValue>; // Enhanced format
  
  // Breakdowns
  breakdowns?: ConsolidationBreakdown[];
  
  // Traceability
  consolidationHistory?: ConsolidationRecord[];
  lastConsolidated?: string;
  lastConsolidatedBy?: string;
  consolidationVersion?: number;
  
  // Workflow
  workflowStage?: ConsolidationWorkflowStage;
  workflowBlockers?: WorkflowBlocker[];
}

export interface ConsolidationBreakdown {
  dimension: 'geography' | 'business_unit' | 'facility' | 'custom';
  dimensionValue: string; // e.g., "Spain", "Manufacturing Division"
  value: string | number;
  percentage?: number; // Percentage of total
  sourceId: string;
}

export interface ConsolidationConfig {
  datapointId: string;
  method: 'sum' | 'average' | 'weighted_average' | 'max' | 'min' | 'custom';
  weights?: Record<string, number>; // Source ID -> Weight (for weighted_average)
  customFormula?: string; // For custom method
  breakdownDimensions: ('geography' | 'business_unit' | 'facility')[];
  
  // Enhanced configuration
  perimeterId?: string; // Active perimeter
  unitConversionEnabled?: boolean; // Enable automatic unit conversion
  deduplicationStrategy?: 'hierarchy_based' | 'temporal_overlap' | 'data_quality' | 'manual';
  minimumCoveragePercentage?: number; // Minimum % coverage required (default: 80)
  qualityThreshold?: number; // Minimum quality score for sources (default: 70)
}

/** Evento de auditoría (Workiva-style trail); persistido en Supabase o localStorage fallback */
export interface AuditLogEntry {
  id: string;
  organizationId: string;
  timestamp: string;
  actorUserId: string;
  actorName?: string;
  action: 'create' | 'update' | 'approve' | 'comment' | 'export' | 'login' | 'consolidation';
  resourceType: 'datapoint' | 'section' | 'report' | 'evidence' | 'session';
  resourceId: string;
  details?: Record<string, unknown>;
}
