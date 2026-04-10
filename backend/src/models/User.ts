/**
 * User Model - Extendido con RBAC
 */
import { Role, Department } from '../../../types';

export interface User {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: Role;
  department: Department;
  permissions?: Permission[]; // Permisos granulares
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  resource: 'datapoint' | 'evidence' | 'consolidation' | 'report' | 'user' | 'organization';
  actions: ('create' | 'read' | 'update' | 'delete' | 'approve' | 'export')[];
  conditions?: {
    department?: string[];
    status?: string[];
    cycleId?: string[];
  };
}

export interface RoleDefinition {
  name: Role;
  permissions: Permission[];
}

// Definiciones de roles predefinidos (valores alineados con enum Role en types.ts)
export const ROLE_DEFINITIONS: Record<Role, RoleDefinition> = {
  [Role.ADMIN]: {
    name: Role.ADMIN,
    permissions: [
      { 
        resource: 'datapoint', 
        actions: ['create', 'read', 'update', 'delete', 'approve'] 
      },
      { 
        resource: 'evidence', 
        actions: ['create', 'read', 'update', 'delete'] 
      },
      { 
        resource: 'consolidation', 
        actions: ['create', 'read', 'update', 'approve'] 
      },
      { 
        resource: 'report', 
        actions: ['create', 'read', 'export'] 
      },
      { 
        resource: 'user', 
        actions: ['read', 'update'] 
      },
      { 
        resource: 'organization', 
        actions: ['read', 'update'] 
      }
    ]
  },
  [Role.EDITOR]: {
    name: Role.EDITOR,
    permissions: [
      { 
        resource: 'datapoint', 
        actions: ['create', 'read', 'update'],
        conditions: { department: ['$user.department'] }
      },
      { 
        resource: 'evidence', 
        actions: ['create', 'read', 'update'],
        conditions: { department: ['$user.department'] }
      }
    ]
  },
  [Role.VIEWER]: {
    name: Role.VIEWER,
    permissions: [
      { 
        resource: 'datapoint', 
        actions: ['read'],
        conditions: { status: ['Approved', 'Locked'] }
      },
      { 
        resource: 'evidence', 
        actions: ['read'],
        conditions: { status: ['Approved', 'Locked'] }
      },
      { 
        resource: 'report', 
        actions: ['read', 'export'] 
      }
    ]
  }
};
