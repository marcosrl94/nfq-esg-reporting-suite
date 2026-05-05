/**
 * Audit Middleware - Captura automática de eventos de auditoría
 */
import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/auditService';
import { EntityType, EventType } from '../models/AuditEvent';

declare global {
  namespace Express {
    interface Request {
      auditContext?: {
        beforeState?: Record<string, any>;
        afterState?: Record<string, any>;
        changes?: any[];
      };
    }
  }
}

/**
 * Middleware de auditoría que captura eventos automáticamente
 */
export function auditMiddleware(entityType: EntityType, eventType: EventType) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Capturar estado antes si está disponible
    const beforeState = req.auditContext?.beforeState || null;

    // Interceptar respuesta para capturar estado después
    const originalJson = res.json.bind(res);
    
    res.json = function(body: any): Response {
      const afterState = req.auditContext?.afterState || body;

      // Crear evento de auditoría de forma asíncrona (no bloquear respuesta)
      if (req.user) {
        auditService.createEvent({
          organizationId: req.user.organizationId,
          entityType,
          entityId: req.params.id || body.id || 'unknown',
          eventType,
          userId: req.user.id,
          userName: req.user.name,
          beforeState,
          afterState: typeof afterState === 'object' ? afterState : { data: afterState },
          metadata: {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            reason: req.body.reason || req.body.comments || req.body.changeReason,
            method: req.method,
            path: req.path
          }
        }).catch(err => {
          console.error('[AUDIT ERROR] Failed to create audit event:', err);
          // No fallar la request si falla la auditoría
        });
      }

      return originalJson(body);
    };

    next();
  };
}
