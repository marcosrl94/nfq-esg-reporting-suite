import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, FileText, Download } from 'lucide-react';
import { StandardSection, Datapoint } from '../types';
import { executeBulkImport, BulkImportResult, ColumnMapping, BulkImportConfig } from '../services/bulkImporter';
import { useSections } from '../contexts';
import { downloadCSVTemplate, downloadJSONTemplate, downloadExcelTemplate } from '../services/templateGenerator';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  section: StandardSection;
  reportingYear: number;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, section, reportingYear }) => {
  const { sections, updateDatapoint } = useSections();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [stage, setStage] = useState<string>('');
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const parseFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          
          // Try to parse as JSON first
          if (file.type === 'application/json' || file.name.endsWith('.json')) {
            const data = JSON.parse(text);
            resolve(Array.isArray(data) ? data : [data]);
            return;
          }
          
          // Try to parse as CSV
          if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            const lines = text.split('\n').filter(line => line.trim());
            if (lines.length === 0) {
              reject(new Error('El archivo CSV está vacío'));
              return;
            }
            
            const headers = lines[0].split(',').map(h => h.trim());
            const rows = lines.slice(1).map(line => {
              const values = line.split(',').map(v => v.trim());
              const row: any = {};
              headers.forEach((header, idx) => {
                const value = values[idx] || '';
                // Try to parse as number
                const numValue = parseFloat(value);
                row[header] = isNaN(numValue) ? value : numValue;
              });
              return row;
            });
            
            resolve(rows);
            return;
          }
          
          reject(new Error('Formato de archivo no soportado. Use JSON o CSV.'));
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsText(file);
    });
  };

  const handleImport = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setResult(null);
    setStage('');
    setProgress(null);
    
    try {
      // Parse file
      setStage('Leyendo archivo...');
      const parsedData = await parseFile(file);
      
      if (parsedData.length === 0) {
        throw new Error('El archivo no contiene datos');
      }
      
      // Execute bulk import
      // The updateDatapoint function is passed to executeBulkImport
      // which will handle the actual updates internally
      const importResult = await executeBulkImport(
        parsedData,
        sections,
        {
          year: reportingYear,
          dryRun: false,
          overwriteExisting: true
        },
        (currentStage, currentProgress) => {
          setStage(currentStage);
          if (currentProgress) {
            setProgress(currentProgress);
          }
        },
        updateDatapoint // Pass the actual update function
      );
      
      setResult(importResult);
    } catch (error) {
      setResult({
        success: false,
        totalRows: 0,
        processedRows: 0,
        failedRows: 0,
        mappings: [],
        errors: [{
          rowIndex: -1,
          message: error instanceof Error ? error.message : String(error)
        }],
        datapointsUpdated: []
      });
    } finally {
      setIsProcessing(false);
      setStage('');
      setProgress(null);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setFile(null);
      setResult(null);
      setStage('');
      setProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0066ff]/20 rounded-lg">
              <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6 text-[#0066ff]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Bulk Import</h2>
              <p className="text-xs sm:text-sm text-[#6a6a6a]">Importa datos masivamente desde Excel/CSV/JSON</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-[#6a6a6a] hover:text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Template Download Section */}
          {!result && !file && (
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4 sm:p-6">
              <div className="flex items-start gap-3 mb-4">
                <Download className="w-5 h-5 sm:w-6 sm:h-6 text-[#0066ff] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-white mb-1">
                    Descargar Template
                  </h3>
                  <p className="text-xs sm:text-sm text-[#6a6a6a]">
                    Descarga un template pre-configurado con todos los datapoints de esta sección para facilitar la carga masiva.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <button
                  onClick={() => downloadCSVTemplate(sections, reportingYear)}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] hover:border-[#0066ff]/50 rounded-lg transition-colors text-xs sm:text-sm text-white"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  CSV
                </button>
                <button
                  onClick={() => downloadExcelTemplate(sections, reportingYear)}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] hover:border-[#0066ff]/50 rounded-lg transition-colors text-xs sm:text-sm text-white"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel (CSV)
                </button>
                <button
                  onClick={() => downloadJSONTemplate(sections, reportingYear)}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] hover:border-[#0066ff]/50 rounded-lg transition-colors text-xs sm:text-sm text-white"
                >
                  <FileText className="w-4 h-4" />
                  JSON
                </button>
              </div>
            </div>
          )}

          {/* File Selection */}
          {!result && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-white mb-2">
                Selecciona un archivo (JSON, CSV)
              </label>
              <div className="border-2 border-dashed border-[#2a2a2a] rounded-lg p-6 sm:p-8 text-center hover:border-[#0066ff] transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv,application/json,text/csv"
                  onChange={handleFileSelect}
                  disabled={isProcessing}
                  className="hidden"
                />
                <FileSpreadsheet className="w-10 h-10 sm:w-12 sm:h-12 text-[#6a6a6a] mx-auto mb-4" />
                {file ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[#0066ff]" />
                      <span className="text-xs sm:text-sm font-medium text-white">{file.name}</span>
                    </div>
                    <p className="text-xs text-[#6a6a6a]">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs sm:text-sm text-[#aaaaaa] mb-2">Arrastra un archivo aquí o</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-[#0066ff] text-white rounded-md hover:bg-[#0052cc] disabled:opacity-50 transition-colors text-xs sm:text-sm"
                    >
                      Seleccionar archivo
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Processing Status */}
          {isProcessing && (
            <div className="bg-[#0066ff]/10 border border-[#0066ff]/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#0066ff] animate-spin flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-white">{stage}</p>
                  {progress && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs sm:text-sm text-[#aaaaaa] mb-1">
                        <span>Procesando...</span>
                        <span>{progress.processed} / {progress.total}</span>
                      </div>
                      <div className="w-full bg-[#2a2a2a] rounded-full h-2">
                        <div
                          className="bg-[#0066ff] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(progress.processed / progress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Summary */}
              <div className={`p-4 rounded-lg border-2 ${
                result.success
                  ? 'bg-green-900/20 border-green-500/50'
                  : 'bg-red-900/20 border-red-500/50'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  {result.success ? (
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 flex-shrink-0" />
                  )}
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {result.success ? 'Importación completada' : 'Error en la importación'}
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <p className="text-[#6a6a6a] mb-1">Total filas</p>
                    <p className="font-bold text-base sm:text-lg text-white">{result.totalRows}</p>
                  </div>
                  <div>
                    <p className="text-[#6a6a6a] mb-1">Procesadas</p>
                    <p className="font-bold text-base sm:text-lg text-green-500">{result.processedRows}</p>
                  </div>
                  <div>
                    <p className="text-[#6a6a6a] mb-1">Errores</p>
                    <p className="font-bold text-base sm:text-lg text-red-500">{result.failedRows}</p>
                  </div>
                </div>
              </div>

              {/* Mappings */}
              {result.mappings.length > 0 && (
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-white mb-2">Mapeos de columnas</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {result.mappings.map((mapping, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded border ${
                          mapping.confidence >= 70
                            ? 'bg-green-900/20 border-green-500/50'
                            : mapping.confidence >= 50
                            ? 'bg-yellow-900/20 border-yellow-500/50'
                            : 'bg-red-900/20 border-red-500/50'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-white truncate">
                              {mapping.sourceColumn} → {mapping.datapointCode}
                            </p>
                            {mapping.reasoning && (
                              <p className="text-xs text-[#6a6a6a] mt-1 break-words">{mapping.reasoning}</p>
                            )}
                          </div>
                          <span className={`text-xs font-bold px-2 py-1 rounded flex-shrink-0 ${
                            mapping.confidence >= 70
                              ? 'bg-green-500/20 text-green-500'
                              : mapping.confidence >= 50
                              ? 'bg-yellow-500/20 text-yellow-500'
                              : 'bg-red-500/20 text-red-500'
                          }`}>
                            {mapping.confidence}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {result.errors.length > 0 && (
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-red-500 mb-2">Errores</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {result.errors.map((error, idx) => (
                      <div key={idx} className="p-3 bg-red-900/20 border border-red-500/50 rounded text-xs sm:text-sm">
                        <p className="font-medium text-red-400">
                          Fila {error.rowIndex + 1}
                          {error.column && ` - Columna: ${error.column}`}
                          {error.datapointCode && ` - Datapoint: ${error.datapointCode}`}
                        </p>
                        <p className="text-red-300 mt-1 break-words">{error.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-[#2a2a2a] flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="px-4 py-2 border border-[#2a2a2a] text-white rounded-md hover:bg-[#2a2a2a] disabled:opacity-50 transition-colors text-xs sm:text-sm"
          >
            {result ? 'Cerrar' : 'Cancelar'}
          </button>
          {file && !result && !isProcessing && (
            <button
              onClick={handleImport}
              className="px-4 py-2 bg-[#0066ff] text-white rounded-md hover:bg-[#0052cc] transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm"
            >
              <UploadCloud className="w-4 h-4" />
              Importar datos
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;
