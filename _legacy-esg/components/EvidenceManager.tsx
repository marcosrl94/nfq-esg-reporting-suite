import React, { useState, useCallback } from 'react';
import { 
  FileText, Upload, X, CheckCircle, AlertCircle, Sparkles, 
  Download, Eye, Trash2, RefreshCw, FileCheck 
} from 'lucide-react';
import { 
  Datapoint, EvidenceFile, InformationRequirement, ExtractedEvidenceData, 
  EvidenceAnalysis 
} from '../types';
import { 
  extractEvidenceInformation, 
  analyzeEvidenceRequirements, 
  autoExtractFromEvidences 
} from '../services/evidenceService';
import { verifyEvidence } from '../services/geminiService';
import { 
  uploadEvidenceFile, 
  fetchEvidenceFiles, 
  downloadEvidenceFile, 
  updateEvidenceFile, 
  deleteEvidenceFile,
  isApiConfigured 
} from '../services/apiService';

interface EvidenceManagerProps {
  datapoint: Datapoint;
  reportingYear: number;
  onEvidenceUpdate?: (evidenceFiles: EvidenceFile[]) => void;
  informationRequirements?: InformationRequirement[];
  currentUserId: string;
}

const EvidenceManager: React.FC<EvidenceManagerProps> = ({
  datapoint,
  reportingYear,
  onEvidenceUpdate,
  informationRequirements = [],
  currentUserId
}) => {
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<EvidenceFile | null>(null);
  const [autoExtractionResult, setAutoExtractionResult] = useState<{
    suggestedValue: string | number | null;
    confidence: number;
    sources: Array<{ fileName: string; extractedValue: string | number; confidence: number }>;
    reasoning: string;
  } | null>(null);

  // Load evidence files on mount
  React.useEffect(() => {
    const loadEvidenceFiles = async () => {
      if (isApiConfigured()) {
        try {
          setLoading(true);
          const files = await fetchEvidenceFiles(datapoint.id);
          setEvidenceFiles(files);
          onEvidenceUpdate?.(files);
        } catch (error) {
          console.error('Error loading evidence files:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    loadEvidenceFiles();
  }, [datapoint.id, onEvidenceUpdate]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    const uploadedFiles: EvidenceFile[] = [];

    try {
      for (const file of Array.from(files)) {
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          alert(`El archivo "${file.name}" excede el tamaño máximo permitido de ${MAX_FILE_SIZE / 1024 / 1024}MB`);
          continue;
        }

        if (file.size === 0) {
          alert(`El archivo "${file.name}" está vacío`);
          continue;
        }

        if (isApiConfigured()) {
          // Upload to Supabase Storage and create database record
          const evidenceFile = await uploadEvidenceFile(file, datapoint.id, currentUserId);
          uploadedFiles.push(evidenceFile);
        } else {
          // Fallback: local only (POC mode)
          const evidenceFile: EvidenceFile = {
            id: `ev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            datapointId: datapoint.id,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || 'application/octet-stream',
            uploadedBy: currentUserId,
            uploadedAt: new Date().toISOString()
          };
          uploadedFiles.push(evidenceFile);
        }
      }

      if (uploadedFiles.length > 0) {
        setEvidenceFiles(prev => [...prev, ...uploadedFiles]);
        onEvidenceUpdate?.([...evidenceFiles, ...uploadedFiles]);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al subir archivos: ${errorMessage}`);
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = '';
    }
  }, [datapoint.id, currentUserId, evidenceFiles, onEvidenceUpdate]);

  const handleExtractInformation = useCallback(async (evidenceId: string) => {
    const evidence = evidenceFiles.find(ev => ev.id === evidenceId);
    if (!evidence) {
      alert('Evidencia no encontrada');
      return;
    }

    setExtracting(evidenceId);
    try {
      let file: File | null = null;

      if (isApiConfigured() && evidence.filePath) {
        // Download file from storage
        const blob = await downloadEvidenceFile(evidence);
        file = new File([blob], evidence.fileName, { type: evidence.mimeType });
      } else {
        // Fallback: ask user to select file
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.pdf,.xlsx,.xls,.doc,.docx,.txt,.csv,image/*';
        
        await new Promise<void>((resolve) => {
          fileInput.onchange = async (e) => {
            file = (e.target as HTMLInputElement).files?.[0] || null;
            resolve();
          };
          fileInput.click();
        });
      }

      if (!file) {
        setExtracting(null);
        return;
      }

      const extracted = await extractEvidenceInformation(file, datapoint, informationRequirements);
      
      // Update evidence file with extracted data
      if (isApiConfigured()) {
        await updateEvidenceFile(evidenceId, { extractedData: extracted });
      }
      
      setEvidenceFiles(prev => prev.map(ev => 
        ev.id === evidenceId 
          ? { ...ev, extractedData: extracted }
          : ev
      ));
    } catch (error) {
      console.error('Error extracting information:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al extraer información: ${errorMessage}`);
    } finally {
      setExtracting(null);
    }
  }, [datapoint, informationRequirements, evidenceFiles]);

  const handleAnalyzeRequirements = useCallback(async (evidenceId: string) => {
    if (informationRequirements.length === 0) {
      alert('No hay requisitos de información definidos para este datapoint.');
      return;
    }

    const evidence = evidenceFiles.find(ev => ev.id === evidenceId);
    if (!evidence) {
      alert('Evidencia no encontrada');
      return;
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.xlsx,.xls,.doc,.docx,.txt,.csv,image/*';
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setExtracting(evidenceId);
      try {
        const analysis = await analyzeEvidenceRequirements(file, datapoint, informationRequirements);
        
        setEvidenceFiles(prev => prev.map(ev => 
          ev.id === evidenceId 
            ? { ...ev, aiAnalysis: analysis }
            : ev
        ));
      } catch (error) {
        console.error('Error analyzing requirements:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        alert(`Error al analizar requisitos: ${errorMessage}`);
      } finally {
        setExtracting(null);
      }
    };
    fileInput.click();
  }, [datapoint, informationRequirements, evidenceFiles]);

  const handleVerifyEvidence = useCallback(async (evidenceId: string) => {
    const currentValue = datapoint.values[reportingYear.toString()];
    if (!currentValue) {
      alert('Primero debes ingresar un valor para el datapoint antes de verificar.');
      return;
    }

    const evidence = evidenceFiles.find(ev => ev.id === evidenceId);
    if (!evidence) {
      alert('Evidencia no encontrada');
      return;
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.xlsx,.xls,.doc,.docx,.txt,.csv,image/*';
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setExtracting(evidenceId);
      try {
        const result = await verifyEvidence(
          datapoint.name,
          currentValue,
          file,
          datapoint.unit || ''
        );

        setEvidenceFiles(prev => prev.map(ev => 
          ev.id === evidenceId 
            ? { 
                ...ev, 
                aiAnalysis: {
                  ...ev.aiAnalysis,
                  status: result.status,
                  extractedValue: result.extractedValue,
                  confidence: result.confidence,
                  reasoning: result.reasoning,
                  lastChecked: result.lastChecked || new Date().toISOString()
                }
              }
            : ev
        ));
      } catch (error) {
        console.error('Error verifying evidence:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        alert(`Error al verificar evidencia: ${errorMessage}`);
      } finally {
        setExtracting(null);
      }
    };
    fileInput.click();
  }, [datapoint, reportingYear, evidenceFiles]);

  const handleAutoExtractAll = useCallback(async () => {
    if (evidenceFiles.length === 0) {
      alert('Primero debes subir archivos de evidencia.');
      return;
    }

    // Get File objects from evidence files (in real app, would fetch from storage)
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = '.pdf,.xlsx,.xls,.doc,.docx,.txt,.csv,image/*';
    fileInput.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      setExtracting('auto');
      try {
        const result = await autoExtractFromEvidences(
          Array.from(files),
          datapoint,
          informationRequirements.length > 0 ? informationRequirements : undefined
        );
        setAutoExtractionResult(result);
      } catch (error) {
        console.error('Error in auto extraction:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        alert(`Error en la extracción automática: ${errorMessage}`);
      } finally {
        setExtracting(null);
      }
    };
    fileInput.click();
  }, [evidenceFiles, datapoint, informationRequirements]);

  const handleDeleteEvidence = useCallback(async (evidenceId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta evidencia?')) {
      return;
    }

    try {
      if (isApiConfigured()) {
        await deleteEvidenceFile(evidenceId);
      }
      
      setEvidenceFiles(prev => {
        const updated = prev.filter(ev => ev.id !== evidenceId);
        onEvidenceUpdate?.(updated);
        return updated;
      });
    } catch (error) {
      console.error('Error deleting evidence:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al eliminar evidencia: ${errorMessage}`);
    }
  }, [onEvidenceUpdate]);

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'mismatch':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />;
      default:
        return <FileText className="w-4 h-4 text-[#6a6a6a]" />;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
            <FileCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#0066ff]" />
            Gestión de Evidencias
          </h3>
          <p className="text-xs sm:text-sm text-[#6a6a6a] mt-1">
            Sube y gestiona evidencias para {datapoint.name}
          </p>
        </div>
        <button
          onClick={handleAutoExtractAll}
          disabled={extracting === 'auto' || evidenceFiles.length === 0}
          className="px-3 sm:px-4 py-2 bg-[#0066ff] hover:bg-[#0052cc] text-white text-xs sm:text-sm rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
          {extracting === 'auto' ? 'Extrayendo...' : 'Extracción Automática'}
        </button>
      </div>

      {/* Auto Extraction Result */}
      {autoExtractionResult && (
        <div className="bg-[#1a1a1a] border border-[#0066ff] rounded-lg p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[#00d4ff]" />
                <span className="text-sm font-medium text-white">Valor Sugerido</span>
              </div>
              <p className="text-lg sm:text-xl font-bold text-white mb-1">
                {autoExtractionResult.suggestedValue !== null 
                  ? `${autoExtractionResult.suggestedValue} ${datapoint.unit || ''}`.trim()
                  : 'No se pudo extraer valor'
                }
              </p>
              <p className="text-xs sm:text-sm text-[#6a6a6a] mb-2">
                Confianza: {autoExtractionResult.confidence}%
              </p>
              <p className="text-xs sm:text-sm text-[#6a6a6a]">
                {autoExtractionResult.reasoning}
              </p>
            </div>
            <button
              onClick={() => setAutoExtractionResult(null)}
              className="text-[#6a6a6a] hover:text-white flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Information Requirements */}
      {informationRequirements.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4">
          <h4 className="text-xs sm:text-sm font-medium text-white mb-2 flex items-center gap-2">
            <FileCheck className="w-3 h-3 sm:w-4 sm:h-4 text-[#0066ff]" />
            Requisitos de Información
          </h4>
          <ul className="space-y-1 text-xs sm:text-sm text-[#6a6a6a]">
            {informationRequirements.map((req, idx) => (
              <li key={req.id} className="flex items-start gap-2">
                <span className="text-[#0066ff] flex-shrink-0">{idx + 1}.</span>
                <span>{req.requirement}</span>
                {req.required && (
                  <span className="text-red-500 text-xs">*</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upload Area */}
      <div className="border-2 border-dashed border-[#2a2a2a] rounded-lg p-4 sm:p-6 hover:border-[#0066ff] transition-colors">
        <input
          type="file"
          id="evidence-upload"
          multiple
          onChange={handleFileUpload}
          className="hidden"
          accept=".pdf,.xlsx,.xls,.doc,.docx,.txt,.csv,image/*"
        />
        <label
          htmlFor="evidence-upload"
          className="flex flex-col items-center justify-center gap-2 sm:gap-3 cursor-pointer"
        >
          <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-[#6a6a6a]" />
          <div className="text-center">
            <p className="text-xs sm:text-sm text-white font-medium">
              {uploading ? 'Subiendo...' : 'Haz clic para subir evidencias'}
            </p>
            <p className="text-xs text-[#6a6a6a] mt-1">
              PDF, Excel, Word, imágenes
            </p>
          </div>
        </label>
      </div>

      {/* Evidence Files List */}
      {loading ? (
        <div className="text-center py-8 text-[#6a6a6a]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-xs sm:text-sm">Cargando evidencias...</p>
        </div>
      ) : evidenceFiles.length > 0 ? (
        <div className="space-y-2 sm:space-y-3">
          <h4 className="text-xs sm:text-sm font-medium text-white">
            Archivos de Evidencia ({evidenceFiles.length})
          </h4>
          {evidenceFiles.map((evidence) => (
            <div
              key={evidence.id}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4 hover:border-[#0066ff] transition-colors"
            >
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                  {getStatusIcon(evidence.aiAnalysis?.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-white truncate">
                      {evidence.fileName}
                    </p>
                    <p className="text-xs text-[#6a6a6a] mt-1">
                      {(evidence.fileSize / 1024).toFixed(2)} KB • {evidence.mimeType}
                    </p>
                    
                    {/* Extracted Data */}
                    {evidence.extractedData && (
                      <div className="mt-2 p-2 bg-[#0a0a0a] rounded border border-[#2a2a2a]">
                        <p className="text-xs text-[#00d4ff] font-medium mb-1">Datos Extraídos</p>
                        {evidence.extractedData.extractedValue && (
                          <p className="text-xs text-white">
                            Valor: {evidence.extractedData.extractedValue} {evidence.extractedData.extractedUnit || ''}
                          </p>
                        )}
                        {evidence.extractedData.extractedYear && (
                          <p className="text-xs text-[#6a6a6a]">
                            Año: {evidence.extractedData.extractedYear}
                          </p>
                        )}
                        <p className="text-xs text-[#6a6a6a] mt-1">
                          Confianza: {evidence.extractedData.confidence}%
                        </p>
                      </div>
                    )}

                    {/* AI Analysis */}
                    {evidence.aiAnalysis && (
                      <div className="mt-2 p-2 bg-[#0a0a0a] rounded border border-[#2a2a2a]">
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="w-3 h-3 text-[#00d4ff]" />
                          <p className="text-xs text-[#00d4ff] font-medium">Análisis IA</p>
                        </div>
                        <p className="text-xs text-white mb-1">
                          Estado: <span className="capitalize">{evidence.aiAnalysis.status}</span>
                        </p>
                        {evidence.aiAnalysis.reasoning && (
                          <p className="text-xs text-[#6a6a6a] mb-1">
                            {evidence.aiAnalysis.reasoning}
                          </p>
                        )}
                        {evidence.aiAnalysis.requirementsMet && evidence.aiAnalysis.requirementsMet.length > 0 && (
                          <p className="text-xs text-green-500 mt-1">
                            ✓ Requisitos cumplidos: {evidence.aiAnalysis.requirementsMet.length}
                          </p>
                        )}
                        {evidence.aiAnalysis.missingRequirements && evidence.aiAnalysis.missingRequirements.length > 0 && (
                          <p className="text-xs text-red-500 mt-1">
                            ✗ Requisitos faltantes: {evidence.aiAnalysis.missingRequirements.length}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleExtractInformation(evidence.id)}
                    disabled={extracting === evidence.id}
                    className="p-1.5 sm:p-2 text-[#6a6a6a] hover:text-[#00d4ff] transition-colors disabled:opacity-50"
                    title="Extraer información"
                  >
                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  {informationRequirements.length > 0 && (
                    <button
                      onClick={() => handleAnalyzeRequirements(evidence.id)}
                      disabled={extracting === evidence.id}
                      className="p-1.5 sm:p-2 text-[#6a6a6a] hover:text-[#0066ff] transition-colors disabled:opacity-50"
                      title="Analizar requisitos"
                    >
                      <FileCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleVerifyEvidence(evidence.id)}
                    disabled={extracting === evidence.id}
                    className="p-1.5 sm:p-2 text-[#6a6a6a] hover:text-green-500 transition-colors disabled:opacity-50"
                    title="Verificar evidencia"
                  >
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteEvidence(evidence.id)}
                    className="p-1.5 sm:p-2 text-[#6a6a6a] hover:text-red-500 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-[#6a6a6a]">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs sm:text-sm">No hay evidencias subidas aún</p>
        </div>
      )}
    </div>
  );
};

export default EvidenceManager;
