/**
 * Cola in-memory para trabajos async (import masivo, export, IA).
 * En producción: sustituir por BullMQ / SQS / Supabase Edge cron.
 */

type JobKind = 'export' | 'import' | 'ai' | 'reminder' | 'consolidation';

export interface JobRecord<T = unknown> {
  id: string;
  kind: JobKind;
  payload: T;
  status: 'queued' | 'running' | 'done' | 'error';
  createdAt: string;
  finishedAt?: string;
  error?: string;
}

const jobs = new Map<string, JobRecord>();

function id(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const jobQueue = {
  enqueue<T>(kind: JobKind, payload: T, worker: () => void | Promise<void>): string {
    const jobId = id();
    const record: JobRecord<T> = {
      id: jobId,
      kind,
      payload,
      status: 'queued',
      createdAt: new Date().toISOString()
    };
    jobs.set(jobId, record as JobRecord);

    queueMicrotask(async () => {
      const r = jobs.get(jobId);
      if (!r) return;
      r.status = 'running';
      try {
        await worker();
        r.status = 'done';
        r.finishedAt = new Date().toISOString();
      } catch (e: any) {
        r.status = 'error';
        r.error = e?.message || String(e);
        r.finishedAt = new Date().toISOString();
      }
    });

    return jobId;
  },

  list(): JobRecord[] {
    return Array.from(jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  get(jobId: string): JobRecord | undefined {
    return jobs.get(jobId);
  }
};
