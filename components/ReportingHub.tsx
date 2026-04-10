/**
 * ReportingHub - Hub unificado de reporting (paso 4 del flujo)
 * Subapartados: Narrativa, Índice, Informe Final
 */
import React, { useState } from 'react';
import { FileBarChart, PenTool, BookOpen, FileText, Download } from 'lucide-react';
import { StandardSection } from '../types';
import {
  buildMemoryExportCsv,
  buildReportingPackJson,
  downloadJson,
  downloadMemoryCsv
} from '../services/exportMemoryReport';
import { getActiveOrganizationId, getActiveReportingCycleId } from '../services/dataPlane';
import { jobQueue } from '../services/jobQueue';
import { recordAuditEvent } from '../services/auditLogService';
import { getCurrentActorId } from '../services/dataPlane';
import NarrativeEngine from './NarrativeEngine';
import IndexComposer from './IndexComposer';
import FinalReport from './FinalReport';
import type { ReportingTab } from '../contexts/appRoutes';

const TABS: { id: ReportingTab; label: string; icon: React.ElementType }[] = [
  { id: 'narrative', label: 'Narrativa', icon: PenTool },
  { id: 'index', label: 'Índice', icon: BookOpen },
  { id: 'report', label: 'Informe Final', icon: FileText }
];

interface ReportingHubProps {
  sections: StandardSection[];
  reportingYear: number;
  activeSectionId: string;
  setActiveSectionId: (id: string) => void;
  activeTab?: ReportingTab;
  onTabChange?: (tab: ReportingTab) => void;
}

export const ReportingHub: React.FC<ReportingHubProps> = ({
  sections,
  reportingYear,
  activeSectionId,
  setActiveSectionId,
  activeTab: controlledTab,
  onTabChange,
}) => {
  const [internalTab, setInternalTab] = useState<ReportingTab>('narrative');
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = (tab: ReportingTab) => {
    onTabChange?.(tab);
    if (controlledTab === undefined) setInternalTab(tab);
  };
  const activeSection = sections.find(s => s.id === activeSectionId) || sections[0];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Cabecera */}
      <div className="flex-shrink-0 pb-4 border-b border-[#2a2a2a]">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0066ff]/20 rounded-lg">
              <FileBarChart className="w-6 h-6 text-[#0066ff]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Reporting modular</h1>
              <p className="text-sm text-[#6a6a6a]">
                Narrativa por capítulo, índice e informe final
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                jobQueue.enqueue('export', { kind: 'memory_csv', year: reportingYear }, () => {
                  const csv = buildMemoryExportCsv(sections, reportingYear);
                  downloadMemoryCsv(`nfq_memoria_FY${reportingYear}.csv`, csv);
                });
                void recordAuditEvent({
                  actorUserId: getCurrentActorId(),
                  action: 'export',
                  resourceType: 'report',
                  resourceId: `memory_${reportingYear}`,
                  details: { format: 'csv' }
                });
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-white hover:border-[#0066ff]/50"
            >
              <Download className="w-4 h-4" />
              Exportar memoria (CSV)
            </button>
            <button
              type="button"
              onClick={() => {
                const json = buildReportingPackJson(sections, reportingYear, {
                  organizationId: getActiveOrganizationId(),
                  reportingCycleId: getActiveReportingCycleId()
                });
                downloadJson(`nfq_reporting_pack_FY${reportingYear}.json`, json);
                void recordAuditEvent({
                  actorUserId: getCurrentActorId(),
                  action: 'export',
                  resourceType: 'report',
                  resourceId: `pack_${reportingYear}`,
                  details: { format: 'json' }
                });
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-white hover:border-[#0066ff]/50"
            >
              <Download className="w-4 h-4" />
              Exportar pack (JSON)
            </button>
          </div>
        </div>

        {/* Subapartados */}
        <div className="flex flex-wrap gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-[#0066ff] text-white shadow-lg shadow-[#0066ff]/20'
                  : 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#aaaaaa] hover:border-[#0066ff]/50 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Selector de sección (solo para Narrativa) */}
      {activeTab === 'narrative' && sections.length > 1 && (
        <div className="mb-4">
          <label className="text-xs text-[#6a6a6a] mr-2">Sección:</label>
          <select
            value={activeSectionId}
            onChange={e => setActiveSectionId(e.target.value)}
            className="px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-sm text-white"
          >
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.code}: {s.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Contenido */}
      <div className="flex-1 min-h-0 pt-4 overflow-auto">
        {activeTab === 'narrative' && activeSection && (
          <NarrativeEngine section={activeSection} reportingYear={reportingYear} />
        )}
        {activeTab === 'index' && (
          <IndexComposer sections={sections} />
        )}
        {activeTab === 'report' && (
          <FinalReport reportingYear={reportingYear} />
        )}
      </div>
    </div>
  );
};

export default ReportingHub;
