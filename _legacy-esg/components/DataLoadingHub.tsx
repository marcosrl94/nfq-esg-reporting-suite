/**
 * Data Loading Hub - Centro de carga y consolidación de información no financiera por función
 * Permite a cada función (Sustainability, Environment, HR, Finance, Legal) cargar sus datos
 * de forma estructurada y consolidar desde múltiples fuentes.
 */
import React, { useState, useMemo } from 'react';
import {
  UploadCloud,
  Download,
  FileSpreadsheet,
  Layers,
  Building2,
  Leaf,
  Users,
  Briefcase,
  Scale,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  FileText,
  Database
} from 'lucide-react';
import { StandardSection, Department, User, WorkflowStatus, Role } from '../types';
import { useSections } from '../contexts';
import {
  getDatapointsByDepartment,
  downloadTemplateByFunction
} from '../services/templateGenerator';
import BulkImportModal from './BulkImportModal';

const DEPARTMENT_CONFIG: Record<Department, { icon: React.ElementType; label: string; shortLabel: string }> = {
  [Department.SUSTAINABILITY]: { icon: Leaf, label: 'Sustainability Office', shortLabel: 'Sustainability' },
  [Department.ENVIRONMENT]: { icon: Leaf, label: 'Environment / Ops', shortLabel: 'Environment' },
  [Department.HR]: { icon: Users, label: 'Human Resources', shortLabel: 'HR' },
  [Department.FINANCE]: { icon: Briefcase, label: 'Finance', shortLabel: 'Finance' },
  [Department.LEGAL]: { icon: Scale, label: 'Legal', shortLabel: 'Legal' }
};

interface DataLoadingHubProps {
  sections: StandardSection[];
  reportingYear: number;
  currentUser: User;
  users: User[];
}

const DataLoadingHub: React.FC<DataLoadingHubProps> = ({
  sections,
  reportingYear,
  currentUser,
  users
}) => {
  const { updateDatapoint } = useSections();
  const [selectedDepartment, setSelectedDepartment] = useState<Department | 'all'>(
    currentUser.role === Role.ADMIN ? 'all' : currentUser.department
  );
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importSection, setImportSection] = useState<StandardSection | null>(null);
  const [importDepartment, setImportDepartment] = useState<Department | null>(null);

  // Stats por función
  const departmentStats = useMemo(() => {
    const stats: Record<string, { total: number; withData: number; approved: number }> = {};
    Object.values(Department).forEach(dept => {
      const dps = getDatapointsByDepartment(sections, dept);
      const yearKey = reportingYear.toString();
      const withData = dps.filter(dp => {
        const v = dp.values?.[yearKey];
        return v !== null && v !== undefined && v !== '';
      }).length;
      const approved = dps.filter(dp =>
        dp.status === WorkflowStatus.APPROVED || dp.status === WorkflowStatus.LOCKED
      ).length;
      stats[dept] = { total: dps.length, withData, approved };
    });
    return stats;
  }, [sections, reportingYear]);

  const filteredSections = useMemo(() => {
    if (selectedDepartment === 'all') return sections;
    return sections.map(section => ({
      ...section,
      datapoints: section.datapoints.filter(dp => dp.department === selectedDepartment)
    })).filter(s => s.datapoints.length > 0);
  }, [sections, selectedDepartment]);

  const handleDownloadTemplate = (dept: Department, mode: 'standard' | 'consolidation') => {
    downloadTemplateByFunction(sections, reportingYear, dept, mode);
  };

  const handleOpenImport = (section: StandardSection, department: Department) => {
    setImportSection(section);
    setImportDepartment(department);
    setImportModalOpen(true);
  };

  const handleCloseImport = () => {
    setImportModalOpen(false);
    setImportSection(null);
    setImportDepartment(null);
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2">
            <Database className="w-6 h-6 sm:w-7 sm:h-7 text-[#0066ff]" />
            Centro de Carga de Información No Financiera
          </h2>
          <p className="text-sm text-[#6a6a6a] mt-1">
            Carga y consolida datos ESG por función. Cada área reporta sus indicadores y el sistema consolida automáticamente.
          </p>
        </div>
      </div>

      {/* Filtro por función */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
        <p className="text-xs sm:text-sm font-medium text-[#6a6a6a] mb-3">Ver datos por función</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedDepartment('all')}
            className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 ${
              selectedDepartment === 'all'
                ? 'bg-[#0066ff] text-white'
                : 'bg-[#0a0a0a] border border-[#2a2a2a] text-[#aaaaaa] hover:border-[#0066ff]/50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Todas las funciones
          </button>
          {Object.values(Department).map(dept => {
            const config = DEPARTMENT_CONFIG[dept];
            const Icon = config.icon;
            const stats = departmentStats[dept];
            const progress = stats.total > 0 ? Math.round((stats.withData / stats.total) * 100) : 0;
            const isMyDept = currentUser.department === dept;
            return (
              <button
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 ${
                  selectedDepartment === dept
                    ? 'bg-[#0066ff] text-white'
                    : 'bg-[#0a0a0a] border border-[#2a2a2a] text-[#aaaaaa] hover:border-[#0066ff]/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {config.shortLabel}
                {stats.total > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    progress >= 80 ? 'bg-green-500/20 text-green-400' :
                    progress >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-[#2a2a2a] text-[#6a6a6a]'
                  }`}>
                    {progress}%
                  </span>
                )}
                {isMyDept && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0066ff]/30 text-[#0066ff]">
                    Mi área
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tarjetas por función con acciones de carga */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {(selectedDepartment === 'all' ? Object.values(Department) : [selectedDepartment]).map(dept => {
          const config = DEPARTMENT_CONFIG[dept];
          const Icon = config.icon;
          const stats = departmentStats[dept];
          const dps = getDatapointsByDepartment(sections, dept);
          const yearKey = reportingYear.toString();
          const withData = dps.filter(dp => {
            const v = dp.values?.[yearKey];
            return v !== null && v !== undefined && v !== '';
          }).length;
          const progress = stats.total > 0 ? Math.round((withData / stats.total) * 100) : 0;
          const canEdit = currentUser.role === Role.ADMIN || currentUser.department === dept;

          if (stats.total === 0) return null;

          return (
            <div
              key={dept}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 sm:p-6 hover:border-[#0066ff]/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#0066ff]/20 rounded-lg">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-[#0066ff]" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-white">{config.label}</h3>
                    <p className="text-xs sm:text-sm text-[#6a6a6a]">
                      {stats.total} indicadores • {withData} con datos ({progress}%)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {progress >= 100 ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : progress < 50 ? (
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  ) : null}
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="mb-4">
                <div className="w-full bg-[#0a0a0a] rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: progress >= 80 ? '#00ff88' : progress >= 50 ? '#ffaa00' : '#0066ff'
                    }}
                  />
                </div>
              </div>

              {/* Acciones de carga */}
              {canEdit && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-[#6a6a6a]">Acciones de carga</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleDownloadTemplate(dept, 'standard')}
                      className="flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] hover:bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#0066ff]/50 rounded-lg text-xs sm:text-sm text-white transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Template estándar
                    </button>
                    <button
                      onClick={() => handleDownloadTemplate(dept, 'consolidation')}
                      className="flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] hover:bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#0066ff]/50 rounded-lg text-xs sm:text-sm text-white transition-colors"
                    >
                      <Layers className="w-4 h-4" />
                      Template consolidación
                    </button>
                    <button
                      onClick={() => {
                        const section = sections.find(s =>
                          s.datapoints.some(dp => dp.department === dept)
                        );
                        if (section) handleOpenImport(section, dept);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-[#0066ff] hover:bg-[#0052cc] rounded-lg text-xs sm:text-sm text-white transition-colors"
                    >
                      <UploadCloud className="w-4 h-4" />
                      Importar datos
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Secciones y datapoints de la función seleccionada */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[#0066ff]" />
          Indicadores por sección
          {selectedDepartment !== 'all' && (
            <span className="text-xs font-normal text-[#6a6a6a]">
              — {DEPARTMENT_CONFIG[selectedDepartment]?.label}
            </span>
          )}
        </h3>

        {filteredSections.length === 0 ? (
          <p className="text-sm text-[#6a6a6a] py-8 text-center">
            No hay indicadores para la función seleccionada.
          </p>
        ) : (
          <div className="space-y-4">
            {filteredSections.map(section => (
              <div key={section.id} className="border border-[#2a2a2a] rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-[#0a0a0a] border-b border-[#2a2a2a]">
                  <h4 className="text-sm font-semibold text-white">
                    {section.code} — {section.title}
                  </h4>
                </div>
                <div className="divide-y divide-[#2a2a2a]">
                  {section.datapoints.map(dp => {
                    const yearKey = reportingYear.toString();
                    const hasValue = dp.values?.[yearKey] !== null &&
                      dp.values?.[yearKey] !== undefined &&
                      dp.values?.[yearKey] !== '';
                    return (
                      <div
                        key={dp.id}
                        className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#0a0a0a]/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono text-[#6a6a6a]">{dp.code}</p>
                          <p className="text-sm font-medium text-white truncate">{dp.name}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {hasValue ? (
                            <span className="text-xs text-green-500 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              {typeof dp.values?.[yearKey] === 'number'
                                ? (dp.values[yearKey] as number).toLocaleString('es-ES')
                                : String(dp.values?.[yearKey] || '').substring(0, 30)}
                              {dp.unit && ` ${dp.unit}`}
                            </span>
                          ) : (
                            <span className="text-xs text-[#6a6a6a] flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Sin datos
                            </span>
                          )}
                          <ChevronDown className="w-4 h-4 text-[#6a6a6a]" />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {(currentUser.role === Role.ADMIN || section.datapoints.some(dp => dp.department === currentUser.department)) && (
                  <div className="px-4 py-2 bg-[#0a0a0a] border-t border-[#2a2a2a]">
                    <button
                      onClick={() => handleOpenImport(section, section.datapoints[0]?.department || currentUser.department)}
                      className="text-xs text-[#0066ff] hover:text-[#00aaff] flex items-center gap-1"
                    >
                      <UploadCloud className="w-3 h-3" />
                      Importar datos de esta sección
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de importación */}
      {importSection && (
        <BulkImportModal
          isOpen={importModalOpen}
          onClose={handleCloseImport}
          section={importSection}
          reportingYear={reportingYear}
          currentUserId={currentUser.id}
          currentUserName={currentUser.name}
          responsibleDepartment={importDepartment || undefined}
        />
      )}
    </div>
  );
};

export default DataLoadingHub;
