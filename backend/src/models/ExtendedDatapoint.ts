/**
 * Extended Datapoint Model - Con versionado y multi-tenancy
 */
import { Datapoint, WorkflowStatus } from '../../../types';

export interface ExtendedDatapoint extends Datapoint {
  organizationId: string;
  cycleId: string;
  requirementId?: string; // Referencia a ESRS requirement
  baseUnit?: string; // Unidad base para consolidación
  workflowStage?: string; // Estado del workflow de consolidación
  consolidationEnabled: boolean;
  consolidationMethod?: 'sum' | 'average' | 'weighted_average' | 'max' | 'min' | 'custom';
  version: number;
  parentVersionId?: string; // Para versionado
  changeReason?: string; // Razón del cambio de versión
}

export interface DatapointVersion {
  id: string;
  datapointId: string;
  version: number;
  parentVersionId?: string;
  values: Record<string, string | number | null>;
  status: WorkflowStatus;
  changeReason?: string;
  changedBy: string;
  changedAt: string;
}
