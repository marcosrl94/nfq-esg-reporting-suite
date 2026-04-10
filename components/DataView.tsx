/**
 * DataView - Vista unificada de carga e ingesta de datos
 * Sub-módulos por big topic material (estilo Sygris): KPIs, filtros, gráficos, tabla
 */
import React, { useState, useMemo } from 'react';
import { useMateriality } from '../contexts';
import {
  UploadCloud,
  FileSpreadsheet,
  Layers,
  Leaf,
  Users,
  Briefcase,
  Scale,
  Database,
  LayoutGrid,
  Building2,
  UserCheck
} from 'lucide-react';
import { StandardSection, Department, User, Role } from '../types';
import {
  getDatapointsByDepartment,
  downloadTemplateByFunction
} from '../services/templateGenerator';
import {
  BIG_TOPIC_SUBMODULES,
  getDatapointsForSubModule
} from '../services/dataSubModulesConfig';
import DataInput from './DataInput';
import DataSubModuleView from './DataSubModuleView';
import BulkImportModal from './BulkImportModal';

const DEPARTMENT_CONFIG: Record<Department, { icon: React.ElementType; label: string; shortLabel: string }> = {
  [Department.SUSTAINABILITY]: { icon: Leaf, label: 'Sustainability Office', shortLabel: 'Sustainability' },
  [Department.ENVIRONMENT]: { icon: Leaf, label: 'Environment / Ops', shortLabel: 'Environment' },
  [Department.HR]: { icon: Users, label: 'Human Resources', shortLabel: 'HR' },
  [Department.FINANCE]: { icon: Briefcase, label: 'Finance', shortLabel: 'Finance' },
  [Department.LEGAL]: { icon: Scale, label: 'Legal', shortLabel: 'Legal' }
};

interface DataViewProps {
  sections: StandardSection[];
  reportingYear: number;
  currentUser: User;
  users: User[];
  onUpdateDatapoint: (datapointId: string, updates: Partial<import('../types').Datapoint>) => void;
  /** Cuando está dentro de DataHub, header más compacto */
  compactMode?: boolean;
}

const DataView: React.FC<DataViewProps> = ({
  sections,
  reportingYear,
  currentUser,
  users,
  onUpdateDatapoint,
  compactMode = false
}) => {
  const { filterSectionsByMateriality, hasAssessment } = useMateriality();
  const [selectedDepartment, setSelectedDepartment] = useState<Department | 'all'>(
    currentUser.role === Role.ADMIN ? 'all' : currentUser.department
  );
  const [activeSectionId, setActiveSectionId] = useState<string>(sections[0]?.id || '');
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'submodules' | 'classic'>('submodules');
  const [selectedBigTopicId, setSelectedBigTopicId] = useState<string | null>(null);
  const [selectedSubModuleId, setSelectedSubModuleId] = useState<string | null>(null);

  // Secciones filtradas por materialidad (primero) y por función
  const filteredSections = useMemo(() => {
    const byMateriality = filterSectionsByMateriality(sections);
    if (selectedDepartment === 'all') return byMateriality;
    return byMateriality
      .map(s => ({
        ...s,
        datapoints: s.datapoints.filter(dp => dp.department === selectedDepartment)
      }))
      .filter(s => s.datapoints.length > 0);
  }, [sections, selectedDepartment, filterSectionsByMateriality]);

  // Big topics disponibles (con secciones que tienen datos)
  const availableBigTopics = useMemo(() => {
    return BIG_TOPIC_SUBMODULES.filter(bt => {
      const hasSection = filteredSections.some(s => s.code.includes(bt.sectionCode));
      if (!hasSection) return false;
      const hasDatapoints = bt.subModules.some(sm => {
        const pairs = getDatapointsForSubModule(filteredSections, sm, bt.sectionCode);
        return pairs.some(p => p.datapoints.length > 0);
      });
      return hasDatapoints;
    });
  }, [filteredSections]);

  const activeBigTopic = useMemo(() => {
    const id = selectedBigTopicId || availableBigTopics[0]?.id;
    return availableBigTopics.find(bt => bt.id === id) || availableBigTopics[0];
  }, [selectedBigTopicId, availableBigTopics]);

  const activeSubModule = useMemo(() => {
    if (!activeBigTopic) return null;
    const id = selectedSubModuleId || activeBigTopic.subModules[0]?.id;
    const sm = activeBigTopic.subModules.find(s => s.id === id);
    if (sm) {
      const pairs = getDatapointsForSubModule(filteredSections, sm, activeBigTopic.sectionCode);
      if (pairs.some(p => p.datapoints.length > 0)) return sm;
    }
    return activeBigTopic.subModules.find(s => {
      const pairs = getDatapointsForSubModule(filteredSections, s, activeBigTopic.sectionCode);
      return pairs.some(p => p.datapoints.length > 0);
    }) || null;
  }, [activeBigTopic, selectedSubModuleId, filteredSections]);

  // Stats por función
  const departmentStats = useMemo(() => {
    const stats: Record<string, { total: number; withData: number }> = {};
    Object.values(Department).forEach(dept => {
      const dps = getDatapointsByDepartment(sections, dept);
      const yearKey = reportingYear.toString();
      const withData = dps.filter(dp => {
        const v = dp.values?.[yearKey];
        return v !== null && v !== undefined && v !== '';
      }).length;
      stats[dept] = { total: dps.length, withData };
    });
    return stats;
  }, [sections, reportingYear]);

  const activeSection = useMemo(() => {
    const section = filteredSections.find(s => s.id === activeSectionId);
    return section || filteredSections[0];
  }, [filteredSections, activeSectionId]);

  // Si la sección activa ya no está en filtradas, cambiar a la primera
  React.useEffect(() => {
    if (filteredSections.length > 0 && !filteredSections.find(s => s.id === activeSectionId)) {
      setActiveSectionId(filteredSections[0].id);
    }
  }, [filteredSections, activeSectionId]);

  const handleDownloadTemplate = (dept: Department, mode: 'standard' | 'consolidation') => {
    downloadTemplateByFunction(sections, reportingYear, dept, mode);
  };

  const effectiveDepartment = selectedDepartment === 'all' ? activeSection?.datapoints[0]?.department : selectedDepartment;

  // Modelo de gobierno: responsables y áreas
  const governanceStats = useMemo(() => {
    const ownerIds = new Set<string>();
    const deptSet = new Set<string>();
    sections.forEach(s => {
      s.datapoints.forEach(dp => {
        if (dp.ownerId) ownerIds.add(dp.ownerId);
        deptSet.add(dp.department);
      });
    });
    return { responsibles: ownerIds.size, areas: deptSet.size };
  }, [sections]);

  // Sección para BulkImport: en sub-módulos, usar la del sub-módulo activo
  const bulkImportSection = useMemo(() => {
    if (viewMode === 'submodules' && activeBigTopic && activeSubModule) {
      const pairs = getDatapointsForSubModule(filteredSections, activeSubModule, activeBigTopic.sectionCode);
      if (pairs.length > 0) return pairs[0].section;
    }
    return activeSection || sections[0];
  }, [viewMode, activeBigTopic, activeSubModule, filteredSections, activeSection, sections]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Modelo de gobierno + Carga (único sitio) */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex flex-wrap items-center gap-4 py-2 px-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg mb-3">
          <span className="text-xs text-[#6a6a6a] flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            {governanceStats.areas} áreas responsables
          </span>
          <span className="text-xs text-[#6a6a6a] flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5" />
            {governanceStats.responsibles} responsables
          </span>
          <span className="text-xs text-[#6a6a6a]">|</span>
          <span className="text-xs text-[#6a6a6a]">Plantillas CSV/Excel por función · Carga masiva</span>
        </div>
      </div>

      {/* Header unificado: función + carga + sección */}
      <div className={`flex-shrink-0 space-y-4 pb-4 border-b border-[#2a2a2a] ${compactMode ? 'mb-2' : ''}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {!compactMode && (
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2">
              <Database className="w-6 h-6 sm:w-7 sm:h-7 text-[#0066ff]" />
              Datos e Información No Financiera
            </h2>
          <p className="text-sm text-[#6a6a6a] mt-1">
            {hasAssessment
              ? 'Solo se muestran secciones ESRS materiales (definidas en Materialidad).'
              : 'Carga masiva por función y edición detallada. Ejecuta Materialidad primero para filtrar por topics.'}
          </p>
          </div>
          )}

          {/* Acciones de carga - único sitio para construir datos */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsBulkImportOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0066ff] hover:bg-[#0052cc] rounded-lg text-xs sm:text-sm font-medium text-white transition-colors"
            >
              <UploadCloud className="w-4 h-4" />
              Cargar CSV / Excel
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => effectiveDepartment && handleDownloadTemplate(effectiveDepartment, 'standard')}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] rounded-lg text-xs sm:text-sm text-white transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Plantilla por área
              </button>
              <button
                onClick={() => effectiveDepartment && handleDownloadTemplate(effectiveDepartment, 'consolidation')}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] rounded-lg text-xs sm:text-sm text-white transition-colors"
              >
                <Layers className="w-4 h-4" />
                Consolidación
              </button>
            </div>
          </div>
        </div>

        {/* Filtro por función - dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#6a6a6a]">Área:</label>
          <select
            value={selectedDepartment}
            onChange={e => setSelectedDepartment(e.target.value as Department | 'all')}
            className="px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-sm text-white"
          >
            <option value="all">Todas las áreas</option>
            {Object.values(Department).map(dept => {
              const config = DEPARTMENT_CONFIG[dept];
              const stats = departmentStats[dept];
              const progress = stats.total > 0 ? Math.round((stats.withData / stats.total) * 100) : 0;
              return (
                <option key={dept} value={dept}>
                  {config.shortLabel} ({progress}%)
                </option>
              );
            })}
          </select>
        </div>

        {/* Toggle vista sub-módulos / clásica */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6a6a6a]">Vista:</span>
          <button
            onClick={() => setViewMode('submodules')}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
              viewMode === 'submodules'
                ? 'bg-[#0066ff] text-white'
                : 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#aaaaaa] hover:border-[#0066ff]/50'
            }`}
          >
            <LayoutGrid className="w-3 h-3" />
            Sub-módulos
          </button>
          <button
            onClick={() => setViewMode('classic')}
            className={`px-2 py-1 rounded text-xs font-medium ${
              viewMode === 'classic'
                ? 'bg-[#0066ff] text-white'
                : 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#aaaaaa] hover:border-[#0066ff]/50'
            }`}
          >
            Clásica
          </button>
        </div>

        {/* Selector Big Topic + Sub-módulos (si vista sub-módulos) */}
        {viewMode === 'submodules' && availableBigTopics.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {availableBigTopics.map(bt => (
                <button
                  key={bt.id}
                  onClick={() => {
                    setSelectedBigTopicId(bt.id);
                    setSelectedSubModuleId(null);
                  }}
                  className={`px-3 py-2 text-xs sm:text-sm font-medium transition-colors rounded-t ${
                    activeBigTopic?.id === bt.id
                      ? 'bg-[#1e1e1e] border border-b-0 border-[#2a2a2a] text-white'
                      : 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#6a6a6a] hover:text-white'
                  }`}
                >
                  {bt.sectionCode}: {bt.name}
                </button>
              ))}
            </div>
            {activeBigTopic && (
              <div className="flex flex-wrap gap-1 border-b border-[#2a2a2a] -mb-px">
                {activeBigTopic.subModules
                  .filter(sm => {
                    const pairs = getDatapointsForSubModule(filteredSections, sm, activeBigTopic.sectionCode);
                    return pairs.some(p => p.datapoints.length > 0);
                  })
                  .map(sm => (
                    <button
                      key={sm.id}
                      onClick={() => setSelectedSubModuleId(sm.id)}
                      className={`px-3 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 -mb-px ${
                        activeSubModule?.id === sm.id
                          ? 'border-[#0066ff] text-white'
                          : 'border-transparent text-[#6a6a6a] hover:text-white'
                      }`}
                    >
                      {sm.name}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Selector de sección (tabs) - vista clásica */}
        {viewMode === 'classic' && filteredSections.length > 1 && (
          <div className="flex flex-wrap gap-1 border-b border-[#2a2a2a] -mb-px">
            {filteredSections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSectionId(section.id)}
                className={`px-3 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeSectionId === section.id
                    ? 'border-[#0066ff] text-white'
                    : 'border-transparent text-[#6a6a6a] hover:text-white'
                }`}
              >
                {section.code}: {section.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Contenido principal */}
      <div className="flex-1 min-h-0 pt-4">
        {viewMode === 'submodules' && activeBigTopic && activeSubModule ? (
          <DataSubModuleView
            bigTopic={activeBigTopic}
            subModule={activeSubModule}
            sections={filteredSections}
            reportingYear={reportingYear}
            currentUser={currentUser}
            users={users}
            onUpdateDatapoint={onUpdateDatapoint}
            onBulkImportClick={() => setIsBulkImportOpen(true)}
          />
        ) : viewMode === 'classic' && activeSection ? (
          <DataInput
            section={activeSection}
            onUpdateDatapoint={onUpdateDatapoint}
            currentUser={currentUser}
            users={users}
            reportingYear={reportingYear}
            onBulkImportClick={() => setIsBulkImportOpen(true)}
          />
        ) : viewMode === 'submodules' && (availableBigTopics.length === 0 || !activeSubModule) ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6">
            <p className="text-[#6a6a6a] mb-2">
              {filteredSections.length === 0
                ? 'No hay indicadores para la función seleccionada.'
                : 'No hay sub-módulos con datos. Usa la vista clásica.'}
            </p>
            <button
              onClick={() => setViewMode('classic')}
              className="text-sm text-[#0066ff] hover:underline"
            >
              Cambiar a vista clásica
            </button>
          </div>
        ) : viewMode === 'classic' && !activeSection ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6">
            <p className="text-[#6a6a6a] mb-2">
              No hay indicadores para la función seleccionada.
            </p>
            {selectedDepartment !== 'all' && (
              <button
                onClick={() => setSelectedDepartment('all')}
                className="text-sm text-[#0066ff] hover:underline"
              >
                Ver todas las funciones
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        section={bulkImportSection}
        reportingYear={reportingYear}
        currentUserId={currentUser.id}
        currentUserName={currentUser.name}
        responsibleDepartment={effectiveDepartment}
      />
    </div>
  );
};

export default DataView;
