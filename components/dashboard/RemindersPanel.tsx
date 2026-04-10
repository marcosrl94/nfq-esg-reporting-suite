/**
 * RemindersPanel - Avisos y recordatorios configurables (Sygris Módulo 03)
 * Recordatorios por email, plazos de cierre, tareas pendientes
 */
import React, { useState } from 'react';
import { Bell, Mail, Calendar, Plus, Trash2, Check } from 'lucide-react';
import { scheduleReminder } from '../../services/reminderService';

export interface ReminderConfig {
  id: string;
  type: 'deadline' | 'email_reminder' | 'task_due';
  title: string;
  description?: string;
  dueDate?: string;
  recipient?: string;
  enabled: boolean;
  frequency?: 'once' | 'daily' | 'weekly';
}

const MOCK_REMINDERS: ReminderConfig[] = [
  {
    id: 'r1',
    type: 'deadline',
    title: 'Cierre datos ESG FY2024',
    description: 'Fecha límite para cierre de datos',
    dueDate: '2025-03-31',
    enabled: true,
    frequency: 'once'
  },
  {
    id: 'r2',
    type: 'email_reminder',
    title: 'Recordatorio semanal a responsables',
    description: 'Envío automático cada lunes',
    recipient: 'data_owners',
    enabled: true,
    frequency: 'weekly'
  },
  {
    id: 'r3',
    type: 'task_due',
    title: 'Revisión E1 Climate Change',
    description: 'Pendiente aprobación',
    dueDate: '2025-02-15',
    enabled: true,
    frequency: 'once'
  }
];

export const RemindersPanel: React.FC = () => {
  const [reminders, setReminders] = useState<ReminderConfig[]>(MOCK_REMINDERS);
  const [showAdd, setShowAdd] = useState(false);

  const toggleReminder = (id: string) => {
    setReminders(prev =>
      prev.map(r => {
        if (r.id !== id) return r;
        const next = { ...r, enabled: !r.enabled };
        if (next.enabled) {
          scheduleReminder({
            type: next.type === 'email_reminder' ? 'assignment' : 'deadline',
            userId: 'responsibles',
            message: next.title,
            dueAt: next.dueDate
          });
        }
        return next;
      })
    );
  };

  const removeReminder = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const getTypeIcon = (type: ReminderConfig['type']) => {
    switch (type) {
      case 'deadline':
        return <Calendar className="w-4 h-4 text-amber-500" />;
      case 'email_reminder':
        return <Mail className="w-4 h-4 text-blue-500" />;
      case 'task_due':
        return <Bell className="w-4 h-4 text-green-500" />;
      default:
        return <Bell className="w-4 h-4 text-[#6a6a6a]" />;
    }
  };

  const getTypeLabel = (type: ReminderConfig['type']) => {
    switch (type) {
      case 'deadline':
        return 'Plazo';
      case 'email_reminder':
        return 'Email';
      case 'task_due':
        return 'Tarea';
      default:
        return type;
    }
  };

  return (
    <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#0066ff]" />
          <h3 className="font-semibold text-white">Recordatorios y Avisos</h3>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="p-1.5 rounded hover:bg-[#2a2a2a] text-[#6a6a6a] hover:text-white transition-colors"
          title="Añadir recordatorio"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="divide-y divide-[#2a2a2a] max-h-[280px] overflow-y-auto">
        {reminders.length === 0 ? (
          <div className="p-6 text-center text-[#6a6a6a] text-sm">
            No hay recordatorios configurados. Los avisos por email se pueden configurar
            cuando se integre el servicio de notificaciones.
          </div>
        ) : (
          reminders.map(reminder => (
            <div
              key={reminder.id}
              className={`px-4 py-3 flex items-start gap-3 hover:bg-[#1a1a1a] transition-colors ${
                !reminder.enabled ? 'opacity-60' : ''
              }`}
            >
              <button
                onClick={() => toggleReminder(reminder.id)}
                className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  reminder.enabled
                    ? 'bg-[#0066ff] border-[#0066ff] text-white'
                    : 'border-[#2a2a2a] text-[#6a6a6a]'
                }`}
              >
                {reminder.enabled && <Check className="w-3 h-3" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {getTypeIcon(reminder.type)}
                  <span className="text-xs text-[#6a6a6a]">{getTypeLabel(reminder.type)}</span>
                </div>
                <p className="text-sm font-medium text-white">{reminder.title}</p>
                {reminder.description && (
                  <p className="text-xs text-[#6a6a6a] mt-0.5">{reminder.description}</p>
                )}
                {reminder.dueDate && (
                  <p className="text-xs text-amber-400/80 mt-1">
                    {new Date(reminder.dueDate).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeReminder(reminder.id)}
                className="p-1 rounded hover:bg-red-500/20 text-[#6a6a6a] hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
      {showAdd && (
        <div className="px-4 py-3 border-t border-[#2a2a2a] bg-[#0a0a0a]">
          <p className="text-xs text-[#6a6a6a] mb-2">
            La integración con servicios de email (ej. SendGrid, AWS SES) permitirá
            enviar recordatorios automáticos a responsables.
          </p>
          <button
            onClick={() => setShowAdd(false)}
            className="text-xs text-[#0066ff] hover:underline"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
};

export default RemindersPanel;
