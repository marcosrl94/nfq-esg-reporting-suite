/**
 * Annual Report Loader - Carga y procesamiento de informes anuales previos
 */
import React, { useState, useMemo } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Calendar, TrendingUp, Sparkles } from 'lucide-react';
import { StandardSection, Datapoint } from '../types';
import {
  processAnnualReport,
  applyExtractedData,
  ExtractedHistoricalData,
  generateExtractionExplanation
} from '../services/annualReportProcessor';
import { isGeminiProxyEnabled } from '../services/geminiInvocation';

interface AnnualReportLoaderProps {
  sections: StandardSection[];
  onDataExtracted?: (extractedData: ExtractedHistoricalData) => void;
  onUpdateDatapoint?: (datapointId: string, updates: Partial<Datapoint>) => void;
  reportingYear: number;
}

interface ExtractionStatus {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  message?: string;
}

function renderBoldSegments(line: string): React.ReactNode {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const m = part.match(/^\*\*(.+)\*\*$/);
    if (m) return <strong key={i} className="text-white font-semibold">{m[1]}</strong>;
    return <span key={i}>{part}</span>;
  });
}

const AnnualReportLoader: React.FC<AnnualReportLoaderProps> = ({
  sections,
  onDataExtracted,
  onUpdateDatapoint,
  reportingYear
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState<'EINF' | 'Annual Report' | 'Sustainability Report' | 'Other'>('Annual Report');
  const [reportYear, setReportYear] = useState<number>(reportingYear - 1);
  const [extractionStatus, setExtractionStatus] = useState<ExtractionStatus>({
    status: 'idle',
    progress: 0
  });
  const [extractedData, setExtractedData] = useState<ExtractedHistoricalData | null>(null);
  const [selectedDatapoints, setSelectedDatapoints] = useState<Set<string>>(new Set());
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanationError, setExplanationError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
      if (!validTypes.includes(file.type)) {
        alert('Por favor, selecciona un archivo PDF o Word (.pdf, .doc, .docx)');
        return;
      }
      setSelectedFile(file);
      setExtractedData(null);
      setExplanation(null);
      setExplanationError(null);
      setExtractionStatus({ status: 'idle', progress: 0 });
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) return;

    setExtractionStatus({ status: 'uploading', progress: 10 });
    setExplanation(null);
    setExplanationError(null);

    try {
      setExtractionStatus({ status: 'processing', progress: 30 });
      
      // Procesar el informe con AI
      const result = await processAnnualReport(
        selectedFile,
        reportType,
        reportYear,
        sections
      );

      setExtractionStatus({ status: 'processing', progress: 90 });
      
      setExtractedData(result);
      setExtractionStatus({ status: 'completed', progress: 100 });
      
      // Seleccionar todos los datapoints extraídos por defecto
      const allCodes = new Set([
        ...result.quantitativeData.map(d => d.datapointCode),
        ...result.qualitativeData.map(d => d.datapointCode)
      ]);
      setSelectedDatapoints(allCodes);

      if (onDataExtracted) {
        onDataExtracted(result);
      }

      setExplanationLoading(true);
      try {
        const narrative = await generateExtractionExplanation(result);
        setExplanation(narrative);
      } catch (exErr: unknown) {
        const msg = exErr instanceof Error ? exErr.message : String(exErr);
        setExplanationError(msg);
      } finally {
        setExplanationLoading(false);
      }
    } catch (error: any) {
      console.error('Error processing report:', error);
      setExtractionStatus({
        status: 'error',
        progress: 0,
        message: error?.message || 'Error al procesar el informe. Por favor, verifica que el archivo sea válido y que la API key esté configurada.'
      });
      setExtractedData(null);
      setExplanation(null);
      setExplanationError(null);
    }
  };

  const handleApplyData = async () => {
    if (!extractedData) return;
    
    if (!onUpdateDatapoint) {
      alert('Función de actualización no disponible');
      return;
    }

    // Filtrar solo los datapoints seleccionados
    const quantitativeToApply = extractedData.quantitativeData.filter(
      d => selectedDatapoints.has(d.datapointCode)
    );
    const qualitativeToApply = extractedData.qualitativeData.filter(
      d => selectedDatapoints.has(d.datapointCode)
    );

    try {
      // Aplicar datos extraídos
      const result = await applyExtractedData(
        quantitativeToApply,
        qualitativeToApply,
        sections,
        onUpdateDatapoint
      );

      if (result.errors.length > 0) {
        alert(`Aplicados ${result.applied} datos. Errores: ${result.errors.join(', ')}`);
      } else {
        alert(`✓ Se aplicaron exitosamente ${result.applied} datos históricos`);
        // Limpiar estado
        setSelectedFile(null);
        setExtractedData(null);
        setExtractionStatus({ status: 'idle', progress: 0 });
      }
    } catch (error: any) {
      alert(`Error al aplicar datos: ${error.message}`);
    }
  };

  const toggleDatapoint = (code: string) => {
    const newSet = new Set(selectedDatapoints);
    if (newSet.has(code)) {
      newSet.delete(code);
    } else {
      newSet.add(code);
    }
    setSelectedDatapoints(newSet);
  };

  // Validar que sections esté definido
  if (!sections || sections.length === 0) {
    return (
      <div className="p-6 text-center text-[#6a6a6a]">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-[#ff4444]" />
        <p>No hay secciones disponibles para cargar datos históricos.</p>
      </div>
    );
  }

  // Verificar si hay API key configurada (usando useMemo para evitar problemas de renderizado)
  const apiKeyConfigured = useMemo(() => {
    if (isGeminiProxyEnabled()) return true;
    try {
      let apiKey = '';

      if (typeof import.meta !== 'undefined' && import.meta.env) {
        apiKey = String(import.meta.env.VITE_GEMINI_API_KEY || '');
      }

      if ((!apiKey || apiKey === 'undefined' || apiKey === 'null' || apiKey === '') &&
        typeof process !== 'undefined' &&
        process.env) {
        apiKey = String(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '');
      }

      if (
        apiKey &&
        apiKey !== 'undefined' &&
        apiKey !== 'null' &&
        apiKey !== '' &&
        apiKey.length > 10 &&
        !apiKey.includes('PLACEHOLDER') &&
        !apiKey.includes('tu_clave')
      ) {
        return true;
      }
    } catch (e) {
      console.debug('Error checking API key:', e);
    }
    return false;
  }, []);

  return (
    <div className="space-y-6 w-full max-w-full">
      <div className="bg-[#1e1e1e] p-6 rounded border border-[#2a2a2a]">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#0066ff]/20 rounded">
            <FileText className="w-6 h-6 text-[#0066ff]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Carga de Informes Anuales Previos</h2>
            <p className="text-sm text-[#6a6a6a]">
              Carga informes EINF, anuales o de sostenibilidad para extraer datos históricos automáticamente
            </p>
          </div>
        </div>

        {/* Aviso si no hay API key */}
        {!apiKeyConfigured && (
          <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-yellow-500 font-medium mb-1">API Key no configurada</p>
              <p className="text-sm text-yellow-400">
                Para usar la extracción automática con IA, configura el proxy (<code className="bg-black/30 px-1 rounded">VITE_GEMINI_USE_PROXY</code> + Edge Function) o <code className="bg-black/30 px-1 rounded">GEMINI_API_KEY</code> en <code className="bg-black/30 px-1 rounded">.env.local</code>.
                Por ahora, puedes cargar el archivo pero no se procesará automáticamente.
              </p>
            </div>
          </div>
        )}

        {/* Configuración */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-[#cccccc] mb-2">
              Tipo de Informe
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-white focus:outline-none focus:border-[#0066ff]"
            >
              <option value="EINF">EINF (Informe de Estado de Información No Financiera)</option>
              <option value="Annual Report">Informe Anual</option>
              <option value="Sustainability Report">Informe de Sostenibilidad</option>
              <option value="Other">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#cccccc] mb-2">
              Año del Informe
            </label>
            <input
              type="number"
              value={reportYear}
              onChange={(e) => setReportYear(parseInt(e.target.value))}
              min={2000}
              max={reportingYear}
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-white focus:outline-none focus:border-[#0066ff]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#cccccc] mb-2">
              Archivo
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center gap-2 px-4 py-2 bg-[#0066ff] text-white rounded cursor-pointer hover:bg-[#0055dd] transition-colors"
              >
                <Upload className="w-4 h-4" />
                {selectedFile ? selectedFile.name : 'Seleccionar archivo'}
              </label>
            </div>
          </div>
        </div>

        {/* Botón de procesamiento */}
        {selectedFile && extractionStatus.status !== 'completed' && (
          <button
            onClick={handleProcess}
            disabled={extractionStatus.status === 'processing' || extractionStatus.status === 'uploading' || !apiKeyConfigured}
            className="w-full md:w-auto px-6 py-3 bg-[#0066ff] text-white rounded font-medium hover:bg-[#0055dd] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            title={!apiKeyConfigured ? 'Configura GEMINI_API_KEY para procesar informes' : ''}
          >
            {extractionStatus.status === 'processing' || extractionStatus.status === 'uploading' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Procesando... {extractionStatus.progress}%
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                {apiKeyConfigured ? 'Procesar Informe con IA' : 'API Key requerida'}
              </>
            )}
          </button>
        )}

        {/* Barra de progreso */}
        {(extractionStatus.status === 'processing' || extractionStatus.status === 'uploading') && (
          <div className="mt-4">
            <div className="w-full bg-[#0a0a0a] rounded-full h-2">
              <div
                className="bg-[#0066ff] h-2 rounded-full transition-all duration-300"
                style={{ width: `${extractionStatus.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Mensaje de error */}
        {extractionStatus.status === 'error' && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500 rounded flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-500 font-medium">Error al procesar el informe</p>
              <p className="text-sm text-red-400 mt-1">{extractionStatus.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Resultados de extracción */}
      {extractedData && (
        <div className="space-y-4">
          {/* Resumen */}
          <div className="bg-[#1e1e1e] p-6 rounded border border-[#2a2a2a]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Datos Extraídos
              </h3>
              <button
                onClick={handleApplyData}
                className="px-4 py-2 bg-[#00ff88] text-black rounded font-medium hover:bg-[#00dd77] transition-colors"
              >
                Aplicar Datos Seleccionados
              </button>
            </div>

            {/* Explicación del agente (segunda pasada IA sobre el JSON extraído) */}
            <div className="mb-6 p-4 rounded border border-[#0066ff]/40 bg-[#0066ff]/5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-[#66aaff]" />
                <h4 className="text-base font-semibold text-white">Explicación del agente</h4>
                {explanationLoading && (
                  <Loader2 className="w-4 h-4 text-[#66aaff] animate-spin" aria-hidden />
                )}
              </div>
              {explanationError && (
                <p className="text-sm text-red-400">{explanationError}</p>
              )}
              {!explanationError && explanationLoading && !explanation && (
                <p className="text-sm text-[#6a6a6a]">Generando resumen interpretativo del resultado de extracción…</p>
              )}
              {explanation && (
                <div className="text-sm text-[#cccccc] leading-relaxed space-y-3">
                  {explanation.split(/\n\n+/).map((block, bi) => (
                    <p key={bi} className="mb-0">
                      {block.split('\n').map((line, li) => (
                        <React.Fragment key={li}>
                          {li > 0 && <br />}
                          {renderBoldSegments(line)}
                        </React.Fragment>
                      ))}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-[#0a0a0a] p-4 rounded">
                <p className="text-sm text-[#6a6a6a]">Datos Cuantitativos</p>
                <p className="text-2xl font-bold text-white">{extractedData.quantitativeData.length}</p>
              </div>
              <div className="bg-[#0a0a0a] p-4 rounded">
                <p className="text-sm text-[#6a6a6a]">Datos Cualitativos</p>
                <p className="text-2xl font-bold text-white">{extractedData.qualitativeData.length}</p>
              </div>
              <div className="bg-[#0a0a0a] p-4 rounded">
                <p className="text-sm text-[#6a6a6a]">Tendencias Identificadas</p>
                <p className="text-2xl font-bold text-white">{extractedData.trends.length}</p>
              </div>
            </div>

            {/* Datos Cuantitativos */}
            {extractedData.quantitativeData.length > 0 && (
              <div className="mb-6">
                <h4 className="text-base font-semibold text-white mb-3">Datos Cuantitativos Extraídos</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {extractedData.quantitativeData.map((data, index) => {
                    const isSelected = selectedDatapoints.has(data.datapointCode);
                    return (
                      <div
                        key={index}
                        className={`p-3 bg-[#0a0a0a] rounded border ${
                          isSelected ? 'border-[#0066ff]' : 'border-[#2a2a2a]'
                        } cursor-pointer hover:bg-[#1a1a1a] transition-colors`}
                        onClick={() => toggleDatapoint(data.datapointCode)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleDatapoint(data.datapointCode)}
                                className="w-4 h-4 text-[#0066ff] rounded"
                              />
                              <span className="font-mono text-xs font-bold text-[#6a6a6a] bg-[#1a1a1a] px-2 py-0.5 rounded">
                                {data.datapointCode}
                              </span>
                              <span className="text-sm font-medium text-white">{data.datapointName}</span>
                            </div>
                            <div className="ml-6 space-y-1">
                              {Object.entries(data.values).map(([year, value]) => (
                                <div key={year} className="flex items-center gap-2 text-sm text-[#cccccc]">
                                  <Calendar className="w-3 h-3 text-[#6a6a6a]" />
                                  <span>{year}:</span>
                                  <span className="font-mono font-semibold text-white">
                                    {typeof value === 'number' ? value.toLocaleString() : value}
                                  </span>
                                  {data.unit && <span className="text-[#6a6a6a]">{data.unit}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <span className={`text-xs px-2 py-1 rounded ${
                              data.confidence >= 80 ? 'bg-green-500/20 text-green-500' :
                              data.confidence >= 60 ? 'bg-yellow-500/20 text-yellow-500' :
                              'bg-red-500/20 text-red-500'
                            }`}>
                              {data.confidence}% confianza
                            </span>
                            {data.sourcePage && (
                              <span className="text-xs text-[#6a6a6a]">Pág. {data.sourcePage}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Datos Cualitativos */}
            {extractedData.qualitativeData.length > 0 && (
              <div className="mb-6">
                <h4 className="text-base font-semibold text-white mb-3">Narrativas Extraídas</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {extractedData.qualitativeData.map((data, index) => {
                    const isSelected = selectedDatapoints.has(data.datapointCode);
                    return (
                      <div
                        key={index}
                        className={`p-3 bg-[#0a0a0a] rounded border ${
                          isSelected ? 'border-[#0066ff]' : 'border-[#2a2a2a]'
                        } cursor-pointer hover:bg-[#1a1a1a] transition-colors`}
                        onClick={() => toggleDatapoint(data.datapointCode)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleDatapoint(data.datapointCode)}
                                className="w-4 h-4 text-[#0066ff] rounded"
                              />
                              <span className="font-mono text-xs font-bold text-[#6a6a6a] bg-[#1a1a1a] px-2 py-0.5 rounded">
                                {data.datapointCode}
                              </span>
                              <span className="text-sm font-medium text-white">{data.datapointName}</span>
                              <span className="text-xs text-[#6a6a6a]">({data.year})</span>
                            </div>
                            <p className="ml-6 text-sm text-[#cccccc] overflow-hidden text-ellipsis" style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical'
                            }}>{data.narrative}</p>
                          </div>
                          <div className="ml-4">
                            <span className={`text-xs px-2 py-1 rounded ${
                              data.confidence >= 80 ? 'bg-green-500/20 text-green-500' :
                              data.confidence >= 60 ? 'bg-yellow-500/20 text-yellow-500' :
                              'bg-red-500/20 text-red-500'
                            }`}>
                              {data.confidence}% confianza
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tendencias */}
            {extractedData.trends.length > 0 && (
              <div>
                <h4 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#0066ff]" />
                  Tendencias Identificadas
                </h4>
                <div className="space-y-2">
                  {extractedData.trends.map((trend, index) => (
                    <div key={index} className="p-3 bg-[#0a0a0a] rounded border border-[#2a2a2a]">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-xs font-bold text-[#6a6a6a] bg-[#1a1a1a] px-2 py-0.5 rounded">
                          {trend.datapointCode}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          trend.trend === 'increasing' ? 'bg-red-500/20 text-red-500' :
                          trend.trend === 'decreasing' ? 'bg-green-500/20 text-green-500' :
                          'bg-gray-500/20 text-gray-500'
                        }`}>
                          {trend.trend === 'increasing' ? '↑ Aumento' :
                           trend.trend === 'decreasing' ? '↓ Disminución' :
                           '→ Estable'}
                        </span>
                        <span className="text-xs text-[#6a6a6a]">
                          Años: {trend.years.join(', ')}
                        </span>
                      </div>
                      <p className="text-sm text-[#cccccc] ml-4">{trend.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnualReportLoader;
