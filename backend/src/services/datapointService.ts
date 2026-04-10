/**
 * Datapoint Service - Gestión de datapoints con versionado y multi-tenancy
 */
import { ExtendedDatapoint, DatapointVersion } from '../models/ExtendedDatapoint';
import { auditService } from './auditService';
import { permissionService } from './permissionService';
import { User } from '../models/User';
import { WorkflowStatus, Department } from '../../../types';

export interface CreateDatapointParams {
  organizationId: string;
  cycleId: string;
  code: string;
  name: string;
  description?: string;
  type: 'quantitative' | 'qualitative';
  unit?: string;
  baseUnit?: string;
  department: Department;
  requirementId?: string;
  consolidationEnabled?: boolean;
  consolidationMethod?: ExtendedDatapoint['consolidationMethod'];
  ownerId: string;
}

export interface UpdateDatapointParams {
  values?: Record<string, string | number | null>;
  status?: WorkflowStatus;
  ownerId?: string;
  department?: Department;
  changeReason?: string;
}

export class DatapointService {
  private datapoints: Map<string, ExtendedDatapoint> = new Map(); // En producción, sería DB

  /**
   * Crea un nuevo datapoint
   */
  async create(params: CreateDatapointParams, user: User): Promise<ExtendedDatapoint> {
    // Verificar permisos
    const hasPermission = await permissionService.checkPermission(
      user,
      'datapoint',
      'create',
      { department: params.department }
    );

    if (!hasPermission) {
      throw new Error('No permission to create datapoint in this department');
    }

    const datapoint: ExtendedDatapoint = {
      id: this.generateId(),
      organizationId: params.organizationId,
      cycleId: params.cycleId,
      code: params.code,
      name: params.name,
      description: params.description || '',
      values: {},
      unit: params.unit,
      baseUnit: params.baseUnit || params.unit,
      type: params.type,
      status: WorkflowStatus.DRAFT,
      ownerId: params.ownerId,
      department: params.department,
      comments: [],
      consolidationEnabled: params.consolidationEnabled || false,
      consolidationMethod: params.consolidationMethod,
      version: 1,
      lastModified: new Date().toISOString()
    };

    this.datapoints.set(datapoint.id, datapoint);

    // Crear evento de auditoría
    await auditService.createEvent({
      organizationId: params.organizationId,
      entityType: 'datapoint',
      entityId: datapoint.id,
      eventType: 'created',
      userId: user.id,
      userName: user.name,
      afterState: this.serializeDatapoint(datapoint),
      metadata: { code: params.code, department: params.department }
    });

    return datapoint;
  }

  /**
   * Obtiene un datapoint por ID
   */
  async getById(
    organizationId: string,
    datapointId: string,
    userId: string
  ): Promise<ExtendedDatapoint | null> {
    const datapoint = this.datapoints.get(datapointId);

    if (!datapoint || datapoint.organizationId !== organizationId) {
      return null;
    }

    // Verificar permisos de lectura
    // (En producción, esto se haría con el usuario completo)
    // Por ahora, retornamos el datapoint

    return datapoint;
  }

  /**
   * Lista datapoints con filtros
   */
  async list(filters: {
    organizationId: string;
    cycleId?: string;
    status?: string;
    department?: string;
    standardCode?: string;
    userId: string;
  }): Promise<ExtendedDatapoint[]> {
    let datapoints = Array.from(this.datapoints.values()).filter(
      dp => dp.organizationId === filters.organizationId
    );

    if (filters.cycleId) {
      datapoints = datapoints.filter(dp => dp.cycleId === filters.cycleId);
    }

    if (filters.status) {
      datapoints = datapoints.filter(dp => dp.status === filters.status);
    }

    if (filters.department) {
      datapoints = datapoints.filter(dp => dp.department === filters.department);
    }

    // En producción, aplicar filtros de permisos aquí

    return datapoints;
  }

  /**
   * Actualiza un datapoint (crea nueva versión si es necesario)
   */
  async update(
    organizationId: string,
    datapointId: string,
    updates: UpdateDatapointParams,
    user: User
  ): Promise<ExtendedDatapoint> {
    const datapoint = await this.getById(organizationId, datapointId, user.id);

    if (!datapoint) {
      throw new Error('Datapoint not found');
    }

    // Verificar permisos
    const hasPermission = await permissionService.checkPermission(
      user,
      'datapoint',
      'update',
      { department: datapoint.department, status: datapoint.status }
    );

    if (!hasPermission) {
      throw new Error('No permission to update this datapoint');
    }

    const beforeState = this.serializeDatapoint(datapoint);

    // Determinar si necesita nueva versión
    const needsNewVersion =
      updates.values !== undefined ||
      updates.status === WorkflowStatus.APPROVED ||
      updates.status === WorkflowStatus.LOCKED;

    if (needsNewVersion && datapoint.status === WorkflowStatus.APPROVED) {
      // Crear nueva versión
      const newVersion: ExtendedDatapoint = {
        ...datapoint,
        id: this.generateId(),
        version: datapoint.version + 1,
        parentVersionId: datapoint.id,
        changeReason: updates.changeReason || 'Update after approval',
        status: updates.status ?? WorkflowStatus.DRAFT,
        values: updates.values || datapoint.values,
        lastModified: new Date().toISOString()
      };

      this.datapoints.set(newVersion.id, newVersion);

      // Auditoría
      await auditService.createEvent({
        organizationId,
        entityType: 'datapoint',
        entityId: newVersion.id,
        eventType: 'updated',
        userId: user.id,
        userName: user.name,
        beforeState,
        afterState: this.serializeDatapoint(newVersion),
        metadata: {
          version: newVersion.version,
          parentVersionId: datapoint.id,
          changeReason: newVersion.changeReason
        }
      });

      return newVersion;
    } else {
      // Actualización normal
      const updated: ExtendedDatapoint = {
        ...datapoint,
        ...updates,
        lastModified: new Date().toISOString()
      };

      this.datapoints.set(datapointId, updated);

      // Auditoría
      await auditService.createEvent({
        organizationId,
        entityType: 'datapoint',
        entityId: datapointId,
        eventType: 'updated',
        userId: user.id,
        userName: user.name,
        beforeState,
        afterState: this.serializeDatapoint(updated),
        metadata: updates.changeReason ? { changeReason: updates.changeReason } : {}
      });

      return updated;
    }
  }

  /**
   * Aprueba un datapoint
   */
  async approve(
    organizationId: string,
    datapointId: string,
    userId: string,
    comments?: string
  ): Promise<ExtendedDatapoint> {
    // Implementación similar a update pero con validaciones específicas
    const datapoint = await this.getById(organizationId, datapointId, userId);
    
    if (!datapoint) {
      throw new Error('Datapoint not found');
    }

    const beforeState = this.serializeDatapoint(datapoint);
    const updated: ExtendedDatapoint = {
      ...datapoint,
      status: WorkflowStatus.APPROVED,
      lastModified: new Date().toISOString()
    };

    this.datapoints.set(datapointId, updated);

    await auditService.createEvent({
      organizationId,
      entityType: 'datapoint',
      entityId: datapointId,
      eventType: 'approved',
      userId,
      userName: 'User', // En producción, obtener del usuario
      beforeState,
      afterState: this.serializeDatapoint(updated),
      metadata: { approvalComments: comments }
    });

    return updated;
  }

  private serializeDatapoint(datapoint: ExtendedDatapoint): Record<string, any> {
    return {
      id: datapoint.id,
      code: datapoint.code,
      name: datapoint.name,
      values: datapoint.values,
      status: datapoint.status,
      version: datapoint.version,
      department: datapoint.department
    };
  }

  private generateId(): string {
    return `dp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const datapointService = new DatapointService();
