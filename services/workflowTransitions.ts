import { WorkflowStatus } from '../types';

/** Transiciones válidas de workflow (aprobación ligera antes de motor dedicado). */
const ALLOWED: Record<WorkflowStatus, WorkflowStatus[]> = {
  [WorkflowStatus.DRAFT]: [WorkflowStatus.REVIEW, WorkflowStatus.DRAFT],
  [WorkflowStatus.REVIEW]: [WorkflowStatus.APPROVED, WorkflowStatus.DRAFT, WorkflowStatus.REVIEW],
  [WorkflowStatus.APPROVED]: [WorkflowStatus.LOCKED, WorkflowStatus.REVIEW, WorkflowStatus.APPROVED],
  [WorkflowStatus.LOCKED]: [WorkflowStatus.LOCKED]
};

export function canTransitionWorkflow(from: WorkflowStatus, to: WorkflowStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function assertTransition(from: WorkflowStatus, to: WorkflowStatus): void {
  if (!canTransitionWorkflow(from, to)) {
    throw new Error(`Transición no permitida: ${from} → ${to}`);
  }
}
