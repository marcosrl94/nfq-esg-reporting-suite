import type { AuditLogEntry } from '../types';
import { loadAuditLog } from './auditLogService';

/**
 * Carga unificado de auditoría: local + remoto (cuando `appendAuditEventRemote` está activo).
 * Usar en vistas de gobernanza / auditor para una sola fuente de lectura.
 */
export async function loadUnifiedAuditLog(): Promise<AuditLogEntry[]> {
  return loadAuditLog();
}
