/**
 * AuditorView - Interfaz específica para usuarios tipo Auditor (Sygris Módulo 09)
 * Enfocada en evidencias, trazabilidad y verificación sin capacidad de edición
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  FileCheck,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Calendar
} from 'lucide-react';
import { StandardSection, User as UserType, WorkflowStatus, AuditLogEntry } from '../types';
import { loadUnifiedAuditLog } from '../services/auditPipeline';

interface AuditorViewProps {
  sections: StandardSection[];
  currentUser: UserType;
  reportingYear: number;
}

export const AuditorView: React.FC<AuditorViewProps> = ({
  sections,
  currentUser,
  reportingYear
}) => {
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  const [filterEvidence, setFilterEvidence] = useState<'all' | 'with' | 'without'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [mainTab, setMainTab] = useState<'evidence' | 'audit'>('evidence');
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    void loadUnifiedAuditLog().then(setAuditLog);
  }, [sections]);

  const approvedSections = useMemo(() => {
    return sections
      .map(s => ({
        ...s,
        datapoints: s.datapoints.filter(
          dp => dp.status === WorkflowStatus.APPROVED || dp.status === WorkflowStatus.LOCKED
        )
      }))
      .filter(s => s.datapoints.length > 0);
  }, [sections]);

  const datapointsWithEvidence = useMemo(() => {
    const all: Array<{ section: StandardSection; dp: typeof sections[0]['datapoints'][0] }> = [];
    approvedSections.forEach(section => {
      section.datapoints.forEach(dp => {
        if (dp.evidence && dp.evidence.length > 0) {
          all.push({ section, dp });
        }
      });
    });
    return all;
  }, [approvedSections]);

  const datapointsWithoutEvidence = useMemo(() => {
    const all: Array<{ section: StandardSection; dp: typeof sections[0]['datapoints'][0] }> = [];
    approvedSections.forEach(section => {
      section.datapoints.forEach(dp => {
        if (!dp.evidence || dp.evidence.length === 0) {
          all.push({ section, dp });
        }
      });
    });
    return all;
  }, [approvedSections]);

  const filteredEvidenceList = useMemo(() => {
    let list = filterEvidence === 'with' ? datapointsWithEvidence
      : filterEvidence === 'without' ? datapointsWithoutEvidence
      : [...datapointsWithEvidence, ...datapointsWithoutEvidence];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        ({ section, dp }) =>
          section.code.toLowerCase().includes(q) ||
          section.title.toLowerCase().includes(q) ||
          dp.code.toLowerCase().includes(q) ||
          dp.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [filterEvidence, datapointsWithEvidence, datapointsWithoutEvidence, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header Auditor */}
      <div className="bg-gradient-to-r from-amber-900/30 to-amber-800/10 border border-amber-500/40 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-500/20 rounded-lg">
            <ShieldCheck className="w-8 h-8 text-amber-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              Vista de Auditoría
              <span className="text-xs font-normal px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                Solo lectura
              </span>
            </h1>
            <p className="text-sm text-[#cccccc]">
              Revisión de evidencias, trazabilidad y datos aprobados. Sin capacidad de edición.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-[#2a2a2a] pb-2">
        <button
          type="button"
          onClick={() => setMainTab('evidence')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            mainTab === 'evidence'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-[#6a6a6a] hover:text-white'
          }`}
        >
          Evidencias
        </button>
        <button
          type="button"
          onClick={() => setMainTab('audit')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            mainTab === 'audit'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-[#6a6a6a] hover:text-white'
          }`}
        >
          Pista de auditoría
        </button>
      </div>

      {mainTab === 'audit' && (
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2a2a2a]">
            <h2 className="font-semibold text-white text-sm">Eventos recientes (solo lectura)</h2>
            <p className="text-xs text-[#6a6a6a] mt-1">
              {auditLog.length} eventos · local + servidor si está configurado
            </p>
          </div>
          <div className="max-h-[420px] overflow-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-[#0a0a0a] text-[#6a6a6a] sticky top-0">
                <tr>
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Acción</th>
                  <th className="p-2">Recurso</th>
                  <th className="p-2">Id</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map(e => (
                  <tr key={e.id} className="border-t border-[#2a2a2a]">
                    <td className="p-2 text-[#aaaaaa] whitespace-nowrap">
                      {new Date(e.timestamp).toLocaleString('es-ES')}
                    </td>
                    <td className="p-2 text-amber-200/90">{e.action}</td>
                    <td className="p-2">{e.resourceType}</td>
                    <td className="p-2 font-mono text-[#6a6a6a]">{e.resourceId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {auditLog.length === 0 && (
              <p className="p-6 text-center text-[#6a6a6a]">Sin eventos aún.</p>
            )}
          </div>
        </div>
      )}

      {mainTab === 'evidence' && (
        <>
      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <p className="text-xs text-[#6a6a6a] mb-1">Datapoints aprobados</p>
          <p className="text-2xl font-bold text-white">
            {approvedSections.reduce((s, sec) => s + sec.datapoints.length, 0)}
          </p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <p className="text-xs text-[#6a6a6a] mb-1">Con evidencias</p>
          <p className="text-2xl font-bold text-green-500">{datapointsWithEvidence.length}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <p className="text-xs text-[#6a6a6a] mb-1">Sin evidencias</p>
          <p className="text-2xl font-bold text-amber-500">{datapointsWithoutEvidence.length}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <p className="text-xs text-[#6a6a6a] mb-1">Secciones</p>
          <p className="text-2xl font-bold text-white">{approvedSections.length}</p>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6a6a]" />
          <input
            type="text"
            placeholder="Buscar por sección o indicador..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white placeholder-[#6a6a6a] focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'with', 'without'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterEvidence(f)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                filterEvidence === f
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                  : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#cccccc] hover:border-[#3a3a3a]'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'with' ? 'Con evidencias' : 'Sin evidencias'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de evidencias y trazabilidad */}
      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold text-white">Evidencias y Trazabilidad</h2>
        </div>
        <div className="divide-y divide-[#2a2a2a] max-h-[500px] overflow-y-auto">
          {filteredEvidenceList.length === 0 ? (
            <div className="p-8 text-center text-[#6a6a6a]">
              No hay datapoints que coincidan con los filtros.
            </div>
          ) : (
            filteredEvidenceList.map(({ section, dp }) => {
              const hasEvidence = dp.evidence && dp.evidence.length > 0;
              return (
                <div
                  key={dp.id}
                  className="px-4 py-3 hover:bg-[#1a1a1a] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {hasEvidence ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-[#6a6a6a]">{section.code}</span>
                        <span className="text-xs font-mono text-amber-400/80">{dp.code}</span>
                        <span className="text-sm font-medium text-white">{dp.name}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#6a6a6a]">
                        <span className="flex items-center gap-1">
                          <span>Valor:</span>
                          <span className="text-white">
                            {dp.values[reportingYear.toString()] ?? '—'} {dp.unit || ''}
                          </span>
                        </span>
                        {dp.lastModified && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(dp.lastModified).toLocaleDateString('es-ES')}
                          </span>
                        )}
                      </div>
                      {hasEvidence && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {dp.evidence!.map((ev, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400"
                            >
                              <FileCheck className="w-3 h-3" />
                              {typeof ev === 'string' ? ev : ev}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Vista por sección expandible */}
      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-2">
          <Eye className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold text-white">Datos por Sección ESRS</h2>
        </div>
        <div className="divide-y divide-[#2a2a2a]">
          {approvedSections.map(section => {
            const isExpanded = expandedSectionId === section.id;
            return (
              <div key={section.id}>
                <button
                  onClick={() => setExpandedSectionId(isExpanded ? null : section.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#1a1a1a] transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-[#6a6a6a]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#6a6a6a]" />
                    )}
                    <span className="font-mono text-amber-400/80">{section.code}</span>
                    <span className="text-white font-medium">{section.title}</span>
                    <span className="text-xs text-[#6a6a6a]">
                      ({section.datapoints.length} indicadores)
                    </span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 bg-[#0a0a0a]/50">
                    <div className="space-y-2">
                      {section.datapoints.map(dp => (
                        <div
                          key={dp.id}
                          className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]"
                        >
                          <div>
                            <span className="font-mono text-xs text-[#6a6a6a]">{dp.code}</span>
                            <span className="ml-2 text-white">{dp.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-white">
                              {dp.values[reportingYear.toString()] ?? '—'} {dp.unit || ''}
                            </span>
                            {dp.evidence && dp.evidence.length > 0 ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default AuditorView;
