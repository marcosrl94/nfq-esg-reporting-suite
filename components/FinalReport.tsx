import React, { useState, useMemo } from 'react';
import { FileBarChart, Download, FileText, CheckCircle2, AlertCircle, Clock, X, FileDown, Printer } from 'lucide-react';
import { StandardSection, WorkflowStatus } from '../types';
import { useSections } from '../contexts';
import { useMobile } from '../hooks/useMobile';

interface FinalReportProps {
  reportingYear: number;
}

const FinalReport: React.FC<FinalReportProps> = ({ reportingYear }) => {
  const { sections } = useSections();
  const { isMobile } = useMobile();
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'html' | 'xbrl'>('pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);

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
      sectionsCount
    };
  }, [approvedSections]);

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, this would:
      // 1. Collect all approved datapoints
      // 2. Generate narratives for each section
      // 3. Format according to selected format (PDF/HTML/XBRL)
      // 4. Return the generated report URL or blob
      
      const reportContent = generateReportContent();
      setGeneratedReport(reportContent);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error al generar el reporte. Por favor, inténtalo de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateReportContent = (): string => {
    let content = `NFQ ESG Reporting Suite - Annual Report ${reportingYear}\n`;
    content += `Generated: ${new Date().toLocaleDateString('es-ES')}\n\n`;
    content += `=== REPORT STATISTICS ===\n`;
    content += `Total Datapoints: ${reportStats.totalDatapoints}\n`;
    content += `Quantitative: ${reportStats.quantitativeCount}\n`;
    content += `Qualitative: ${reportStats.qualitativeCount}\n`;
    content += `Sections: ${reportStats.sectionsCount}\n\n`;

    approvedSections.forEach(section => {
      content += `\n=== ${section.code}: ${section.title} ===\n\n`;
      section.datapoints.forEach(dp => {
        content += `${dp.code}: ${dp.name}\n`;
        if (dp.type === 'quantitative') {
          const value = dp.values[reportingYear.toString()];
          content += `  Value: ${value} ${dp.unit || ''}\n`;
        } else {
          const value = dp.values[reportingYear.toString()];
          content += `  Disclosure: ${value}\n`;
        }
        content += `  Status: ${dp.status}\n`;
        if (dp.lastModified) {
          content += `  Last Modified: ${new Date(dp.lastModified).toLocaleDateString('es-ES')}\n`;
        }
        content += '\n';
      });
    });

    return content;
  };

  const downloadReport = () => {
    if (!generatedReport) return;

    const blob = new Blob([generatedReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ESG_Report_${reportingYear}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = async () => {
    // In a real implementation, this would use a PDF library like jsPDF or Puppeteer
    alert('Exportación a PDF: Esta funcionalidad requiere integración con una librería de PDF.');
  };

  const exportToHTML = async () => {
    const htmlContent = generateHTMLReport();
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ESG_Report_${reportingYear}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateHTMLReport = (): string => {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NFQ ESG Report ${reportingYear}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; background: #fff; color: #000; }
    h1 { color: #0066ff; }
    h2 { color: #333; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #0066ff; color: white; }
    .stats { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>NFQ ESG Reporting Suite</h1>
  <h2>Annual Report ${reportingYear}</h2>
  <p>Generated: ${new Date().toLocaleDateString('es-ES')}</p>
  
  <div class="stats">
    <h3>Report Statistics</h3>
    <p>Total Datapoints: ${reportStats.totalDatapoints}</p>
    <p>Quantitative: ${reportStats.quantitativeCount}</p>
    <p>Qualitative: ${reportStats.qualitativeCount}</p>
    <p>Sections: ${reportStats.sectionsCount}</p>
  </div>

  ${approvedSections.map(section => `
    <h2>${section.code}: ${section.title}</h2>
    <table>
      <thead>
        <tr>
          <th>Code</th>
          <th>Name</th>
          <th>Type</th>
          <th>Value</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${section.datapoints.map(dp => `
          <tr>
            <td>${dp.code}</td>
            <td>${dp.name}</td>
            <td>${dp.type}</td>
            <td>${dp.values[reportingYear.toString()] || 'N/A'} ${dp.unit || ''}</td>
            <td>${dp.status}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `).join('')}
</body>
</html>`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <FileBarChart className="w-5 h-5 sm:w-6 sm:h-6 text-[#0066ff]" />
            Final Report Composition
          </h2>
          <p className="text-xs sm:text-sm text-[#6a6a6a] mt-1">
            Genera y exporta el reporte final consolidado
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4">
          <p className="text-xs text-[#6a6a6a] mb-1">Total Datapoints</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{reportStats.totalDatapoints}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4">
          <p className="text-xs text-[#6a6a6a] mb-1">Quantitative</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{reportStats.quantitativeCount}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4">
          <p className="text-xs text-[#6a6a6a] mb-1">Qualitative</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{reportStats.qualitativeCount}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 sm:p-4">
          <p className="text-xs text-[#6a6a6a] mb-1">Sections</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{reportStats.sectionsCount}</p>
        </div>
      </div>

      {/* Format Selection */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 sm:p-6">
        <h3 className="text-sm sm:text-base font-medium text-white mb-4">Formato de Exportación</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { value: 'pdf', label: 'PDF', icon: FileText, description: 'Documento PDF estándar' },
            { value: 'html', label: 'HTML', icon: FileText, description: 'Página web interactiva' },
            { value: 'xbrl', label: 'XBRL', icon: FileBarChart, description: 'Formato estructurado XBRL' }
          ].map((format) => {
            const Icon = format.icon;
            return (
              <button
                key={format.value}
                onClick={() => setSelectedFormat(format.value as 'pdf' | 'html' | 'xbrl')}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  selectedFormat === format.value
                    ? 'border-[#0066ff] bg-[#0066ff]/10'
                    : 'border-[#2a2a2a] hover:border-[#0066ff]/50'
                }`}
              >
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-[#0066ff] mb-2" />
                <p className="text-sm font-medium text-white mb-1">{format.label}</p>
                <p className="text-xs text-[#6a6a6a]">{format.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Approved Sections Preview */}
      {approvedSections.length > 0 ? (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-medium text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
            Secciones Aprobadas ({approvedSections.length})
          </h3>
          <div className="space-y-2">
            {approvedSections.map(section => (
              <div
                key={section.id}
                className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded"
              >
                <div>
                  <p className="text-xs sm:text-sm font-medium text-white">
                    {section.code}: {section.title}
                  </p>
                  <p className="text-xs text-[#6a6a6a] mt-1">
                    {section.datapoints.length} datapoint(s) aprobado(s)
                  </p>
                </div>
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4 sm:p-6">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-500 mb-1">No hay secciones aprobadas</p>
              <p className="text-xs text-yellow-400">
                Aproba datapoints antes de generar el reporte final.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Generate Report */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <button
          onClick={generateReport}
          disabled={isGenerating || approvedSections.length === 0}
          className="flex-1 sm:flex-none px-6 py-3 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? (
            <>
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <FileBarChart className="w-4 h-4 sm:w-5 sm:h-5" />
              Generar Reporte
            </>
          )}
        </button>

        {generatedReport && (
          <>
            <button
              onClick={selectedFormat === 'html' ? exportToHTML : downloadReport}
              className="px-4 sm:px-6 py-3 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#0066ff] text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              Descargar {selectedFormat.toUpperCase()}
            </button>
            {selectedFormat === 'pdf' && (
              <button
                onClick={exportToPDF}
                className="px-4 sm:px-6 py-3 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#0066ff] text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
                Imprimir
              </button>
            )}
          </>
        )}
      </div>

      {/* Generated Report Preview */}
      {generatedReport && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm sm:text-base font-medium text-white">Vista Previa del Reporte</h3>
            <button
              onClick={() => setGeneratedReport(null)}
              className="text-[#6a6a6a] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded p-3 sm:p-4 max-h-64 sm:max-h-96 overflow-auto">
            <pre className="text-xs sm:text-sm text-[#cccccc] whitespace-pre-wrap font-mono">
              {generatedReport.substring(0, 1000)}
              {generatedReport.length > 1000 && '\n\n... (contenido truncado) ...'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinalReport;
