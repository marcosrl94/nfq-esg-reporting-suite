/**
 * Permission Service - Verificación de permisos RBAC
 */
import { User, Permission } from '../models/User';
import { ROLE_DEFINITIONS } from '../models/User';

export interface PermissionContext {
  organizationId?: string;
  department?: string;
  status?: string;
  cycleId?: string;
  userId?: string;
  [key: string]: any;
}

export class PermissionService {
  /**
   * Verifica si un usuario tiene permiso para una acción en un recurso
   */
  async checkPermission(
    user: User,
    resource: Permission['resource'],
    action: Permission['actions'][number],
    context: PermissionContext = {}
  ): Promise<boolean> {
    // Obtener definición de rol
    const roleDefinition = ROLE_DEFINITIONS[user.role];
    
    if (!roleDefinition) {
      return false;
    }

    // Buscar permiso que coincida con el recurso y acción
    const permission = roleDefinition.permissions.find(
      p => p.resource === resource && p.actions.includes(action)
    );

    if (!permission) {
      return false;
    }

    // Verificar condiciones si existen
    if (permission.conditions) {
      return this.checkConditions(permission.conditions, user, context);
    }

    return true;
  }

  /**
   * Verifica condiciones de un permiso
   */
  private checkConditions(
    conditions: NonNullable<Permission['conditions']>,
    user: User,
    context: PermissionContext
  ): boolean {
    // Verificar departamento
    if (conditions.department) {
      const allowedDepartments = conditions.department.map(dept => 
        dept === '$user.department' ? user.department : dept
      );
      
      if (!allowedDepartments.includes(context.department || user.department)) {
        return false;
      }
    }

    // Verificar estado
    if (conditions.status && context.status) {
      if (!conditions.status.includes(context.status)) {
        return false;
      }
    }

    // Verificar ciclo
    if (conditions.cycleId && context.cycleId) {
      if (!conditions.cycleId.includes(context.cycleId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Obtiene todos los permisos de un usuario
   */
  getUserPermissions(user: User): Permission[] {
    const roleDefinition = ROLE_DEFINITIONS[user.role];
    return roleDefinition?.permissions || [];
  }

  /**
   * Verifica si un usuario puede realizar múltiples acciones
   */
  async checkMultiplePermissions(
    user: User,
    checks: Array<{ resource: Permission['resource']; action: Permission['actions'][number] }>,
    context: PermissionContext = {}
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    await Promise.all(
      checks.map(async ({ resource, action }) => {
        const key = `${resource}:${action}`;
        results[key] = await this.checkPermission(user, resource, action, context);
      })
    );

    return results;
  }
}

export const permissionService = new PermissionService();
