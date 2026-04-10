/**
 * Reporting Cycle Model - Versionado por año
 */
export type CycleStatus = 'draft' | 'in_progress' | 'under_review' | 'approved' | 'locked';

export interface ReportingCycle {
  id: string;
  organizationId: string;
  year: number;
  status: CycleStatus;
  startDate: string; // ISO date
  endDate: string; // ISO date
  lockedAt?: string;
  lockedBy?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CycleMetadata {
  reportingPeriod?: {
    start: string;
    end: string;
  };
  submissionDeadline?: string;
  auditor?: string;
  notes?: string;
}
