/**
 * DataHub - Hub unificado de gestión de datos (modelo Sygris)
 * Indicadores ESG, Cuestionarios, Carga masiva, Conexiones ERP/Compras
 */
import React, { useState } from 'react';
import { Database, BarChart3, FileQuestion, UploadCloud, Plug } from 'lucide-react';
import { StandardSection, User } from '../types';
import DataView from './DataView';
import DataRequestQuestionnaire from './DataRequestQuestionnaire';
import AnnualReportLoader from './AnnualReportLoader';
import DataConnectionsPanel from './DataConnectionsPanel';
import IndicatorsScopeWorkspace from './IndicatorsScopeWorkspace';
import { useSections } from '../contexts/SectionsContext';

import type { DataLoadTab } from '../contexts/appRoutes';

const TABS: { id: DataLoadTab; label: string; icon: React.ElementType }[] = [
  { id: 'indicators', label: 'Indicadores ESG', icon: BarChart3 },
  { id: 'questionnaires', label: 'Cuestionarios', icon: FileQuestion },
  { id: 'bulk', label: 'Carga masiva', icon: UploadCloud },
  { id: 'connections', label: 'Conexiones ERP', icon: Plug }
];

interface DataHubProps {
  sections: StandardSection[];
  reportingYear: number;
  currentUser: User;
  users: User[];
  onUpdateDatapoint: (datapointId: string, updates: Partial<import('../types').Datapoint>) => void;
  /** Navegación controlada desde el menú lateral (sub-hilos). */
  activeTab?: DataLoadTab;
  onTabChange?: (tab: DataLoadTab) => void;
}

export const DataHub: React.FC<DataHubProps> = ({
  sections,
  reportingYear,
  currentUser,
  users,
  onUpdateDatapoint,
  activeTab: controlledTab,
  onTabChange,
}) => {
  const [internalTab, setInternalTab] = useState<DataLoadTab>('indicators');
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = (tab: DataLoadTab) => {
    onTabChange?.(tab);
    if (controlledTab === undefined) setInternalTab(tab);
  };

  const { addDatapoint } = useSections();

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Cabecera Sygris-style */}
      <div className="flex-shrink-0 pb-4 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#0066ff]/20 rounded-lg">
            <Database className="w-6 h-6 text-[#0066ff]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Carga de datos</h1>
            <p className="text-sm text-[#6a6a6a]">
              Alcance multi-estándar (ESRS), cuestionarios, importación masiva y conexiones ERP
            </p>
          </div>
        </div>

        {/* Tabs internos - modelo Sygris */}
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

      {/* Contenido del tab activo */}
      <div className="flex-1 min-h-0 pt-4 overflow-auto">
        {activeTab === 'indicators' && (
          <IndicatorsScopeWorkspace
            sections={sections}
            reportingYear={reportingYear}
            currentUser={currentUser}
            users={users}
            onUpdateDatapoint={onUpdateDatapoint}
            onAddDatapoint={addDatapoint}
          />
        )}
        {activeTab === 'questionnaires' && (
          <DataRequestQuestionnaire
            sections={sections}
            users={users}
            reportingYear={reportingYear}
          />
        )}
        {activeTab === 'bulk' && (
          <AnnualReportLoader
            sections={sections}
            reportingYear={reportingYear}
            onUpdateDatapoint={onUpdateDatapoint}
            onDataExtracted={(data) => {
              console.log('Datos extraídos:', data);
            }}
          />
        )}
        {activeTab === 'connections' && (
          <DataConnectionsPanel />
        )}
      </div>
    </div>
  );
};

export default DataHub;
