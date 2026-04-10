/**
 * DataRequestQuestionnaire - Cuestionarios / solicitud de datos a responsables (Sygris Módulos 03, 04)
 * Envío de cuestionarios a responsables por sección/función
 */
import React, { useState } from 'react';
import { Send, FileQuestion, Users, CheckCircle2, Clock } from 'lucide-react';
import { StandardSection, User, Department } from '../types';

interface DataRequestQuestionnaireProps {
  sections: StandardSection[];
  users: User[];
  reportingYear: number;
  onSendRequest?: (request: DataRequest) => void;
}

export interface DataRequest {
  id: string;
  sectionIds: string[];
  department: Department;
  recipientIds: string[];
  message: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'in_progress' | 'completed';
  createdAt: string;
}

const MOCK_REQUESTS: DataRequest[] = [
  {
    id: 'req1',
    sectionIds: ['s1'],
    department: Department.ENVIRONMENT,
    recipientIds: ['u2'],
    message: 'Por favor completar datos E1 Climate Change para FY2024',
    dueDate: '2025-02-28',
    status: 'sent',
    createdAt: '2025-01-15T10:00:00Z'
  },
  {
    id: 'req2',
    sectionIds: ['s2'],
    department: Department.HR,
    recipientIds: ['u3'],
    message: 'Solicitud de datos S1 Own Workforce - diversidad y formación',
    dueDate: '2025-03-01',
    status: 'in_progress',
    createdAt: '2025-01-20T09:00:00Z'
  }
];

export const DataRequestQuestionnaire: React.FC<DataRequestQuestionnaireProps> = ({
  sections,
  users,
  reportingYear,
  onSendRequest
}) => {
  const [requests, setRequests] = useState<DataRequest[]>(MOCK_REQUESTS);
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [selectedDept, setSelectedDept] = useState<Department | ''>('');
  const [message, setMessage] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [showForm, setShowForm] = useState(false);

  const recipientsByDept = users.filter(u => u.department === selectedDept);

  const toggleSection = (id: string) => {
    const next = new Set(selectedSections);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSections(next);
  };

  const handleSend = () => {
    if (!selectedDept || selectedSections.size === 0) return;
    const req: DataRequest = {
      id: `req_${Date.now()}`,
      sectionIds: Array.from(selectedSections),
      department: selectedDept,
      recipientIds: recipientsByDept.map(u => u.id),
      message: message || 'Solicitud de datos ESG',
      dueDate,
      status: 'sent',
      createdAt: new Date().toISOString()
    };
    setRequests(prev => [req, ...prev]);
    onSendRequest?.(req);
    setShowForm(false);
    setSelectedSections(new Set());
    setSelectedDept('');
    setMessage('');
  };

  const getStatusBadge = (status: DataRequest['status']) => {
    switch (status) {
      case 'sent':
        return <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">Enviado</span>;
      case 'in_progress':
        return <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">En curso</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">Completado</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-[#2a2a2a] text-[#6a6a6a]">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#0066ff]/20 to-[#0066ff]/5 border border-[#0066ff]/30 rounded-lg p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#0066ff]/20 rounded-lg">
              <FileQuestion className="w-8 h-8 text-[#0066ff]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Cuestionarios y Solicitud de Datos</h1>
              <p className="text-sm text-[#cccccc]">
                Envía solicitudes de datos a responsables por función. Sygris Módulos 03 y 04.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Send className="w-4 h-4" />
            Nueva Solicitud
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg p-6">
          <h3 className="font-semibold text-white mb-4">Crear Solicitud de Datos</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#cccccc] mb-2">Secciones a solicitar</label>
              <div className="flex flex-wrap gap-2">
                {sections.map(s => (
                  <button
                    key={s.id}
                    onClick={() => toggleSection(s.id)}
                    className={`px-3 py-1.5 rounded border text-sm transition-colors ${
                      selectedSections.has(s.id)
                        ? 'bg-[#0066ff]/20 border-[#0066ff] text-[#0066ff]'
                        : 'bg-[#0a0a0a] border-[#2a2a2a] text-[#cccccc] hover:border-[#3a3a3a]'
                    }`}
                  >
                    {s.code}: {s.title}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-[#cccccc] mb-2">Función responsable</label>
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value as Department | '')}
                className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-white"
              >
                <option value="">Seleccionar...</option>
                {Object.values(Department).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            {selectedDept && (
              <div className="flex items-center gap-2 text-sm text-[#6a6a6a]">
                <Users className="w-4 h-4" />
                Destinatarios: {recipientsByDept.map(u => u.name).join(', ') || 'Ninguno'}
              </div>
            )}
            <div>
              <label className="block text-sm text-[#cccccc] mb-2">Mensaje</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Instrucciones para el responsable..."
                className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-white placeholder-[#6a6a6a] min-h-[80px]"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm text-[#cccccc] mb-2">Fecha límite</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-white"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSend}
                disabled={!selectedDept || selectedSections.size === 0}
                className="px-4 py-2 bg-[#0066ff] hover:bg-[#0052cc] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium"
              >
                Enviar Solicitud
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#0066ff] text-white rounded-lg font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2a2a2a]">
          <h3 className="font-semibold text-white">Solicitudes Enviadas</h3>
        </div>
        <div className="divide-y divide-[#2a2a2a]">
          {requests.length === 0 ? (
            <div className="p-8 text-center text-[#6a6a6a]">
              No hay solicitudes. Crea una nueva para enviar cuestionarios a responsables.
            </div>
          ) : (
            requests.map(req => (
              <div key={req.id} className="px-4 py-3 hover:bg-[#1a1a1a] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(req.status)}
                      <span className="text-xs text-[#6a6a6a]">{req.department}</span>
                    </div>
                    <p className="text-sm text-white">{req.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-[#6a6a6a]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(req.dueDate).toLocaleDateString('es-ES')}
                      </span>
                      <span>
                        {new Date(req.createdAt).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DataRequestQuestionnaire;
