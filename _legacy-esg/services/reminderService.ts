import { jobQueue } from './jobQueue';

export interface ReminderPayload {
  type: 'deadline' | 'assignment';
  userId: string;
  message: string;
  datapointId?: string;
  dueAt?: string;
}

/**
 * Encola recordatorios (email real vía worker / SendGrid en producción).
 * Aquí: solo cola + log para trazabilidad.
 */
export function scheduleReminder(payload: ReminderPayload): string {
  return jobQueue.enqueue('reminder', payload, () => {
    console.info('[Reminder]', payload.message, payload.userId);
  });
}
