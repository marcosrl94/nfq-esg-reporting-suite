/**
 * Final Report Guided Component - Flujo paso a paso mejorado
 */
import React, { useState, useMemo } from 'react';
import { 
  FileBarChart, Download, CheckCircle2, AlertCircle, Clock, 
  Settings, ChevronRight, ChevronLeft, Play, FileText, 
  CheckCircle, Circle, Info, Sparkles
} from 'lucide-react';
import { StandardSection, WorkflowStatus } from '../types';
import { useSections } from '../contexts';
import { ReportConfiguration } from './ReportConfiguration';
import { ReportConfiguration as ReportConfigType } from '../services/reportConfigurationService';
import { GeneratedReport, generateComprehensiveReport, generateHTMLReport, generateCSVReport, generateExcelReport } from '../services/reportGeneratorService';

interface FinalReportGuidedProps {
  reportingYear: number;
}

type Step = 'overview' | 'configure' | 'review' | 'generate';

const STEPS: { id: Step; title: string; description: string }[] = [
  {
    id: 'overview',
    title: 'Vista General',
    description: 'Revisa el estado de tus datos y preparación'
  },
  {
    id: 'configure',
    title: 'Configurar Reporte',
    description: 'Selecciona estándares, estructura y opciones'
  },
  {
    id: 'review',
    title: 'Revisar Configuración',
    description: 'Verifica tu configuración antes de generar'
  },
  {
    id: 'generate',
    title: 'Generar Reporte',
    description: 'Genera y descarga tu reporte final'
  }
];

export const FinalReportGuided: React.FC<FinalReportGuidedProps> = ({ reportingYear }) => {
  const { sections } = useSections();
  const [currentStep, setCurrentStep] = useState<Step>('overview');
  const [selectedFormat, setSelectedFormat] = useState<'html' | 'csv' | 'xls'>('html');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [comprehensiveReport, setComprehensiveReport] = useState<GeneratedReport | null>(null);
  const [reportConfig, setReportConfig] = useState<ReportConfigType | null>(null);
  const [generationProgress, setGenerationProgress] = useState({ progress: 0, message: '' });

  // Filter approved datapoints
  const approvedSections = useMemo(() => {
    return sections.map(section => ({
      ...section,
      datapoints: section.datapoints.filter(dp => dp.status === WorkflowStatus.APPROVED || dp.status === WorkflowStatus.LOCKED)
    })).filter(section => section.datapoints.length > 0);
  }, [sections]);

  // Calculate report statistics
  const reportStats = useMemo(() => {
    const totalDatapoints = approvedSections.reduce((sum, s) => sum + s.datapoints.length, 0);
    const quantitativeCount = approvedSections.reduce(
      (sum, s) => sum + s.datapoints.filter(dp => dp.type === 'quantitative').length,
      0
    );
    const qualitativeCount = totalDatapoints - quantitativeCount;
    const sectionsCount = approvedSections.length;

    return {
      totalDatapoints,
      quantitativeCount,
      qualitativeCount,
      sectionsCount,
      readiness: sectionsCount > 0 ? Math.round((totalDatapoints / (sections.length * 5)) * 100) : 0
    };
  }, [approvedSections, sections.length]);

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
  const canProceed = useMemo(() => {
    if (currentStep === 'overview') return approvedSections.length > 0;
    if (currentStep === 'configure') return reportConfig !== null;
    if (currentStep === 'review') return reportConfig !== null;
    return true;
  }, [currentStep, approvedSections.length, reportConfig]);

  const handleNext = () => {
    if (!canProceed) return;
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    }
  };

  const handlePrevious = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  };

  const handleGenerate = async () => {
    if (!reportConfig) return;

    setIsGenerating(true);
    setGenerationProgress({ progress: 0, message: 'Iniciando...' });
    
    try {
      const report = await generateComprehensiveReport(
        sections,
        reportConfig,
        reportingYear,
        (progress, message) => {
          setGenerationProgress({ progress, message });
        }
      );
      setComprehensiveReport(report);

      if (selectedFormat === 'html') {
        setGeneratedReport(generateHTMLReport(report, reportConfig));
      } else if (selectedFormat === 'csv') {
        setGeneratedReport(generateCSVReport(report));
      } else if (selectedFormat === 'xls') {
        setGeneratedReport(generateExcelReport(report));
      } else {
        setGeneratedReport(JSON.stringify(report, null, 2));
      }

      setCurrentStep('generate');
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error al generar el reporte. Por favor, inténtalo de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = () => {
    if (!generatedReport) return;
    const mime = selectedFormat === 'html' ? 'text/html' : selectedFormat === 'csv' ? 'text/csv' : 'application/vnd.ms-excel';
    const ext = selectedFormat === 'html' ? 'html' : selectedFormat === 'csv' ? 'csv' : 'xls';
    const blob = new Blob([generatedReport], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ESG_Memoria_${reportingYear}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsFormat = (format: 'html' | 'csv' | 'xls') => {
    if (!comprehensiveReport || !reportConfig) return;
    let content: string;
    let ext: string;
    let mime: string;
    if (format === 'html') {
      content = generateHTMLReport(comprehensiveReport, reportConfig);
      ext = 'html';
      mime = 'text/html';
    } else if (format === 'csv') {
      content = generateCSVReport(comprehensiveReport);
      ext = 'csv';
      mime = 'text/csv';
    } else {
      content = generateExcelReport(comprehensiveReport);
      ext = 'xls';
      mime = 'application/vnd.ms-excel';
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ESG_Memoria_${reportingYear}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0066ff]/20 to-[#0066ff]/5 border border-[#0066ff]/30 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#0066ff] rounded-lg">
            <FileBarChart className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              Generador de Reportes ESG
              <Sparkles className="w-5 h-5 text-[#0066ff]" />
            </h1>
            <p className="text-sm text-[#cccccc]">
              Crea reportes profesionales alineados con mejores prácticas internacionales (ESRS, GRI, TCFD, etc.)
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg p-6">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = currentStepIndex > index;
            const isAccessible = index === 0 || currentStepIndex >= index - 1;

            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => isAccessible && setCurrentStep(step.id)}
                  disabled={!isAccessible}
                  className={`flex flex-col items-center gap-2 flex-1 ${
                    !isAccessible ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    isActive
                      ? 'bg-[#0066ff] border-[#0066ff] text-white shadow-lg shadow-[#0066ff]/30'
                      : isCompleted
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#6a6a6a]'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <span className="text-lg font-bold">{index + 1}</span>
                    )}
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-medium ${
                      isActive ? 'text-white' : 'text-[#6a6a6a]'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-[#6a6a6a] mt-1 hidden sm:block">
                      {step.description}
                    </p>
                  </div>
                </button>
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    isCompleted ? 'bg-green-500' : 'bg-[#2a2a2a]'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg p-6 min-h-[500px]">
        {currentStep === 'overview' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-[#0066ff]" />
                Estado de Preparación
              </h2>
              
              {approvedSections.length === 0 ? (
                <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-lg font-semibold text-yellow-500 mb-2">
                        No hay datos aprobados
                      </h3>
                      <p className="text-sm text-yellow-300 mb-4">
                        Necesitas aprobar datapoints antes de generar un reporte. Ve a "Data Ingestion" 
                        para ingresar y aprobar datos.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => window.location.hash = '#data'}
                          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg font-medium transition-colors"
                        >
                          Ir a Data Ingestion
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                      <p className="text-xs text-[#6a6a6a] mb-1">Total Datapoints</p>
                      <p className="text-2xl font-bold text-white">{reportStats.totalDatapoints}</p>
                    </div>
                    <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                      <p className="text-xs text-[#6a6a6a] mb-1">Cuantitativos</p>
                      <p className="text-2xl font-bold text-white">{reportStats.quantitativeCount}</p>
                    </div>
                    <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                      <p className="text-xs text-[#6a6a6a] mb-1">Cualitativos</p>
                      <p className="text-2xl font-bold text-white">{reportStats.qualitativeCount}</p>
                    </div>
                    <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                      <p className="text-xs text-[#6a6a6a] mb-1">Secciones</p>
                      <p className="text-2xl font-bold text-white">{reportStats.sectionsCount}</p>
                    </div>
                  </div>

                  <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className="text-sm font-medium text-green-400">
                        Listo para generar reporte
                      </span>
                    </div>
                    <p className="text-xs text-green-300">
                      Tienes {reportStats.sectionsCount} secciones con datos aprobados. 
                      Puedes continuar al siguiente paso para configurar tu reporte.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {currentStep === 'configure' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#0066ff]" />
                Configuración del Reporte
              </h2>
              <p className="text-sm text-[#6a6a6a] mb-6">
                Selecciona los estándares, estructura y opciones para tu reporte
              </p>
            </div>
            <ReportConfiguration
              sections={sections}
              reportingYear={reportingYear}
              onConfigurationChange={(config) => {
                setReportConfig(config);
              }}
              initialConfig={reportConfig || undefined}
            />
          </div>
        )}

        {currentStep === 'review' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white mb-4">Revisar Configuración</h2>
            {reportConfig ? (
              <div className="space-y-4">
                <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Estándares Seleccionados</h3>
                  <div className="flex flex-wrap gap-2">
                    {reportConfig.standards.map(std => (
                      <span key={std} className="px-3 py-1 bg-[#0066ff]/20 border border-[#0066ff]/50 rounded text-sm text-[#0066ff]">
                        {std}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Estructura</h3>
                  <div className="space-y-2">
                    {Object.entries(reportConfig.structure).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        {value ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Circle className="w-4 h-4 text-[#6a6a6a]" />
                        )}
                        <span className="text-sm text-[#cccccc] capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Formato</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm text-[#cccccc]">
                    <div>
                      <span className="text-[#6a6a6a]">Idioma: </span>
                      <span>{reportConfig.format.language.toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="text-[#6a6a6a]">Moneda: </span>
                      <span>{reportConfig.format.currency}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-yellow-500 font-medium mb-2">No hay configuración</p>
                <p className="text-sm text-[#6a6a6a]">
                  Ve al paso anterior para configurar tu reporte
                </p>
              </div>
            )}
          </div>
        )}

        {currentStep === 'generate' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white mb-4">Generar Reporte</h2>
            
            {isGenerating ? (
              <div className="space-y-4">
                <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="w-6 h-6 text-[#0066ff] animate-spin" />
                    <span className="text-white font-medium">{generationProgress.message}</span>
                  </div>
                  <div className="w-full bg-[#1a1a1a] rounded-full h-3">
                    <div
                      className="bg-[#0066ff] h-3 rounded-full transition-all duration-300"
                      style={{ width: `${generationProgress.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : generatedReport ? (
              <div className="space-y-4">
                <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                    <span className="text-green-400 font-medium text-lg">
                      ¡Reporte generado exitosamente!
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={downloadReport}
                      className="px-6 py-3 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      Descargar {selectedFormat.toUpperCase()}
                    </button>
                    {comprehensiveReport && (
                      <>
                        {selectedFormat !== 'html' && (
                          <button
                            onClick={() => downloadAsFormat('html')}
                            className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#0066ff] text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                          >
                            <Download className="w-4 h-4" /> HTML
                          </button>
                        )}
                        {selectedFormat !== 'csv' && (
                          <button
                            onClick={() => downloadAsFormat('csv')}
                            className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#0066ff] text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                          >
                            <Download className="w-4 h-4" /> CSV
                          </button>
                        )}
                        {selectedFormat !== 'xls' && (
                          <button
                            onClick={() => downloadAsFormat('xls')}
                            className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#0066ff] text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                          >
                            <Download className="w-4 h-4" /> Excel
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => {
                        setGeneratedReport(null);
                        setComprehensiveReport(null);
                        setCurrentStep('overview');
                      }}
                      className="px-6 py-3 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#0066ff] text-white rounded-lg font-medium transition-colors"
                    >
                      Generar Otro Reporte
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-6">
                  <h3 className="text-sm font-semibold text-white mb-4">Formato de Exportación</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { value: 'html', label: 'HTML', icon: FileText, description: 'Página web interactiva' },
                      { value: 'csv', label: 'CSV', icon: FileText, description: 'Memoria datos (Excel compatible)' },
                      { value: 'xls', label: 'Excel (.xls)', icon: FileBarChart, description: 'Memoria completa Sygris' }
                    ].map((format) => {
                      const Icon = format.icon;
                      return (
                        <button
                          key={format.value}
                          onClick={() => setSelectedFormat(format.value as 'html' | 'csv' | 'xls')}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            selectedFormat === format.value
                              ? 'border-[#0066ff] bg-[#0066ff]/10 shadow-lg shadow-[#0066ff]/20'
                              : 'border-[#2a2a2a] hover:border-[#0066ff]/50'
                          }`}
                        >
                          <Icon className="w-6 h-6 text-[#0066ff] mb-2" />
                          <p className="text-sm font-medium text-white mb-1">{format.label}</p>
                          <p className="text-xs text-[#6a6a6a]">{format.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={!reportConfig}
                  className="w-full px-6 py-4 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-lg font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-[#0066ff]/30"
                >
                  <Play className="w-6 h-6" />
                  Generar Reporte
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentStepIndex === 0}
          className="px-6 py-3 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#0066ff] text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Anterior
        </button>

        {currentStep !== 'generate' && (
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className="px-6 py-3 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
