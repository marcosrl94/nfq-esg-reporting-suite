/**
 * Report Configuration Service - Configuración avanzada de reportes
 */
import { StandardType, StandardSection } from '../types';

export interface ReportConfiguration {
  // Estándares a incluir
  standards: StandardType[];
  
  // Configuración por topic/sección
  topicConfigurations: Record<string, TopicConfiguration>;
  
  // Formato y estilo
  format: {
    language: 'es' | 'en' | 'pt';
    currency: string;
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    numberFormat: 'european' | 'us'; // 1.234,56 vs 1,234.56
  };
  
  // Estructura del reporte
  structure: {
    includeExecutiveSummary: boolean;
    includeMethodology: boolean;
    includeAssuranceStatement: boolean;
    includeAppendices: boolean;
    tableOfContents: boolean;
  };
  
  // Mejores prácticas
  bestPractices: {
    includeComparatives: boolean; // Comparación con años anteriores
    includeBenchmarks: boolean; // Comparación con sector
    includeTargets: boolean; // Objetivos y metas
    includeAssurance: boolean; // Declaración de aseguramiento
    includeStakeholderEngagement: boolean;
  };
  
  // Visualización
  visualization: {
    includeCharts: boolean;
    includeTables: boolean;
    chartStyle: 'minimal' | 'detailed' | 'corporate';
  };
  
  // Metadata
  metadata: {
    organizationName: string;
    reportingPeriod: string;
    /** Frecuencia de reporte (Sygris: anual, trimestral, mensual) */
    reportingFrequency?: 'annual' | 'quarterly' | 'monthly';
    preparedBy: string;
    reviewedBy?: string;
    approvedBy?: string;
  };
}

export interface TopicConfiguration {
  topicCode: string;
  topicName: string;
  
  // Estándares aplicables a este topic
  applicableStandards: StandardType[];
  
  // Prioridad de estándares (orden de presentación)
  standardPriority: StandardType[];
  
  // Incluir o excluir
  include: boolean;
  
  // Configuración específica
  includeNarrative: boolean;
  includeData: boolean;
  includeEvidence: boolean;
  includeAssurance: boolean;
  
  // Mejores prácticas específicas
  includeComparatives: boolean;
  includeTargets: boolean;
  includeBenchmarks: boolean;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  configuration: Partial<ReportConfiguration>;
  applicableStandards: StandardType[];
  bestFor: string[]; // e.g., ["ESRS", "GRI", "Large Companies"]
}

// Templates predefinidos basados en mejores prácticas
export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'esrs-comprehensive',
    name: 'ESRS Comprehensive',
    description: 'Reporte completo alineado con ESRS/CSRD, incluyendo todas las secciones obligatorias',
    applicableStandards: [StandardType.ESRS],
    bestFor: ['ESRS', 'CSRD', 'Large Companies'],
    configuration: {
      standards: [StandardType.ESRS],
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
      }
    }
  },
  {
    id: 'gri-universal',
    name: 'GRI Universal Standards',
    description: 'Reporte GRI con estándares universales y específicos del sector',
    applicableStandards: [StandardType.GRI],
    bestFor: ['GRI', 'Global Reporting'],
    configuration: {
      standards: [StandardType.GRI],
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
      }
    }
  },
  {
    id: 'multi-standard',
    name: 'Multi-Standard Report',
    description: 'Reporte que cumple con múltiples estándares simultáneamente (ESRS + GRI + TCFD)',
    applicableStandards: [StandardType.ESRS, StandardType.GRI, StandardType.TCFD],
    bestFor: ['Multi-jurisdiction', 'Global Companies'],
    configuration: {
      standards: [StandardType.ESRS, StandardType.GRI, StandardType.TCFD],
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
      }
    }
  },
  {
    id: 'executive-summary',
    name: 'Executive Summary Only',
    description: 'Resumen ejecutivo conciso para stakeholders de alto nivel',
    applicableStandards: [StandardType.ESRS, StandardType.GRI],
    bestFor: ['Executive Reports', 'Board Presentations'],
    configuration: {
      standards: [StandardType.ESRS],
      structure: {
        includeExecutiveSummary: true,
        includeMethodology: false,
        includeAssuranceStatement: false,
        includeAppendices: false,
        tableOfContents: false
      },
      bestPractices: {
        includeComparatives: true,
        includeBenchmarks: false,
        includeTargets: true,
        includeAssurance: false,
        includeStakeholderEngagement: false
      },
      visualization: {
        includeCharts: true,
        includeTables: false,
        chartStyle: 'minimal'
      }
    }
  }
];

/**
 * Genera configuración por topic basada en los estándares seleccionados
 */
export function generateTopicConfigurations(
  sections: StandardSection[],
  selectedStandards: StandardType[]
): Record<string, TopicConfiguration> {
  const configurations: Record<string, TopicConfiguration> = {};

  sections.forEach(section => {
    // Determinar estándares aplicables basados en mappings
    const applicableStandards: StandardType[] = [];
    
    section.datapoints.forEach(dp => {
      Object.keys(dp.mappings || {}).forEach(standard => {
        const standardType = standard as StandardType;
        if (selectedStandards.includes(standardType) && !applicableStandards.includes(standardType)) {
          applicableStandards.push(standardType);
        }
      });
    });

    // Si no hay mappings, usar estándares seleccionados
    if (applicableStandards.length === 0) {
      applicableStandards.push(...selectedStandards);
    }

    configurations[section.id] = {
      topicCode: section.code,
      topicName: section.title,
      applicableStandards,
      standardPriority: applicableStandards, // Por defecto, mismo orden
      include: true,
      includeNarrative: true,
      includeData: true,
      includeEvidence: true,
      includeAssurance: applicableStandards.includes(StandardType.ESRS),
      includeComparatives: true,
      includeTargets: true,
      includeBenchmarks: false
    };
  });

  return configurations;
}

/**
 * Valida configuración de reporte
 */
export function validateReportConfiguration(config: ReportConfiguration): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validar estándares
  if (!config.standards || config.standards.length === 0) {
    errors.push('Debe seleccionar al menos un estándar');
  }

  // Validar topics
  const includedTopics = Object.values(config.topicConfigurations).filter(t => t.include);
  if (includedTopics.length === 0) {
    errors.push('Debe incluir al menos un topic/sección');
  }

  // Validar metadata
  if (!config.metadata.organizationName) {
    errors.push('El nombre de la organización es requerido');
  }
  if (!config.metadata.reportingPeriod) {
    errors.push('El período de reporting es requerido');
  }

  // Warnings
  if (!config.structure.includeMethodology && config.bestPractices.includeAssurance) {
    warnings.push('Se recomienda incluir metodología cuando se incluye aseguramiento');
  }

  if (!config.bestPractices.includeComparatives) {
    warnings.push('Se recomienda incluir comparativas con años anteriores para cumplimiento ESRS');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
