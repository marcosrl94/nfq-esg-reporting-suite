/**
 * Audit Service - Gestión de eventos de auditoría
 */
import { AuditEvent, calculateChanges, EntityType, EventType } from '../models/AuditEvent';

export interface CreateAuditEventParams {
  organizationId: string;
  entityType: EntityType;
  entityId: string;
  eventType: EventType;
  userId: string;
  userName: string;
  beforeState?: Record<string, any> | null;
  afterState: Record<string, any>;
  metadata?: Record<string, any>;
}

export class AuditService {
  private events: AuditEvent[] = []; // En producción, esto sería una base de datos

  /**
   * Crea un evento de auditoría
   */
  async createEvent(params: CreateAuditEventParams): Promise<AuditEvent> {
    const changes = params.beforeState
      ? calculateChanges(params.beforeState, params.afterState)
      : [];

    const event: AuditEvent = {
      id: this.generateId(),
      organizationId: params.organizationId,
      entityType: params.entityType,
      entityId: params.entityId,
      eventType: params.eventType,
      userId: params.userId,
      userName: params.userName,
      beforeState: params.beforeState || null,
      afterState: params.afterState,
      changes,
      metadata: params.metadata || {},
      timestamp: new Date().toISOString()
    };

    // En producción, guardar en base de datos (TimescaleDB)
    this.events.push(event);

    // Log para desarrollo
    console.log('[AUDIT]', {
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      userId: event.userId,
      changes: changes.length
    });

    return event;
  }

  /**
   * Obtiene historial de auditoría de una entidad
   */
  async getEntityHistory(
    organizationId: string,
    entityType: EntityType,
    entityId: string
  ): Promise<AuditEvent[]> {
    return this.events.filter(
      e =>
        e.organizationId === organizationId &&
        e.entityType === entityType &&
        e.entityId === entityId
    ).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Obtiene actividad de un usuario en un período
   */
  async getUserActivity(
    organizationId: string,
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AuditEvent[]> {
    let filtered = this.events.filter(
      e => e.organizationId === organizationId && e.userId === userId
    );

    if (startDate) {
      filtered = filtered.filter(e => new Date(e.timestamp) >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(e => new Date(e.timestamp) <= endDate);
    }

    return filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Exporta reporte de auditoría
   */
  async exportAuditReport(
    organizationId: string,
    filters: {
      entityType?: EntityType;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<AuditEvent[]> {
    let filtered = this.events.filter(
      e => e.organizationId === organizationId
    );

    if (filters.entityType) {
      filtered = filtered.filter(e => e.entityType === filters.entityType);
    }

    if (filters.userId) {
      filtered = filtered.filter(e => e.userId === filters.userId);
    }

    if (filters.startDate) {
      filtered = filtered.filter(e => new Date(e.timestamp) >= filters.startDate!);
    }

    if (filters.endDate) {
      filtered = filtered.filter(e => new Date(e.timestamp) <= filters.endDate!);
    }

    return filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const auditService = new AuditService();
