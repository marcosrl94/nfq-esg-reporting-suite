/**
 * Report Generator Service - Generación de reportes alineados con mejores prácticas
 */
import { StandardSection, Datapoint, WorkflowStatus } from '../types';
import { ReportConfiguration, TopicConfiguration } from './reportConfigurationService';
import { generateNarrativeStream } from './geminiService';
import { ESRS_TAXONOMY_VERSION } from './esrsTaxonomy';

export interface GeneratedReport {
  id: string;
  configuration: ReportConfiguration;
  sections: ReportSection[];
  metadata: {
    generatedAt: string;
    generatedBy: string;
    version: number;
    esrsTaxonomyVersion?: string;
  };
}

export interface ReportSection {
  sectionCode: string;
  sectionTitle: string;
  standards: string[];
  narrative?: string;
  datapoints: ReportDatapoint[];
  /** Trazabilidad Workiva-style: IDs de datapoints que alimentan la sección */
  linkedDatapointIds: string[];
  comparatives?: ComparativeData[];
  targets?: TargetData[];
  evidence?: EvidenceReference[];
}

export interface ReportDatapoint {
  id: string;
  code: string;
  name: string;
  type: 'quantitative' | 'qualitative';
  value: string | number | null;
  unit?: string;
  year: number;
  standards: string[];
  mappings?: Record<string, string>;
  evidence?: string[];
}

export interface ComparativeData {
  year: number;
  value: string | number | null;
  change?: number; // Percentage change
  trend?: 'increasing' | 'decreasing' | 'stable';
}

export interface TargetData {
  targetYear: number;
  targetValue: string | number;
  currentValue: string | number;
  progress: number; // Percentage
}

export interface EvidenceReference {
  id: string;
  fileName: string;
  type: string;
  verified: boolean;
}

/**
 * Genera un reporte completo basado en la configuración
 */
export async function generateComprehensiveReport(
  sections: StandardSection[],
  config: ReportConfiguration,
  reportingYear: number,
  onProgress?: (progress: number, message: string) => void
): Promise<GeneratedReport> {
  onProgress?.(0, 'Iniciando generación de reporte...');

  const reportSections: ReportSection[] = [];

  // Filtrar secciones según configuración
  const includedSections = sections.filter(section => {
    const topicConfig = config.topicConfigurations[section.id];
    return topicConfig?.include !== false;
  });

  onProgress?.(10, `Procesando ${includedSections.length} secciones...`);

  // Procesar cada sección
  for (let i = 0; i < includedSections.length; i++) {
    const section = includedSections[i];
    const topicConfig = config.topicConfigurations[section.id];
    
    if (!topicConfig || !topicConfig.include) continue;

    onProgress?.(
      10 + (i / includedSections.length) * 70,
      `Procesando ${section.code}: ${section.title}...`
    );

    const reportSection = await processSection(
      section,
      topicConfig,
      config,
      reportingYear
    );

    reportSections.push(reportSection);
  }

  onProgress?.(90, 'Finalizando reporte...');

  const report: GeneratedReport = {
    id: `report_${Date.now()}`,
    configuration: config,
    sections: reportSections,
    metadata: {
      generatedAt: new Date().toISOString(),
      generatedBy: config.metadata.preparedBy || 'System',
      version: 1,
      esrsTaxonomyVersion: ESRS_TAXONOMY_VERSION
    }
  };

  onProgress?.(100, 'Reporte generado exitosamente');

  return report;
}

/**
 * Procesa una sección individual
 */
async function processSection(
  section: StandardSection,
  topicConfig: TopicConfiguration,
  config: ReportConfiguration,
  reportingYear: number
): Promise<ReportSection> {
  // Filtrar datapoints aprobados
  const approvedDatapoints = section.datapoints.filter(
    dp => dp.status === WorkflowStatus.APPROVED || dp.status === WorkflowStatus.LOCKED
  );

  // Procesar datapoints
  const reportDatapoints: ReportDatapoint[] = approvedDatapoints.map(dp => {
    const value = dp.values[reportingYear.toString()];
    
    // Obtener estándares desde mappings
    const standards: string[] = [];
    if (dp.mappings) {
      Object.keys(dp.mappings).forEach(std => {
        if (topicConfig.applicableStandards.includes(std as any)) {
          standards.push(std);
        }
      });
    }

    return {
      id: dp.id,
      code: dp.code,
      name: dp.name,
      type: dp.type,
      value: value,
      unit: dp.unit,
      year: reportingYear,
      standards,
      mappings: dp.mappings,
      evidence: dp.evidence
    };
  });

  // Generar narrativa si está configurado
  let narrative: string | undefined;
  if (topicConfig.includeNarrative && approvedDatapoints.length > 0) {
    try {
      // Usar Narrative Engine para generar narrativa
      narrative = await generateSectionNarrative(
        approvedDatapoints,
        section.title,
        config,
        topicConfig
      );
    } catch (error) {
      console.error(`Error generating narrative for ${section.code}:`, error);
      narrative = `[Narrativa pendiente para ${section.code}]`;
    }
  }

  // Calcular comparativas si está configurado
  const comparatives: ComparativeData[] | undefined = topicConfig.includeComparatives
    ? calculateComparatives(approvedDatapoints, reportingYear)
    : undefined;

  // Obtener targets si están disponibles
  const targets: TargetData[] | undefined = topicConfig.includeTargets
    ? extractTargets(approvedDatapoints, reportingYear)
    : undefined;

  // Referencias a evidencias
  const evidence: EvidenceReference[] | undefined = topicConfig.includeEvidence
    ? extractEvidenceReferences(approvedDatapoints)
    : undefined;

  return {
    sectionCode: section.code,
    sectionTitle: section.title,
    standards: topicConfig.applicableStandards,
    narrative,
    datapoints: reportDatapoints,
    linkedDatapointIds: approvedDatapoints.map(d => d.id),
    comparatives,
    targets,
    evidence
  };
}

/**
 * Genera narrativa para una sección
 */
async function generateSectionNarrative(
  datapoints: Datapoint[],
  sectionTitle: string,
  config: ReportConfiguration,
  topicConfig: TopicConfiguration
): Promise<string> {
  // Preparar datos para la narrativa
  const narrativeData = datapoints
    .filter(d => d.values && Object.values(d.values).some(v => v !== null && v !== ''))
    .map(d => ({
      code: d.code,
      name: d.name,
      values: d.values,
      unit: d.unit,
      description: d.description
    }));

  if (narrativeData.length === 0) {
    return '';
  }

  // Construir prompt considerando estándares y mejores prácticas
  const standardsText = topicConfig.applicableStandards.join(', ');
  const tone = config.format.language === 'es' ? 'formal' : 'professional';

  let narrative = '';

  // Usar generateNarrativeStream si está disponible
  try {
    await generateNarrativeStream(
      datapoints,
      sectionTitle,
      tone,
      (chunk) => {
        narrative += chunk;
      }
    );
  } catch (error) {
    console.error('Error generating narrative stream:', error);
    // Fallback a narrativa básica
    narrative = generateBasicNarrative(datapoints, sectionTitle, config);
  }

  return narrative;
}

/**
 * Genera narrativa básica como fallback
 */
function generateBasicNarrative(
  datapoints: Datapoint[],
  sectionTitle: string,
  config: ReportConfiguration
): string {
  let narrative = `## ${sectionTitle}\n\n`;
  
  datapoints.forEach(dp => {
    const value = dp.values[Object.keys(dp.values).sort().reverse()[0]];
    if (value !== null && value !== '') {
      narrative += `### ${dp.name}\n`;
      if (dp.type === 'quantitative') {
        narrative += `El valor reportado para ${dp.code} es ${value}${dp.unit ? ` ${dp.unit}` : ''}.\n\n`;
      } else {
        narrative += `${value}\n\n`;
      }
    }
  });

  return narrative;
}

/**
 * Calcula comparativas con años anteriores
 */
function calculateComparatives(
  datapoints: Datapoint[],
  reportingYear: number
): ComparativeData[] {
  const comparatives: ComparativeData[] = [];
  
  datapoints.forEach(dp => {
    if (dp.type !== 'quantitative') return;
    
    const currentValue = dp.values[reportingYear.toString()];
    if (currentValue === null || currentValue === undefined) return;

    // Buscar valores de años anteriores
    const years = Object.keys(dp.values)
      .map(Number)
      .filter(y => y < reportingYear && dp.values[y.toString()] !== null)
      .sort((a, b) => b - a);

    years.forEach(year => {
      const previousValue = Number(dp.values[year.toString()]);
      const currentNum = Number(currentValue);
      
      if (!isNaN(previousValue) && !isNaN(currentNum) && previousValue !== 0) {
        const change = ((currentNum - previousValue) / previousValue) * 100;
        const trend = change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable';
        
        comparatives.push({
          year,
          value: previousValue,
          change: Math.round(change * 100) / 100,
          trend
        });
      }
    });
  });

  return comparatives;
}

/**
 * Extrae targets/metas si están disponibles
 */
function extractTargets(
  datapoints: Datapoint[],
  reportingYear: number
): TargetData[] {
  // Por ahora, retornar array vacío
  // En el futuro, esto podría extraerse de campos específicos o de narrativas
  return [];
}

/**
 * Extrae referencias a evidencias
 */
function extractEvidenceReferences(datapoints: Datapoint[]): EvidenceReference[] {
  const evidence: EvidenceReference[] = [];

  datapoints.forEach(dp => {
    if (dp.evidence && Array.isArray(dp.evidence)) {
      dp.evidence.forEach((ev, index) => {
        evidence.push({
          id: `${dp.id}_evidence_${index}`,
          fileName: typeof ev === 'string' ? ev : ev.fileName || 'Unknown',
          type: typeof ev === 'string' ? 'file' : ev.type || 'file',
          verified: typeof ev === 'object' ? ev.verified || false : false
        });
      });
    }
  });

  return evidence;
}

/**
 * Genera HTML del reporte
 */
export function generateHTMLReport(
  report: GeneratedReport,
  config: ReportConfiguration
): string {
  const { sections, metadata } = report;
  
  let html = `<!DOCTYPE html>
<html lang="${config.format.language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metadata.generatedBy} - Annual ESG Report ${config.metadata.reportingPeriod}</title>
  <style>
    ${getReportStyles(config)}
  </style>
</head>
<body>
  <div class="report-container">
    ${generateReportHeader(config, metadata)}
    ${config.structure.tableOfContents ? generateTableOfContents(sections) : ''}
    ${config.structure.includeExecutiveSummary ? generateExecutiveSummary(sections, config) : ''}
    ${generateSections(sections, config)}
    ${config.structure.includeMethodology ? generateMethodology(config) : ''}
    ${config.structure.includeAssuranceStatement ? generateAssuranceStatement(config) : ''}
    ${config.structure.includeAppendices ? generateAppendices(sections) : ''}
  </div>
</body>
</html>`;

  return html;
}

function getReportStyles(config: ReportConfiguration): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
      padding: 40px;
    }
    .report-container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #0066ff; font-size: 2.5em; margin-bottom: 20px; }
    h2 { color: #333; font-size: 2em; margin-top: 40px; margin-bottom: 20px; border-bottom: 2px solid #0066ff; padding-bottom: 10px; }
    h3 { color: #555; font-size: 1.5em; margin-top: 30px; margin-bottom: 15px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #0066ff; color: white; font-weight: bold; }
    .narrative { margin: 20px 0; line-height: 1.8; }
    .comparative { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0; }
    .target { background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 10px 0; }
    .evidence-ref { font-size: 0.9em; color: #666; margin-top: 5px; }
  `;
}

function generateReportHeader(config: ReportConfiguration, metadata: any): string {
  return `
    <header style="margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #0066ff;">
      <h1>${metadata.generatedBy || 'Organización'}</h1>
      <h2>Informe Anual de Sostenibilidad ${config.metadata.reportingPeriod}</h2>
      <p style="margin-top: 10px; color: #666;">
        Generado: ${new Date(metadata.generatedAt).toLocaleDateString(config.format.language === 'es' ? 'es-ES' : 'en-US')}
        ${config.metadata.preparedBy ? ` | Preparado por: ${config.metadata.preparedBy}` : ''}
      </p>
      <div style="margin-top: 20px;">
        <p><strong>Estándares aplicados:</strong> ${config.standards.join(', ')}</p>
      </div>
    </header>
  `;
}

function generateTableOfContents(sections: ReportSection[]): string {
  let toc = '<nav style="margin: 40px 0; padding: 20px; background: #f5f5f5; border-radius: 5px;"><h2>Índice de Contenidos</h2><ul style="list-style: none; padding-left: 0;">';
  
  sections.forEach((section, index) => {
    toc += `<li style="margin: 10px 0;"><a href="#section-${index}" style="color: #0066ff; text-decoration: none;">${section.sectionCode}: ${section.sectionTitle}</a></li>`;
  });
  
  toc += '</ul></nav>';
  return toc;
}

function generateExecutiveSummary(sections: ReportSection[], config: ReportConfiguration): string {
  return `
    <section style="margin: 40px 0;">
      <h2>Resumen Ejecutivo</h2>
      <div class="narrative">
        <p>Este informe presenta el desempeño ESG de ${config.metadata.organizationName} para el período ${config.metadata.reportingPeriod}, 
        alineado con los estándares ${config.standards.join(', ')}.</p>
        <p>El informe incluye ${sections.length} secciones principales, cubriendo aspectos ambientales, sociales y de gobernanza.</p>
      </div>
    </section>
  `;
}

function generateSections(sections: ReportSection[], config: ReportConfiguration): string {
  return sections.map((section, index) => `
    <section id="section-${index}" style="margin: 40px 0;">
      <h2>${section.sectionCode}: ${section.sectionTitle}</h2>
      
      ${section.narrative ? `<div class="narrative">${section.narrative}</div>` : ''}
      
      ${section.datapoints.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Indicador</th>
              <th>Tipo</th>
              <th>Valor ${config.metadata.reportingPeriod}</th>
              ${config.bestPractices.includeComparatives && section.comparatives ? '<th>Año Anterior</th><th>Cambio</th>' : ''}
              <th>Estándares</th>
            </tr>
          </thead>
          <tbody>
            ${section.datapoints.map(dp => `
              <tr>
                <td>${dp.code}</td>
                <td>${dp.name}</td>
                <td>${dp.type === 'quantitative' ? 'Cuantitativo' : 'Cualitativo'}</td>
                <td>${dp.value} ${dp.unit || ''}</td>
                ${config.bestPractices.includeComparatives && section.comparatives ? `
                  <td>${section.comparatives.find(c => c.year === Number(config.metadata.reportingPeriod) - 1)?.value || 'N/A'}</td>
                  <td>${section.comparatives.find(c => c.year === Number(config.metadata.reportingPeriod) - 1)?.change ? 
                    `${section.comparatives.find(c => c.year === Number(config.metadata.reportingPeriod) - 1)!.change}%` : 'N/A'}</td>
                ` : ''}
                <td>${dp.standards.join(', ')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
      
      ${section.evidence && section.evidence.length > 0 ? `
        <div style="margin-top: 20px;">
          <h3>Evidencias</h3>
          <ul>
            ${section.evidence.map(ev => `<li>${ev.fileName} ${ev.verified ? '(Verificado)' : ''}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </section>
  `).join('');
}

function generateMethodology(config: ReportConfiguration): string {
  return `
    <section style="margin: 40px 0;">
      <h2>Metodología</h2>
      <div class="narrative">
        <p>Este informe ha sido preparado siguiendo las metodologías establecidas por ${config.standards.join(', ')}.</p>
        <p>Los datos han sido recopilados y validados según los procesos internos de la organización.</p>
      </div>
    </section>
  `;
}

function generateAssuranceStatement(config: ReportConfiguration): string {
  return `
    <section style="margin: 40px 0;">
      <h2>Declaración de Aseguramiento</h2>
      <div class="narrative">
        <p>[Declaración de aseguramiento externo - Pendiente de configuración]</p>
      </div>
    </section>
  `;
}

function generateAppendices(sections: ReportSection[]): string {
  return `
    <section style="margin: 40px 0;">
      <h2>Apéndices</h2>
      <div class="narrative">
        <p>Información adicional y detalles complementarios del informe.</p>
      </div>
    </section>
  `;
}

// ============================================
// EXPORT MEMORIA .CSV / .XLS (Sygris Módulo 08)
// ============================================

/** Escapa valor para CSV (comillas si contiene coma, salto de línea, etc.) */
function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Genera export CSV completo (memoria de datos - Sygris Módulo 08)
 * Compatible con Excel al abrir como .csv
 */
export function generateCSVReport(report: GeneratedReport): string {
  const rows: string[][] = [];
  const sep = ';'; // Separador europeo (Excel ES)

  // Cabecera metadata
  rows.push(['Informe ESG - Memoria de Datos', '']);
  rows.push(['Generado', new Date(report.metadata.generatedAt).toLocaleString('es-ES')]);
  rows.push(['Organización', report.configuration.metadata.organizationName]);
  rows.push(['Período', report.configuration.metadata.reportingPeriod]);
  rows.push(['Estándares', report.configuration.standards.join(', ')]);
  rows.push([]);

  // Cabecera tabla
  rows.push([
    'Sección',
    'Código Sección',
    'Código Indicador',
    'Indicador',
    'Tipo',
    'Valor',
    'Unidad',
    'Año',
    'Estándares',
    'Evidencias'
  ]);

  report.sections.forEach(section => {
    section.datapoints.forEach(dp => {
      const evidenceList = (dp.evidence && dp.evidence.length > 0)
        ? dp.evidence.join('; ')
        : '';
      rows.push([
        section.sectionTitle,
        section.sectionCode,
        dp.code,
        dp.name,
        dp.type === 'quantitative' ? 'Cuantitativo' : 'Cualitativo',
        String(dp.value ?? ''),
        dp.unit || '',
        String(dp.year),
        dp.standards?.join(', ') || '',
        evidenceList
      ]);
    });
  });

  return rows.map(row => row.map(escapeCSV).join(sep)).join('\r\n');
}

/**
 * Genera export Excel-compatible (XML Spreadsheet - .xls)
 * Formato legacy que Excel abre sin librerías externas
 */
export function generateExcelReport(report: GeneratedReport): string {
  const escapeXml = (v: string | number | null | undefined) => {
    const s = String(v ?? '');
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#0066FF" ss:Pattern="Solid"/><Font ss:Color="#FFFFFF"/></Style>
  <Style ss:ID="Default"><Alignment ss:Vertical="Bottom"/></Style>
 </Styles>
 <Worksheet ss:Name="Memoria ESG">
  <Table>`;

  // Cabecera
  xml += `
   <Row><Cell ss:StyleID="Header"><Data ss:Type="String">Informe ESG - Memoria de Datos</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Generado</Data></Cell><Cell><Data ss:Type="String">${escapeXml(new Date(report.metadata.generatedAt).toLocaleString('es-ES'))}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Organización</Data></Cell><Cell><Data ss:Type="String">${escapeXml(report.configuration.metadata.organizationName)}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Período</Data></Cell><Cell><Data ss:Type="String">${escapeXml(report.configuration.metadata.reportingPeriod)}</Data></Cell></Row>
   <Row/>`;

  const headers = ['Sección', 'Código', 'Indicador', 'Tipo', 'Valor', 'Unidad', 'Año', 'Estándares'];
  xml += '\n   <Row>';
  headers.forEach(h => {
    xml += `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`;
  });
  xml += '</Row>';

  report.sections.forEach(section => {
    section.datapoints.forEach(dp => {
      const val = dp.value;
      const type = typeof val === 'number' ? 'Number' : 'String';
      xml += `
   <Row>
    <Cell><Data ss:Type="String">${escapeXml(section.sectionTitle)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(dp.code)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(dp.name)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(dp.type === 'quantitative' ? 'Cuantitativo' : 'Cualitativo')}</Data></Cell>
    <Cell><Data ss:Type="${type}">${escapeXml(val)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(dp.unit)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(dp.year)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(dp.standards?.join(', '))}</Data></Cell>
   </Row>`;
    });
  });

  xml += `
  </Table>
 </Worksheet>
</Workbook>`;
  return xml;
}
