/**
 * Report Configuration Component - Configuración avanzada de reportes
 */
import React, { useState, useMemo } from 'react';
import { Settings, CheckCircle2, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { StandardSection, StandardType } from '../types';
import { 
  ReportConfiguration as ReportConfigurationType, 
  TopicConfiguration, 
  REPORT_TEMPLATES,
  generateTopicConfigurations,
  validateReportConfiguration
} from '../services/reportConfigurationService';

interface ReportConfigurationProps {
  sections: StandardSection[];
  reportingYear: number;
  onConfigurationChange?: (config: ReportConfigurationType) => void;
  initialConfig?: Partial<ReportConfigurationType>;
}

const STANDARD_LABELS: Record<StandardType, string> = {
  [StandardType.ESRS]: 'ESRS (CSRD)',
  [StandardType.GRI]: 'GRI Standards',
  [StandardType.TCFD]: 'TCFD',
  [StandardType.ISSB]: 'ISSB',
  [StandardType.SASB]: 'SASB'
};

export const ReportConfiguration: React.FC<ReportConfigurationProps> = ({
  sections,
  reportingYear,
  onConfigurationChange,
  initialConfig
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  // Configuración del reporte
  const [config, setConfig] = useState<ReportConfigurationType>(() => {
    const defaultConfig: ReportConfigurationType = {
      standards: [StandardType.ESRS],
      topicConfigurations: {},
      format: {
        language: 'es',
        currency: 'EUR',
        dateFormat: 'DD/MM/YYYY',
        numberFormat: 'european'
      },
      structure: {
        includeExecutiveSummary: true,
        includeMethodology: true,
        includeAssuranceStatement: true,
        includeAppendices: true,
        tableOfContents: true
      },
      bestPractices: {
        includeComparatives: true,
        includeBenchmarks: true,
        includeTargets: true,
        includeAssurance: true,
        includeStakeholderEngagement: true
      },
      visualization: {
        includeCharts: true,
        includeTables: true,
        chartStyle: 'corporate'
      },
      metadata: {
        organizationName: '',
        reportingPeriod: `${reportingYear}`,
        preparedBy: ''
      },
      ...initialConfig
    };

    // Generar configuraciones por topic
    defaultConfig.topicConfigurations = generateTopicConfigurations(
      sections,
      defaultConfig.standards
    );

    return defaultConfig;
  });

  // Aplicar template
  const applyTemplate = (templateId: string) => {
    const template = REPORT_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    const newConfig: ReportConfigurationType = {
      ...config,
      ...template.configuration,
      topicConfigurations: generateTopicConfigurations(
        sections,
        template.configuration.standards || [StandardType.ESRS]
      )
    };

    setConfig(newConfig);
    setSelectedTemplate(templateId);
    if (onConfigurationChange) {
      onConfigurationChange(newConfig);
    }
  };

  // Actualizar configuración
  const updateConfig = (updates: Partial<ReportConfigurationType>) => {
    const newConfig = { ...config, ...updates };
    
    // Si cambian los estándares, regenerar topic configurations
    if (updates.standards) {
      newConfig.topicConfigurations = generateTopicConfigurations(
        sections,
        updates.standards
      );
    }

    setConfig(newConfig);
    if (onConfigurationChange) {
      onConfigurationChange(newConfig);
    }
  };

  // Validar configuración
  const validation = useMemo(() => validateReportConfiguration(config), [config]);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-[#0066ff]/20 rounded">
          <Settings className="w-6 h-6 text-[#0066ff]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Configuración de Reporte</h2>
          <p className="text-sm text-[#6a6a6a]">
            Configura estándares, estructura y mejores prácticas para tu reporte anual
          </p>
        </div>
      </div>

      {/* Validation Messages */}
      {validation.errors.length > 0 && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-500 font-medium mb-2">Errores de configuración:</p>
            <ul className="list-disc list-inside text-sm text-red-400 space-y-1">
              {validation.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="p-4 bg-yellow-500/20 border border-yellow-500/50 rounded flex items-start gap-3">
          <Info className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-yellow-500 font-medium mb-2">Recomendaciones:</p>
            <ul className="list-disc list-inside text-sm text-yellow-400 space-y-1">
              {validation.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Templates */}
      <div className="bg-[#1e1e1e] p-6 rounded border border-[#2a2a2a]">
        <h3 className="text-base font-semibold text-white mb-4">Templates Predefinidos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REPORT_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => applyTemplate(template.id)}
              className={`p-4 rounded border text-left transition-colors ${
                selectedTemplate === template.id
                  ? 'border-[#0066ff] bg-[#0066ff]/10'
                  : 'border-[#2a2a2a] hover:border-[#0066ff]/50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-white">{template.name}</h4>
                {selectedTemplate === template.id && (
                  <CheckCircle2 className="w-5 h-5 text-[#0066ff] flex-shrink-0" />
                )}
              </div>
              <p className="text-sm text-[#6a6a6a] mb-3">{template.description}</p>
              <div className="flex flex-wrap gap-2">
                {template.applicableStandards.map(std => (
                  <span
                    key={std}
                    className="text-xs px-2 py-1 bg-[#0a0a0a] rounded text-[#cccccc]"
                  >
                    {STANDARD_LABELS[std]}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Estándares */}
      <div className="bg-[#1e1e1e] p-6 rounded border border-[#2a2a2a]">
        <h3 className="text-base font-semibold text-white mb-4">Estándares a Incluir</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.values(StandardType).map((standard) => (
            <label
              key={standard}
              className="flex items-center gap-2 p-3 bg-[#0a0a0a] rounded border border-[#2a2a2a] cursor-pointer hover:border-[#0066ff]/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={config.standards.includes(standard)}
                onChange={(e) => {
                  const newStandards = e.target.checked
                    ? [...config.standards, standard]
                    : config.standards.filter(s => s !== standard);
                  updateConfig({ standards: newStandards });
                }}
                className="w-4 h-4 text-[#0066ff] rounded"
              />
              <span className="text-sm text-white">{STANDARD_LABELS[standard]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Configuración por Topic */}
      <div className="bg-[#1e1e1e] p-6 rounded border border-[#2a2a2a]">
        <h3 className="text-base font-semibold text-white mb-4">
          Configuración por Sección/Topic
        </h3>
        <div className="space-y-2">
          {sections.map((section) => {
            const topicConfig = config.topicConfigurations[section.id];
            if (!topicConfig) return null;

            const isExpanded = expandedSections.has(section.id);

            return (
              <div
                key={section.id}
                className="bg-[#0a0a0a] border border-[#2a2a2a] rounded"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-[#1a1a1a] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={topicConfig.include}
                      onChange={(e) => {
                        const newConfigs = {
                          ...config.topicConfigurations,
                          [section.id]: {
                            ...topicConfig,
                            include: e.target.checked
                          }
                        };
                        updateConfig({ topicConfigurations: newConfigs });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 text-[#0066ff] rounded"
                    />
                    <div className="text-left">
                      <p className="text-sm font-medium text-white">
                        {section.code}: {section.title}
                      </p>
                      <p className="text-xs text-[#6a6a6a]">
                        {topicConfig.applicableStandards.map(s => STANDARD_LABELS[s]).join(', ')}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-[#6a6a6a]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#6a6a6a]" />
                  )}
                </button>

                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-[#2a2a2a] space-y-3">
                    {/* Estándares aplicables */}
                    <div>
                      <p className="text-xs text-[#6a6a6a] mb-2">Estándares aplicables:</p>
                      <div className="flex flex-wrap gap-2">
                        {topicConfig.applicableStandards.map(std => (
                          <span
                            key={std}
                            className="text-xs px-2 py-1 bg-[#1a1a1a] rounded text-[#cccccc]"
                          >
                            {STANDARD_LABELS[std]}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Opciones de contenido */}
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2 text-sm text-white">
                        <input
                          type="checkbox"
                          checked={topicConfig.includeNarrative}
                          onChange={(e) => {
                            const newConfigs = {
                              ...config.topicConfigurations,
                              [section.id]: {
                                ...topicConfig,
                                includeNarrative: e.target.checked
                              }
                            };
                            updateConfig({ topicConfigurations: newConfigs });
                          }}
                          className="w-4 h-4 text-[#0066ff] rounded"
                        />
                        Incluir Narrativa
                      </label>
                      <label className="flex items-center gap-2 text-sm text-white">
                        <input
                          type="checkbox"
                          checked={topicConfig.includeData}
                          onChange={(e) => {
                            const newConfigs = {
                              ...config.topicConfigurations,
                              [section.id]: {
                                ...topicConfig,
                                includeData: e.target.checked
                              }
                            };
                            updateConfig({ topicConfigurations: newConfigs });
                          }}
                          className="w-4 h-4 text-[#0066ff] rounded"
                        />
                        Incluir Datos
                      </label>
                      <label className="flex items-center gap-2 text-sm text-white">
                        <input
                          type="checkbox"
                          checked={topicConfig.includeEvidence}
                          onChange={(e) => {
                            const newConfigs = {
                              ...config.topicConfigurations,
                              [section.id]: {
                                ...topicConfig,
                                includeEvidence: e.target.checked
                              }
                            };
                            updateConfig({ topicConfigurations: newConfigs });
                          }}
                          className="w-4 h-4 text-[#0066ff] rounded"
                        />
                        Incluir Evidencias
                      </label>
                      <label className="flex items-center gap-2 text-sm text-white">
                        <input
                          type="checkbox"
                          checked={topicConfig.includeComparatives}
                          onChange={(e) => {
                            const newConfigs = {
                              ...config.topicConfigurations,
                              [section.id]: {
                                ...topicConfig,
                                includeComparatives: e.target.checked
                              }
                            };
                            updateConfig({ topicConfigurations: newConfigs });
                          }}
                          className="w-4 h-4 text-[#0066ff] rounded"
                        />
                        Comparativas Años Anteriores
                      </label>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Estructura del Reporte */}
      <div className="bg-[#1e1e1e] p-6 rounded border border-[#2a2a2a]">
        <h3 className="text-base font-semibold text-white mb-4">Estructura del Reporte</h3>
        <div className="space-y-3">
          {[
            { key: 'includeExecutiveSummary', label: 'Resumen Ejecutivo' },
            { key: 'includeMethodology', label: 'Metodología' },
            { key: 'includeAssuranceStatement', label: 'Declaración de Aseguramiento' },
            { key: 'includeAppendices', label: 'Apéndices' },
            { key: 'tableOfContents', label: 'Índice de Contenidos' }
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-3 p-3 bg-[#0a0a0a] rounded cursor-pointer hover:bg-[#1a1a1a] transition-colors">
              <input
                type="checkbox"
                checked={config.structure[item.key as keyof typeof config.structure]}
                onChange={(e) => {
                  updateConfig({
                    structure: {
                      ...config.structure,
                      [item.key]: e.target.checked
                    }
                  });
                }}
                className="w-4 h-4 text-[#0066ff] rounded"
              />
              <span className="text-sm text-white">{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Mejores Prácticas */}
      <div className="bg-[#1e1e1e] p-6 rounded border border-[#2a2a2a]">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-[#0066ff]" />
          Mejores Prácticas
        </h3>
        <div className="space-y-3">
          {[
            { key: 'includeComparatives', label: 'Incluir Comparativas con Años Anteriores', description: 'Recomendado para ESRS' },
            { key: 'includeBenchmarks', label: 'Incluir Comparativas con Sector', description: 'Opcional' },
            { key: 'includeTargets', label: 'Incluir Objetivos y Metas', description: 'Recomendado' },
            { key: 'includeAssurance', label: 'Incluir Aseguramiento Externo', description: 'Recomendado para ESRS' },
            { key: 'includeStakeholderEngagement', label: 'Incluir Participación de Stakeholders', description: 'Recomendado para GRI' }
          ].map((item) => (
            <div key={item.key} className="p-3 bg-[#0a0a0a] rounded">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.bestPractices[item.key as keyof typeof config.bestPractices]}
                  onChange={(e) => {
                    updateConfig({
                      bestPractices: {
                        ...config.bestPractices,
                        [item.key]: e.target.checked
                      }
                    });
                  }}
                  className="w-4 h-4 text-[#0066ff] rounded mt-0.5"
                />
                <div className="flex-1">
                  <span className="text-sm text-white">{item.label}</span>
                  <p className="text-xs text-[#6a6a6a] mt-1">{item.description}</p>
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Formato */}
      <div className="bg-[#1e1e1e] p-6 rounded border border-[#2a2a2a]">
        <h3 className="text-base font-semibold text-white mb-4">Formato</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[#cccccc] mb-2">Idioma</label>
            <select
              value={config.format.language}
              onChange={(e) => updateConfig({ format: { ...config.format, language: e.target.value as any } })}
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-white"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-[#cccccc] mb-2">Moneda</label>
            <select
              value={config.format.currency}
              onChange={(e) => updateConfig({ format: { ...config.format, currency: e.target.value } })}
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-white"
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="MXN">MXN ($)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-[#1e1e1e] p-6 rounded border border-[#2a2a2a]">
        <h3 className="text-base font-semibold text-white mb-4">Información del Reporte</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[#cccccc] mb-2">Nombre de la Organización</label>
            <input
              type="text"
              value={config.metadata.organizationName}
              onChange={(e) => updateConfig({ metadata: { ...config.metadata, organizationName: e.target.value } })}
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-white"
              placeholder="Ej: Empresa XYZ S.A."
            />
          </div>
          <div>
            <label className="block text-sm text-[#cccccc] mb-2">Período de Reporting</label>
            <input
              type="text"
              value={config.metadata.reportingPeriod}
              onChange={(e) => updateConfig({ metadata: { ...config.metadata, reportingPeriod: e.target.value } })}
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-white"
              placeholder={`Ej: ${reportingYear} o 1 enero - 31 diciembre ${reportingYear}`}
            />
          </div>
          <div>
            <label className="block text-sm text-[#cccccc] mb-2">Frecuencia (Sygris)</label>
            <select
              value={config.metadata.reportingFrequency || 'annual'}
              onChange={(e) => updateConfig({ metadata: { ...config.metadata, reportingFrequency: e.target.value as 'annual' | 'quarterly' | 'monthly' } })}
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-white"
            >
              <option value="annual">Anual</option>
              <option value="quarterly">Trimestral</option>
              <option value="monthly">Mensual</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-[#cccccc] mb-2">Preparado por</label>
            <input
              type="text"
              value={config.metadata.preparedBy}
              onChange={(e) => updateConfig({ metadata: { ...config.metadata, preparedBy: e.target.value } })}
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-white"
              placeholder="Ej: Departamento de Sostenibilidad"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
