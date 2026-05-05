import React, { useState, useCallback, useEffect } from 'react';
import {
  FileText, Upload, X, CheckCircle, AlertCircle, Sparkles,
  Trash2, RefreshCw, FileCheck, Folder, FolderOpen, ChevronDown, ChevronRight,
  MapPin, Building2, Factory
} from 'lucide-react';
import {
  EvidenceFile, ConsolidationSource, Datapoint, InformationRequirement
} from '../types';
import {
  uploadEvidenceFile,
  fetchEvidenceFiles,
  downloadEvidenceFile,
  updateEvidenceFile,
  deleteEvidenceFile,
  isApiConfigured
} from '../services/apiService';
import {
  extractEvidenceInformation,
  analyzeEvidenceRequirements,
  autoExtractFromEvidences
} from '../services/evidenceService';
import { verifyEvidence } from '../services/geminiService';
import { useMobile } from '../hooks/useMobile';

interface SourceEvidenceManagerProps {
  datapoint: Datapoint;
  sources: ConsolidationSource[];
  reportingYear: number;
  onEvidenceUpdate?: (sourceId: string, evidenceFiles: EvidenceFile[]) => void;
  informationRequirements?: InformationRequirement[];
  currentUserId: string;
}

interface SourceEvidenceGroup {
  source: ConsolidationSource;
  evidenceFiles: EvidenceFile[];
  expanded: boolean;
}

const SourceEvidenceManager: React.FC<SourceEvidenceManagerProps> = ({
  datapoint,
  sources,
  reportingYear,
  onEvidenceUpdate,
  informationRequirements = [],
  currentUserId
}) => {
  const { isMobile } = useMobile();
  const [sourceGroups, setSourceGroups] = useState<SourceEvidenceGroup[]>([]);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [extracting, setExtracting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSourceForUpload, setSelectedSourceForUpload] = useState<string | null>(null);

  // Load evidence files for all sources
  useEffect(() => {
    const loadEvidenceFiles = async () => {
      if (isApiConfigured()) {
        try {
          setLoading(true);
          const allFiles = await fetchEvidenceFiles(datapoint.id);
          
          // Group files by source
          const groups: SourceEvidenceGroup[] = sources.map(source => ({
            source,
            evidenceFiles: allFiles.filter(ef => ef.sourceId === source.id),
            expanded: false
          }));

          // Add general evidence (not associated with any source)
          const generalFiles = allFiles.filter(ef => !ef.sourceId);
          if (generalFiles.length > 0) {
            groups.unshift({
              source: {
                id: 'general',
                name: 'Evidencias Generales',
                type: 'geography',
                responsibleUserId: currentUserId,
                responsibleUserName: 'General',
                values: {},
                lastUpdated: new Date().toISOString(),
                status: 'Draft' as any
              },
              evidenceFiles: generalFiles,
              expanded: true
            } as SourceEvidenceGroup);
          }

          setSourceGroups(groups);
        } catch (error) {
          console.error('Error loading evidence files:', error);
        } finally {
          setLoading(false);
        }
      } else {
        // Fallback: initialize with empty groups
        setSourceGroups(sources.map(source => ({
          source,
          evidenceFiles: [],
          expanded: false
        })));
        setLoading(false);
      }
    };

    loadEvidenceFiles();
  }, [datapoint.id, sources, currentUserId]);

  const handleFileUpload = useCallback(async (
    event: React.ChangeEvent<HTMLInputElement>,
    sourceId: string | null
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const uploadKey = sourceId || 'general';
    setUploading(prev => ({ ...prev, [uploadKey]: true }));
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    const uploadedFiles: EvidenceFile[] = [];

    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_SIZE) {
          alert(`El archivo "${file.name}" excede el tamaño máximo permitido de ${MAX_FILE_SIZE / 1024 / 1024}MB`);
          continue;
        }

        if (file.size === 0) {
          alert(`El archivo "${file.name}" está vacío`);
          continue;
        }

        if (isApiConfigured()) {
          const evidenceFile = await uploadEvidenceFile(file, datapoint.id, currentUserId);
          
          // Update with sourceId if provided
          if (sourceId) {
            const updatedFile = await updateEvidenceFile(evidenceFile.id, {
              ...evidenceFile,
              sourceId,
              hierarchy: sourceId !== 'general' ? {
                level: sources.find(s => s.id === sourceId)?.type || 'geography',
                value: sources.find(s => s.id === sourceId)?.name || ''
              } : undefined
            } as any);
            uploadedFiles.push(updatedFile);
          } else {
            uploadedFiles.push(evidenceFile);
          }
        } else {
          // Fallback: local only
          const evidenceFile: EvidenceFile = {
            id: `ev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            datapointId: datapoint.id,
            sourceId: sourceId || undefined,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || 'application/octet-stream',
            uploadedBy: currentUserId,
            uploadedAt: new Date().toISOString(),
            hierarchy: sourceId && sourceId !== 'general' ? {
              level: sources.find(s => s.id === sourceId)?.type || 'geography',
              value: sources.find(s => s.id === sourceId)?.name || ''
            } : undefined
          };
          uploadedFiles.push(evidenceFile);
        }
      }

      if (uploadedFiles.length > 0) {
        setSourceGroups(prev => prev.map(group => {
          if (group.source.id === (sourceId || 'general')) {
            return {
              ...group,
              evidenceFiles: [...group.evidenceFiles, ...uploadedFiles]
            };
          }
          return group;
        }));

        const targetGroup = sourceGroups.find(g => g.source.id === (sourceId || 'general'));
        onEvidenceUpdate?.(sourceId || 'general', [
          ...(targetGroup?.evidenceFiles || []),
          ...uploadedFiles
        ]);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al subir archivos: ${errorMessage}`);
    } finally {
      setUploading(prev => ({ ...prev, [uploadKey]: false }));
      event.target.value = '';
    }
  }, [datapoint.id, currentUserId, sources, sourceGroups, onEvidenceUpdate]);

  const handleDeleteEvidence = useCallback(async (evidenceId: string, sourceId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta evidencia?')) {
      return;
    }

    try {
      if (isApiConfigured()) {
        await deleteEvidenceFile(evidenceId);
      }

      setSourceGroups(prev => prev.map(group => {
        if (group.source.id === sourceId) {
          return {
            ...group,
            evidenceFiles: group.evidenceFiles.filter(ef => ef.id !== evidenceId)
          };
        }
        return group;
      }));

      const targetGroup = sourceGroups.find(g => g.source.id === sourceId);
      onEvidenceUpdate?.(sourceId, (targetGroup?.evidenceFiles || []).filter(ef => ef.id !== evidenceId));
    } catch (error) {
      console.error('Error deleting evidence:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al eliminar evidencia: ${errorMessage}`);
    }
  }, [sourceGroups, onEvidenceUpdate]);

  const toggleSourceExpanded = useCallback((sourceId: string) => {
    setSourceGroups(prev => prev.map(group =>
      group.source.id === sourceId
        ? { ...group, expanded: !group.expanded }
        : group
    ));
  }, []);

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />;
      case 'mismatch':
        return <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />;
      case 'pending':
        return <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 animate-spin" />;
      default:
        return <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-[#6a6a6a]" />;
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'geography':
        return <MapPin className="w-4 h-4 text-[#0066ff]" />;
      case 'business_unit':
      case 'subsidiary':
        return <Building2 className="w-4 h-4 text-[#0066ff]" />;
      case 'facility':
        return <Factory className="w-4 h-4 text-[#0066ff]" />;
      default:
        return <Folder className="w-4 h-4 text-[#0066ff]" />;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-[#6a6a6a]">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
        <p className="text-xs sm:text-sm">Cargando evidencias por fuente...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
            <FileCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#0066ff]" />
            Evidencias por Fuente de Consolidación
          </h3>
          <p className="text-xs sm:text-sm text-[#6a6a6a] mt-1">
            Gestiona evidencias organizadas por jerarquía (geografía, unidad de negocio, etc.)
          </p>
        </div>
      </div>

      {/* Source Groups */}
      <div className="space-y-2 sm:space-y-3">
        {sourceGroups.map((group) => {
          const isGeneral = group.source.id === 'general';
          const Icon = isGeneral ? Folder : getSourceIcon(group.source.type);
          
          return (
            <div
              key={group.source.id}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden"
            >
              {/* Source Header */}
              <div
                className="flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-[#0a0a0a] transition-colors"
                onClick={() => toggleSourceExpanded(group.source.id)}
              >
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  {group.expanded ? (
                    <ChevronDown className="w-4 h-4 text-[#6a6a6a] flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[#6a6a6a] flex-shrink-0" />
                  )}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {Icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-white truncate">
                      {group.source.name}
                    </p>
                    {!isGeneral && (
                      <p className="text-xs text-[#6a6a6a] mt-0.5">
                        Responsable: {group.source.responsibleUserName}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-[#6a6a6a] bg-[#0a0a0a] px-2 py-1 rounded">
                      {group.evidenceFiles.length} archivo(s)
                    </span>
                  </div>
                </div>
              </div>

              {/* Source Content (when expanded) */}
              {group.expanded && (
                <div className="border-t border-[#2a2a2a] p-3 sm:p-4 space-y-3 sm:space-y-4">
                  {/* Upload Area */}
                  <div className="border-2 border-dashed border-[#2a2a2a] rounded-lg p-3 sm:p-4 hover:border-[#0066ff] transition-colors">
                    <input
                      type="file"
                      id={`evidence-upload-${group.source.id}`}
                      multiple
                      onChange={(e) => handleFileUpload(e, isGeneral ? null : group.source.id)}
                      className="hidden"
                      accept=".pdf,.xlsx,.xls,.doc,.docx,.txt,.csv,image/*"
                    />
                    <label
                      htmlFor={`evidence-upload-${group.source.id}`}
                      className="flex flex-col items-center justify-center gap-2 sm:gap-3 cursor-pointer"
                    >
                      <Upload className={`w-5 h-5 sm:w-6 sm:h-6 ${uploading[group.source.id] ? 'animate-bounce text-[#0066ff]' : 'text-[#6a6a6a]'}`} />
                      <div className="text-center">
                        <p className="text-xs sm:text-sm text-white font-medium">
                          {uploading[group.source.id] ? 'Subiendo...' : 'Haz clic para subir evidencias'}
                        </p>
                        <p className="text-xs text-[#6a6a6a] mt-1">
                          PDF, Excel, Word, imágenes
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Evidence Files List */}
                  {group.evidenceFiles.length > 0 ? (
                    <div className="space-y-2">
                      {group.evidenceFiles.map((evidence) => (
                        <div
                          key={evidence.id}
                          className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-2 sm:p-3 hover:border-[#0066ff]/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
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
                                  <div className="mt-2 p-2 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                                    <p className="text-xs text-[#00d4ff] font-medium mb-1">Datos Extraídos</p>
                                    {evidence.extractedData.extractedValue && (
                                      <p className="text-xs text-white">
                                        Valor: {evidence.extractedData.extractedValue} {evidence.extractedData.extractedUnit || ''}
                                      </p>
                                    )}
                                    <p className="text-xs text-[#6a6a6a] mt-1">
                                      Confianza: {evidence.extractedData.confidence}%
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteEvidence(evidence.id, group.source.id)}
                              className="p-1.5 text-[#6a6a6a] hover:text-red-500 transition-colors flex-shrink-0"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-[#6a6a6a]">
                      <FileText className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p className="text-xs sm:text-sm">No hay evidencias para esta fuente</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {sourceGroups.length === 0 && (
        <div className="text-center py-8 text-[#6a6a6a]">
          <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs sm:text-sm">No hay fuentes de consolidación configuradas</p>
          <p className="text-xs text-[#6a6a6a] mt-1">
            Configura fuentes en la pestaña de Consolidación primero
          </p>
        </div>
      )}
    </div>
  );
};

export default SourceEvidenceManager;
