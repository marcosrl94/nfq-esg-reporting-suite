/**
 * Authorization Middleware - RBAC
 */
import { Request, Response, NextFunction } from 'express';
import { permissionService } from '../services/permissionService';
import { AuthenticatedUser } from './auth';
import { User } from '../models/User';

type Resource = 'datapoint' | 'evidence' | 'consolidation' | 'report' | 'user' | 'organization';
type Action = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export';

/**
 * Middleware de autorización
 */
export function authorize(resource: Resource, action: Action) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Convertir AuthenticatedUser a User
      const userModel: User = {
        id: user.id,
        organizationId: user.organizationId,
        email: user.email,
        name: user.name,
        role: user.role as any,
        department: user.department as any,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Construir contexto de permisos
      const context = {
        organizationId: user.organizationId,
        department: req.body.department || req.query.department,
        status: req.body.status || req.query.status,
        cycleId: req.body.cycleId || req.query.cycleId,
        userId: user.id
      };

      // Verificar permiso
      const hasPermission = await permissionService.checkPermission(
        userModel,
        resource,
        action,
        context
      );

      if (!hasPermission) {
        res.status(403).json({
          error: 'Forbidden',
          message: `User does not have permission to ${action} ${resource}`,
          required: { resource, action },
          user: { role: user.role, department: user.department }
        });
        return;
      }

      next();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
