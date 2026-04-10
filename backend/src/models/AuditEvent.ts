/**
 * Audit Event Model - Event Sourcing para trazabilidad completa
 */
export type EntityType = 'datapoint' | 'evidence' | 'consolidation' | 'user' | 'workflow' | 'organization';
export type EventType = 
  | 'created'
  | 'updated'
  | 'deleted'
  | 'status_changed'
  | 'approved'
  | 'rejected'
  | 'exported'
  | 'viewed';

export interface AuditEvent {
  id: string;
  organizationId: string;
  entityType: EntityType;
  entityId: string;
  eventType: EventType;
  userId: string;
  userName: string;
  beforeState: Record<string, any> | null;
  afterState: Record<string, any>;
  changes: FieldChange[];
  metadata: AuditMetadata;
  timestamp: string;
}

export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface AuditMetadata {
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  approvalComments?: string;
  workflowStage?: string;
  [key: string]: any;
}

/**
 * Calcula los cambios entre dos estados
 */
export function calculateChanges(
  beforeState: Record<string, any> | null,
  afterState: Record<string, any>
): FieldChange[] {
  if (!beforeState) {
    return Object.entries(afterState).map(([field, value]) => ({
      field,
      oldValue: null,
      newValue: value
    }));
  }

  const changes: FieldChange[] = [];
  const allKeys = new Set([
    ...Object.keys(beforeState),
    ...Object.keys(afterState)
  ]);

  for (const key of allKeys) {
    const oldValue = beforeState[key];
    const newValue = afterState[key];

    // Comparar valores (deep comparison para objetos)
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field: key,
        oldValue,
        newValue
      });
    }
  }

  return changes;
}
