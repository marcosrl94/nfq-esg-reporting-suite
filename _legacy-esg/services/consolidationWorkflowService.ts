import {
  ConsolidationWorkflowStage,
  WorkflowStageRecord,
  WorkflowBlocker,
  WorkflowAction,
  ConsolidationSource,
  ConsolidatedDatapoint,
  Role,
  ValidationResult
} from '../types';
import { validateConsolidationSources } from './consolidationService';

/**
 * Consolidation workflow service
 * Manages the workflow stages and transitions for consolidation
 */

/**
 * Gets the current workflow stage for a consolidated datapoint
 */
export const getCurrentWorkflowStage = (
  datapoint: ConsolidatedDatapoint
): ConsolidationWorkflowStage => {
  if (datapoint.workflowStage) {
    return datapoint.workflowStage;
  }
  
  // Determine stage based on status and sources
  if (!datapoint.consolidationEnabled) {
    return ConsolidationWorkflowStage.SOURCE_INPUT;
  }
  
  if (datapoint.status === 'Locked') {
    return ConsolidationWorkflowStage.LOCKED;
  }
  
  if (datapoint.status === 'Approved') {
    return ConsolidationWorkflowStage.APPROVED;
  }
  
  if (datapoint.consolidatedValues && Object.keys(datapoint.consolidatedValues).length > 0) {
    return ConsolidationWorkflowStage.CONSOLIDATED;
  }
  
  if (datapoint.sources && datapoint.sources.length > 0) {
    const allApproved = datapoint.sources.every(s => s.status === 'Approved');
    if (allApproved) {
      return ConsolidationWorkflowStage.CONSOLIDATION_PENDING;
    }
    
    const anyInReview = datapoint.sources.some(s => s.status === 'Review');
    if (anyInReview) {
      return ConsolidationWorkflowStage.CENTRAL_REVIEW;
    }
  }
  
  return ConsolidationWorkflowStage.SOURCE_INPUT;
};

/**
 * Detects blockers that prevent workflow progression
 */
export const detectWorkflowBlockers = (
  datapoint: ConsolidatedDatapoint,
  reportingYear: number
): WorkflowBlocker[] => {
  const blockers: WorkflowBlocker[] = [];
  const yearKey = reportingYear.toString();
  
  if (!datapoint.consolidationEnabled) {
    return blockers;
  }
  
  // Check for missing sources
  if (!datapoint.sources || datapoint.sources.length === 0) {
    blockers.push({
      id: 'no_sources',
      type: 'missing_data',
      severity: 'error',
      message: 'No hay fuentes de consolidación configuradas'
    });
    return blockers;
  }
  
  // Check each source for blockers
  datapoint.sources.forEach(source => {
    // Missing values
    if (!source.values || !source.values[yearKey] || source.values[yearKey] === null) {
      blockers.push({
        id: `missing_value_${source.id}`,
        type: 'missing_data',
        severity: 'error',
        sourceId: source.id,
        message: `Fuente "${source.name}" no tiene valor para el año ${reportingYear}`
      });
    }
    
    // Missing evidence
    const evidenceIds = source.evidenceIds || source.evidence || [];
    if (evidenceIds.length === 0) {
      blockers.push({
        id: `missing_evidence_${source.id}`,
        type: 'missing_evidence',
        severity: 'warning',
        sourceId: source.id,
        message: `Fuente "${source.name}" no tiene evidencias asociadas`
      });
    }
    
    // Source not approved
    if (source.status !== 'Approved' && source.status !== 'Locked') {
      blockers.push({
        id: `source_not_approved_${source.id}`,
        type: 'manual_review_required',
        severity: 'error',
        sourceId: source.id,
        message: `Fuente "${source.name}" no está aprobada (Estado: ${source.status})`
      });
    }
  });
  
  // Validation errors
  try {
    const validation = validateConsolidationSources(datapoint.sources, datapoint);
    if (!validation.valid && validation.errors.length > 0) {
      validation.errors.forEach((error, idx) => {
        blockers.push({
          id: `validation_error_${idx}`,
          type: 'validation_error',
          severity: 'error',
          message: error
        });
      });
    }
    
    // Validation warnings
    if (validation.warnings.length > 0) {
      validation.warnings.forEach((warning, idx) => {
        blockers.push({
          id: `validation_warning_${idx}`,
          type: 'validation_error',
          severity: 'warning',
          message: warning
        });
      });
    }
  } catch (error) {
    blockers.push({
      id: 'validation_exception',
      type: 'validation_error',
      severity: 'error',
      message: `Error en validación: ${error instanceof Error ? error.message : String(error)}`
    });
  }
  
  return blockers;
};

/**
 * Gets available workflow actions for current stage
 */
export const getAvailableWorkflowActions = (
  datapoint: ConsolidatedDatapoint,
  currentUserRole: Role,
  reportingYear: number
): WorkflowAction[] => {
  const stage = getCurrentWorkflowStage(datapoint);
  const actions: WorkflowAction[] = [];
  
  switch (stage) {
    case ConsolidationWorkflowStage.SOURCE_INPUT:
      // Data owners can submit for validation
      if (currentUserRole === Role.EDITOR || currentUserRole === Role.ADMIN) {
        actions.push({
          id: 'submit_validation',
          type: 'validate',
          label: 'Enviar para Validación',
          requiredRole: [Role.EDITOR, Role.ADMIN],
          targetStage: ConsolidationWorkflowStage.SOURCE_VALIDATION
        });
      }
      break;
      
    case ConsolidationWorkflowStage.SOURCE_VALIDATION:
      // Central team can review
      if (currentUserRole === Role.ADMIN) {
        actions.push({
          id: 'approve_for_review',
          type: 'review',
          label: 'Aprobar para Revisión Central',
          requiredRole: [Role.ADMIN],
          targetStage: ConsolidationWorkflowStage.CENTRAL_REVIEW
        });
        actions.push({
          id: 'request_changes',
          type: 'request_changes',
          label: 'Solicitar Cambios',
          requiredRole: [Role.ADMIN],
          targetStage: ConsolidationWorkflowStage.SOURCE_INPUT
        });
      }
      break;
      
    case ConsolidationWorkflowStage.CENTRAL_REVIEW:
      // Central team can approve sources
      if (currentUserRole === Role.ADMIN) {
        actions.push({
          id: 'approve_sources',
          type: 'approve',
          label: 'Aprobar Fuentes',
          requiredRole: [Role.ADMIN],
          targetStage: ConsolidationWorkflowStage.CONSOLIDATION_PENDING
        });
        actions.push({
          id: 'reject_sources',
          type: 'reject',
          label: 'Rechazar y Solicitar Cambios',
          requiredRole: [Role.ADMIN],
          targetStage: ConsolidationWorkflowStage.SOURCE_INPUT
        });
      }
      break;
      
    case ConsolidationWorkflowStage.CONSOLIDATION_PENDING:
      // System automatically consolidates, but admin can trigger manually
      if (currentUserRole === Role.ADMIN) {
        actions.push({
          id: 'trigger_consolidation',
          type: 'validate',
          label: 'Ejecutar Consolidación',
          requiredRole: [Role.ADMIN],
          targetStage: ConsolidationWorkflowStage.CONSOLIDATED
        });
      }
      break;
      
    case ConsolidationWorkflowStage.CONSOLIDATED:
      // Central team can validate consolidated value
      if (currentUserRole === Role.ADMIN) {
        actions.push({
          id: 'validate_consolidated',
          type: 'validate',
          label: 'Validar Consolidado',
          requiredRole: [Role.ADMIN],
          targetStage: ConsolidationWorkflowStage.VALIDATED
        });
        actions.push({
          id: 'reject_consolidated',
          type: 'reject',
          label: 'Rechazar Consolidado',
          requiredRole: [Role.ADMIN],
          targetStage: ConsolidationWorkflowStage.CONSOLIDATION_PENDING
        });
      }
      break;
      
    case ConsolidationWorkflowStage.VALIDATED:
      // Final approval
      if (currentUserRole === Role.ADMIN) {
        actions.push({
          id: 'approve_final',
          type: 'approve',
          label: 'Aprobar para Reporting',
          requiredRole: [Role.ADMIN],
          targetStage: ConsolidationWorkflowStage.APPROVED
        });
      }
      break;
      
    case ConsolidationWorkflowStage.APPROVED:
      // Lock for reporting
      if (currentUserRole === Role.ADMIN) {
        actions.push({
          id: 'lock_for_reporting',
          type: 'approve',
          label: 'Bloquear para Reporting',
          requiredRole: [Role.ADMIN],
          targetStage: ConsolidationWorkflowStage.LOCKED
        });
      }
      break;
  }
  
  return actions;
};

/**
 * Transitions workflow to next stage
 */
export const transitionWorkflowStage = (
  datapoint: ConsolidatedDatapoint,
  targetStage: ConsolidationWorkflowStage,
  userId: string,
  notes?: string
): {
  updatedDatapoint: Partial<ConsolidatedDatapoint>;
  stageRecord: WorkflowStageRecord;
} => {
  const currentStage = getCurrentWorkflowStage(datapoint);
  const now = new Date().toISOString();
  
  const stageRecord: WorkflowStageRecord = {
    stage: targetStage,
    enteredAt: now,
    enteredBy: userId,
    notes
  };
  
  const updates: Partial<ConsolidatedDatapoint> = {
    workflowStage: targetStage
  };
  
  // Update status based on workflow stage
  switch (targetStage) {
    case ConsolidationWorkflowStage.APPROVED:
    case ConsolidationWorkflowStage.LOCKED:
      updates.status = targetStage === ConsolidationWorkflowStage.LOCKED ? 'Locked' : 'Approved';
      break;
    case ConsolidationWorkflowStage.CONSOLIDATED:
    case ConsolidationWorkflowStage.VALIDATED:
      updates.status = 'Review';
      break;
    default:
      // Keep current status or set to Draft
      break;
  }
  
  return {
    updatedDatapoint: updates,
    stageRecord
  };
};

/**
 * Checks if workflow can progress to next stage
 */
export const canProgressToStage = (
  datapoint: ConsolidatedDatapoint,
  targetStage: ConsolidationWorkflowStage,
  reportingYear: number
): { canProgress: boolean; blockers: WorkflowBlocker[] } => {
  const blockers = detectWorkflowBlockers(datapoint, reportingYear);
  
  // Filter blockers by severity for the target stage
  const criticalBlockers = blockers.filter(b => 
    b.severity === 'error' && 
    (targetStage === ConsolidationWorkflowStage.CONSOLIDATED || 
     targetStage === ConsolidationWorkflowStage.APPROVED)
  );
  
  return {
    canProgress: criticalBlockers.length === 0,
    blockers: criticalBlockers
  };
};
