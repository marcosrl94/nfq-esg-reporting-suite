import { AuditLogEntry } from '../types';
import { isApiConfigured } from './apiService';
import { appendAuditEventRemote, fetchAuditEventsRemote } from './apiService';
import { getActiveOrganizationId } from './dataPlane';

const LS_KEY = 'nfq_audit_log_v1';

function readLocal(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AuditLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(entries: AuditLogEntry[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(entries.slice(-2000)));
  } catch {
    /* ignore */
  }
}

export async function recordAuditEvent(
  partial: Omit<AuditLogEntry, 'id' | 'timestamp' | 'organizationId'>
): Promise<void> {
  const entry: AuditLogEntry = {
    ...partial,
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
    organizationId: getActiveOrganizationId()
  };

  const local = readLocal();
  local.push(entry);
  writeLocal(local);

  if (isApiConfigured()) {
    try {
      await appendAuditEventRemote(entry);
    } catch {
      /* remoto opcional si tabla no existe */
    }
  }
}

export async function loadAuditLog(): Promise<AuditLogEntry[]> {
  const local = readLocal();
  if (isApiConfigured()) {
    try {
      const remote = await fetchAuditEventsRemote();
      const merged = [...remote, ...local];
      const byId = new Map<string, AuditLogEntry>();
      merged.forEach(e => byId.set(e.id, e));
      return Array.from(byId.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch {
      /* fall back */
    }
  }
  return local.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
