import {
  User,
  StandardSection,
  Datapoint,
  Comment,
  EvidenceFile,
  AuditLogEntry,
  ReportingFrequency
} from '../types';
import {
  getActiveOrganizationId,
  resolveOrganizationIdForApi,
  resolveReportingCycleIdForApi
} from './dataPlane';

// ============================================
// CONFIGURATION
// ============================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured (must be a real boolean — React Query `enabled` rejects truthy strings)
const isSupabaseConfigured = (): boolean => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
};

// ============================================
// ERROR HANDLING
// ============================================

export class ApiServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ApiServiceError';
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const handleResponse = async (response: Response): Promise<any> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiServiceError(
      error.message || `HTTP ${response.status}`,
      'HTTP_ERROR',
      response.status
    );
  }
  return response.json();
};

let accessTokenOverride: string | null = null;

/** Usar sesión Supabase (JWT usuario) para RLS; si no, anon key. */
export function setApiAccessToken(token: string | null): void {
  accessTokenOverride = token;
}

const getHeaders = () => {
  const bearer = accessTokenOverride || SUPABASE_ANON_KEY;
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${bearer}`
  };
  const org = getActiveOrganizationId();
  if (org && org !== 'default-org') {
    h['x-organization-id'] = org;
  }
  return h;
};

function mapRowToDatapoint(dp: any, comments: any[]): Datapoint {
  return {
    id: dp.id,
    code: dp.code,
    name: dp.name,
    description: dp.description,
    values: dp.values || {},
    unit: dp.unit,
    type: dp.type,
    status: dp.status,
    ownerId: dp.owner_id,
    department: dp.department,
    lastModified: dp.updated_at,
    evidence: dp.evidence || [],
    comments: comments.map((c: any) => ({
      id: c.id,
      userId: c.user_id,
      userName: c.user_name || 'Unknown',
      text: c.text,
      timestamp: c.created_at
    })),
    mappings: dp.mappings || {},
    aiVerification: dp.ai_verification || undefined,
    ...(dp.consolidation_enabled !== undefined
      ? {
          consolidationEnabled: dp.consolidation_enabled,
          consolidationMethod: dp.consolidation_method,
          sources: dp.consolidation_sources || [],
          consolidatedValue: dp.consolidated_value || {},
          breakdowns: dp.breakdowns || [],
          lastConsolidated: dp.last_consolidated
        }
      : {}),
    reportingFrequency: (dp.reporting_frequency as ReportingFrequency) || 'annual',
    assignedToUserId: dp.assigned_to_user_id || undefined
  } as Datapoint;
}

// ============================================
// USERS API
// ============================================

export const fetchUsers = async (): Promise<User[]> => {
  if (!isSupabaseConfigured()) {
    throw new ApiServiceError('Supabase not configured', 'CONFIG_ERROR');
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=*`, {
    headers: getHeaders()
  });

  const data = await handleResponse(response);
  return data.map((u: any) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    department: u.department,
    avatar: u.avatar || u.name.substring(0, 2).toUpperCase(),
    organizationId: u.organization_id ? String(u.organization_id) : undefined,
    email: u.email ? String(u.email) : undefined
  }));
};

export const createUser = async (user: Omit<User, 'id'>): Promise<User> => {
  if (!isSupabaseConfigured()) {
    throw new ApiServiceError('Supabase not configured', 'CONFIG_ERROR');
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(user)
  });

  const data = await handleResponse(response);
  return {
    id: data.id,
    name: data.name,
    role: data.role,
    department: data.department,
    avatar: data.avatar || data.name.substring(0, 2).toUpperCase()
  };
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<User> => {
  if (!isSupabaseConfigured()) {
    throw new ApiServiceError('Supabase not configured', 'CONFIG_ERROR');
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });

  const data = await handleResponse(response);
  return data[0];
};

// ============================================
// SECTIONS & DATAPOINTS API
// ============================================

const DEFAULT_FETCH_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      reject(new ApiServiceError(`${label}: tiempo de espera (${ms}ms)`, 'TIMEOUT'));
    }, ms);
    promise.then(
      v => {
        clearTimeout(id);
        resolve(v);
      },
      e => {
        clearTimeout(id);
        reject(e);
      }
    );
  });
}

async function fetchSectionsImpl(): Promise<StandardSection[]> {
  const orgScoped =
    import.meta.env.VITE_ENABLE_ORG_FILTER === 'true'
      ? `&organization_id=eq.${encodeURIComponent(getActiveOrganizationId())}`
      : '';

  const sectionsResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/standards?select=*${orgScoped}`,
    {
      headers: getHeaders()
    }
  );
  const sections = await handleResponse(sectionsResponse);

  const sectionsWithDatapoints = await Promise.all(
    sections.map(async (section: any) => {
      const datapointsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/datapoints?standard_id=eq.${section.id}&select=*`,
        { headers: getHeaders() }
      );
      const datapoints = await handleResponse(datapointsResponse);

      const datapointsWithComments = await Promise.all(
        datapoints.map(async (dp: any) => {
          const commentsResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/comments?datapoint_id=eq.${dp.id}&select=*`,
            { headers: getHeaders() }
          );
          const comments = await handleResponse(commentsResponse);

          return mapRowToDatapoint(dp, comments);
        })
      );

      return {
        id: section.id,
        code: section.code,
        title: section.title,
        datapoints: datapointsWithComments
      };
    })
  );

  return sectionsWithDatapoints;
}

function parseDatapointFromRpc(dp: any): Datapoint {
  const cm = Array.isArray(dp.comments) ? dp.comments : [];
  const { comments: _drop, ...rest } = dp;
  return mapRowToDatapoint(rest, cm);
}

async function fetchSectionsRpcImpl(): Promise<StandardSection[]> {
  const cycleId = resolveReportingCycleIdForApi();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_reporting_pack`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      p_organization_id: resolveOrganizationIdForApi(),
      p_reporting_cycle_id: cycleId && /^[0-9a-f-]{36}$/i.test(cycleId) ? cycleId : null
    })
  });
  const raw = await handleResponse(response);
  const rows = Array.isArray(raw) ? raw : [];
  return rows.map((section: any) => ({
    id: section.id,
    code: section.code,
    title: section.title,
    datapoints: (section.datapoints || []).map(parseDatapointFromRpc)
  }));
}

export const fetchSections = async (): Promise<StandardSection[]> => {
  if (!isSupabaseConfigured()) {
    throw new ApiServiceError('Supabase not configured', 'CONFIG_ERROR');
  }

  const ms = Number(import.meta.env.VITE_API_FETCH_TIMEOUT_MS) || DEFAULT_FETCH_TIMEOUT_MS;
  if (import.meta.env.VITE_USE_REPORTING_PACK_RPC === 'true') {
    return withTimeout(fetchSectionsRpcImpl(), ms, 'fetchSectionsRpc');
  }
  return withTimeout(fetchSectionsImpl(), ms, 'fetchSections');
};

export const updateDatapoint = async (
  datapointId: string,
  updates: Partial<Datapoint>
): Promise<Datapoint> => {
  if (!isSupabaseConfigured()) {
    throw new ApiServiceError('Supabase not configured', 'CONFIG_ERROR');
  }

  // Transform updates to match database schema
  const dbUpdates: any = {
    updated_at: new Date().toISOString()
  };

  if (updates.values !== undefined) dbUpdates.values = updates.values;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.ownerId !== undefined) dbUpdates.owner_id = updates.ownerId;
  if (updates.evidence !== undefined) dbUpdates.evidence = updates.evidence;
  if (updates.mappings !== undefined) dbUpdates.mappings = updates.mappings;
  if (updates.aiVerification !== undefined) dbUpdates.ai_verification = updates.aiVerification;
  if (updates.consolidationEnabled !== undefined) dbUpdates.consolidation_enabled = updates.consolidationEnabled;
  if (updates.consolidationMethod !== undefined) dbUpdates.consolidation_method = updates.consolidationMethod;
  if (updates.sources !== undefined) dbUpdates.consolidation_sources = updates.sources;
  if (updates.consolidatedValue !== undefined) dbUpdates.consolidated_value = updates.consolidatedValue;
  if (updates.breakdowns !== undefined) dbUpdates.breakdowns = updates.breakdowns;
  if (updates.lastConsolidated !== undefined) dbUpdates.last_consolidated = updates.lastConsolidated;
  if (updates.reportingFrequency !== undefined)
    dbUpdates.reporting_frequency = updates.reportingFrequency;
  if (updates.assignedToUserId !== undefined)
    dbUpdates.assigned_to_user_id = updates.assignedToUserId;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/datapoints?id=eq.${datapointId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(dbUpdates)
  });

  const data = await handleResponse(response);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return updates as unknown as Datapoint;
  return mapRowToDatapoint(row, []);
};

export const addComment = async (
  datapointId: string,
  comment: Omit<Comment, 'id' | 'timestamp'>
): Promise<Comment> => {
  if (!isSupabaseConfigured()) {
    throw new ApiServiceError('Supabase not configured', 'CONFIG_ERROR');
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      datapoint_id: datapointId,
      user_id: comment.userId,
      user_name: comment.userName,
      text: comment.text,
      created_at: new Date().toISOString()
    })
  });

  const data = await handleResponse(response);
  return {
    id: data.id,
    userId: data.user_id,
    userName: data.user_name,
    text: data.text,
    timestamp: data.created_at
  };
};

// ============================================
// EVIDENCE FILES API
// ============================================

export const uploadEvidenceFile = async (
  file: File,
  datapointId: string,
  userId: string
): Promise<EvidenceFile> => {
  if (!isSupabaseConfigured()) {
    throw new ApiServiceError('Supabase not configured', 'CONFIG_ERROR');
  }

  // Upload file to Supabase Storage
  const fileName = `${datapointId}/${Date.now()}_${file.name}`;
  const filePath = `evidence/${fileName}`;

  // First, upload the file to storage
  const formData = new FormData();
  formData.append('file', file);

  const uploadResponse = await fetch(
    `${SUPABASE_URL}/storage/v1/object/evidence/${fileName}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: formData
    }
  );

  if (!uploadResponse.ok) {
    throw new ApiServiceError('Failed to upload file', 'UPLOAD_ERROR', uploadResponse.status);
  }

  // Then, create the database record
  const dbResponse = await fetch(`${SUPABASE_URL}/rest/v1/evidence_files`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      datapoint_id: datapointId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: userId,
      created_at: new Date().toISOString()
    })
  });

  const data = await handleResponse(dbResponse);
  return {
    id: data.id,
    datapointId: data.datapoint_id,
    sourceId: data.source_id,
    fileName: data.file_name,
    filePath: data.file_path,
    fileSize: data.file_size,
    mimeType: data.mime_type,
    uploadedBy: data.uploaded_by,
    uploadedAt: data.created_at,
    extractedData: data.extracted_data,
    aiAnalysis: data.ai_analysis,
    hierarchy: data.hierarchy
  };
};

export const fetchEvidenceFiles = async (datapointId: string): Promise<EvidenceFile[]> => {
  if (!isSupabaseConfigured()) {
    throw new ApiServiceError('Supabase not configured', 'CONFIG_ERROR');
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/evidence_files?datapoint_id=eq.${datapointId}&select=*`,
    { headers: getHeaders() }
  );

  const data = await handleResponse(response);
  return data.map((ef: any) => ({
    id: ef.id,
    datapointId: ef.datapoint_id,
    sourceId: ef.source_id,
    fileName: ef.file_name,
    filePath: ef.file_path,
    fileSize: ef.file_size,
    mimeType: ef.mime_type,
    uploadedBy: ef.uploaded_by,
    uploadedAt: ef.created_at,
    extractedData: ef.extracted_data,
    aiAnalysis: ef.ai_analysis,
    hierarchy: ef.hierarchy
  }));
};

export const downloadEvidenceFile = async (evidenceFile: EvidenceFile): Promise<Blob> => {
  if (!isSupabaseConfigured() || !evidenceFile.filePath) {
    throw new ApiServiceError('Supabase not configured or file path missing', 'CONFIG_ERROR');
  }

  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/public/evidence/${evidenceFile.filePath.replace('evidence/', '')}`,
    {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    }
  );

  if (!response.ok) {
    throw new ApiServiceError('Failed to download file', 'DOWNLOAD_ERROR', response.status);
  }

  return response.blob();
};

export const updateEvidenceFile = async (
  evidenceId: string,
  updates: Partial<EvidenceFile>
): Promise<EvidenceFile> => {
  if (!isSupabaseConfigured()) {
    throw new ApiServiceError('Supabase not configured', 'CONFIG_ERROR');
  }

  const dbUpdates: any = {
    updated_at: new Date().toISOString()
  };

  if (updates.extractedData !== undefined) dbUpdates.extracted_data = updates.extractedData;
  if (updates.aiAnalysis !== undefined) dbUpdates.ai_analysis = updates.aiAnalysis;
  if (updates.sourceId !== undefined) dbUpdates.source_id = updates.sourceId;
  if (updates.hierarchy !== undefined) dbUpdates.hierarchy = updates.hierarchy;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/evidence_files?id=eq.${evidenceId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(dbUpdates)
  });

  const data = await handleResponse(response);
  return data[0];
};

export const deleteEvidenceFile = async (evidenceId: string): Promise<void> => {
  if (!isSupabaseConfigured()) {
    throw new ApiServiceError('Supabase not configured', 'CONFIG_ERROR');
  }

  // First, get the file path
  const getResponse = await fetch(`${SUPABASE_URL}/rest/v1/evidence_files?id=eq.${evidenceId}&select=file_path`, {
    headers: getHeaders()
  });
  const fileData = await handleResponse(getResponse);
  
  if (fileData.length > 0 && fileData[0].file_path) {
    // Delete from storage
    const fileName = fileData[0].file_path.replace('evidence/', '');
    await fetch(
      `${SUPABASE_URL}/storage/v1/object/evidence/${fileName}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        }
      }
    );
  }

  // Delete database record
  await fetch(`${SUPABASE_URL}/rest/v1/evidence_files?id=eq.${evidenceId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const isApiConfigured = (): boolean => {
  return isSupabaseConfigured();
};

export const getApiStatus = (): { configured: boolean; url?: string } => {
  return {
    configured: isSupabaseConfigured(),
    url: SUPABASE_URL || undefined
  };
};

// ============================================
// AUDIT (tabla audit_logs unificada — migración 005)
// ============================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function appendAuditEventRemote(entry: AuditLogEntry): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const orgId = resolveOrganizationIdForApi();
  const body: Record<string, unknown> = {
    organization_id: UUID_RE.test(entry.organizationId) ? entry.organizationId : orgId,
    action: String(entry.action).slice(0, 50),
    resource_type: entry.resourceType,
    resource_target_id: entry.resourceId,
    actor_display_name: entry.actorName,
    metadata: {
      ...(entry.details ?? {}),
      client_event_id: entry.id,
      client_timestamp: entry.timestamp
    }
  };

  if (UUID_RE.test(entry.actorUserId)) {
    body.user_id = entry.actorUserId;
  }

  if (entry.resourceType === 'datapoint' && UUID_RE.test(entry.resourceId)) {
    body.datapoint_id = entry.resourceId;
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs`, {
    method: 'POST',
    headers: { ...getHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || 'audit_logs insert failed');
  }
}

export async function fetchAuditEventsRemote(): Promise<AuditLogEntry[]> {
  if (!isSupabaseConfigured()) return [];

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/audit_logs?select=*&order=created_at.desc&limit=500`,
    { headers: getHeaders() }
  );

  if (!response.ok) return [];

  const data = await response.json();
  return (data as any[]).map(row => {
    const meta = (row.metadata || {}) as Record<string, unknown>;
    return {
      id: String(meta.client_event_id || row.id),
      organizationId: String(row.organization_id || ''),
      timestamp: row.created_at || new Date().toISOString(),
      actorUserId: row.user_id ? String(row.user_id) : String(row.actor_display_name || 'unknown'),
      actorName: row.actor_display_name,
      action: (row.action as AuditLogEntry['action']) || 'update',
      resourceType: (row.resource_type as AuditLogEntry['resourceType']) || 'datapoint',
      resourceId: String(row.resource_target_id || row.datapoint_id || ''),
      details: meta as Record<string, unknown>
    };
  });
}
