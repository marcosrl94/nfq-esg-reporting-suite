/**
 * Configuración de sub-módulos por big topic material (estilo Sygris)
 * Cada big topic tiene sub-módulos con KPIs, filtros, gráficos y tabla
 */
import { StandardSection } from '../types';

export interface SubModuleConfig {
  id: string;
  name: string;
  description: string;
  /** Códigos de datapoint a incluir (ej: E1-6, S1-9) o sectionId */
  datapointCodes?: string[];
  sectionIds?: string[];
  /** KPIs a mostrar en cabecera (derivados de datapoints) */
  kpiLabels?: { key: string; label: string }[];
  /** Filtros disponibles */
  filters?: { id: string; label: string; options?: string[] }[];
  /** Tipo de gráfico principal */
  chartType?: 'bar' | 'area' | 'stacked_bar';
}

export interface BigTopicConfig {
  id: string;
  sectionCode: string;
  name: string;
  description: string;
  subModules: SubModuleConfig[];
}

/** Configuración de big topics y sus sub-módulos */
export const BIG_TOPIC_SUBMODULES: BigTopicConfig[] = [
  {
    id: 'e1',
    sectionCode: 'E1',
    name: 'Cambio Climático',
    description: 'Emisiones GHG, plan de transición y riesgos climáticos. Alcances 1, 2 y 3.',
    subModules: [
      {
        id: 'e1-emissions',
        name: 'Emisiones GHG',
        description: 'Alcances 1, 2 y 3. Métricas de huella de carbono.',
        datapointCodes: ['E1-6-01', 'E1-6-02', 'E1-6-03'],
        kpiLabels: [
          { key: 'scope1', label: 'Scope 1' },
          { key: 'scope2', label: 'Scope 2' },
          { key: 'scope3', label: 'Scope 3' },
          { key: 'total', label: 'Total tCO2e' }
        ],
        filters: [
          { id: 'year', label: 'Año' },
          { id: 'scope', label: 'Alcance' }
        ],
        chartType: 'bar'
      },
      {
        id: 'e1-transition',
        name: 'Plan de transición y riesgos',
        description: 'Plan de mitigación, efectos financieros anticipados.',
        datapointCodes: ['E1-1', 'E1-9'],
        kpiLabels: [
          { key: 'indicators', label: 'Indicadores' },
          { key: 'approved', label: 'Aprobados' }
        ],
        filters: [{ id: 'year', label: 'Año' }],
        chartType: 'area'
      }
    ]
  },
  {
    id: 's1',
    sectionCode: 'S1',
    name: 'Seguridad y Salud',
    description: 'Gestiona la seguridad y salud en tu empresa. Accidentes, incidentes, formación y diversidad.',
    subModules: [
      {
        id: 's1-accidents',
        name: 'Accidentes / Incidentes',
        description: 'Registra accidentes e incidentes, índices de siniestralidad.',
        datapointCodes: [],
        kpiLabels: [
          { key: 'accidents', label: 'Accidentes' },
          { key: 'incidents', label: 'Incidentes' },
          { key: 'withLeave', label: 'Con baja' }
        ],
        filters: [
          { id: 'year', label: 'Año' },
          { id: 'plant', label: 'Planta' },
          { id: 'viewType', label: 'Tipo de vista', options: ['Anual', 'Trimestral'] }
        ],
        chartType: 'stacked_bar'
      },
      {
        id: 's1-diversity',
        name: 'Empleados y diversidad',
        description: 'Políticas, diversidad en management.',
        datapointCodes: ['S1-1', 'S1-9'],
        kpiLabels: [
          { key: 'indicators', label: 'Indicadores' },
          { key: 'diversity', label: 'Diversidad %' }
        ],
        filters: [{ id: 'year', label: 'Año' }],
        chartType: 'bar'
      },
      {
        id: 's1-training',
        name: 'Formación',
        description: 'Horas de formación por empleado.',
        datapointCodes: ['S1-13'],
        kpiLabels: [
          { key: 'hours', label: 'Horas/empleado' },
          { key: 'indicators', label: 'Indicadores' }
        ],
        filters: [{ id: 'year', label: 'Año' }],
        chartType: 'area'
      }
    ]
  },
  {
    id: 'e2',
    sectionCode: 'E2',
    name: 'Contaminación',
    description: 'Emisiones a la atmósfera, vertidos, residuos.',
    subModules: [
      {
        id: 'e2-waste',
        name: 'Gestión de residuos',
        description: 'Retiradas de residuos por centro. Tipología, costes, códigos EWC/LER.',
        datapointCodes: [],
        kpiLabels: [
          { key: 'gestiones', label: 'Gestión' },
          { key: 'residuos', label: 'Residuos' },
          { key: 'retiradas', label: 'Retiradas' }
        ],
        filters: [
          { id: 'year', label: 'Año' },
          { id: 'tipoResiduo', label: 'Tipo de residuo' },
          { id: 'productor', label: 'Productor' },
          { id: 'gestor', label: 'Gestor' }
        ],
        chartType: 'bar'
      }
    ]
  }
];

/**
 * Obtiene la config de big topic para una sección ESRS
 */
export function getBigTopicForSection(sectionCode: string): BigTopicConfig | undefined {
  const match = sectionCode.match(/\b(E[1-5]|S[1-4]|G1)\b/);
  const code = match ? match[1] : sectionCode.replace(/^ESRS\s+/i, '').split(/\s/)[0];
  return BIG_TOPIC_SUBMODULES.find(bt => bt.sectionCode === code);
}

/**
 * Filtra datapoints de una sección según el sub-módulo
 */
export function getDatapointsForSubModule(
  sections: StandardSection[],
  subModule: SubModuleConfig,
  bigTopicSectionCode?: string
): { section: StandardSection; datapoints: typeof sections[0]['datapoints'] }[] {
  const result: { section: StandardSection; datapoints: typeof sections[0]['datapoints'] }[] = [];

  const targetSections = subModule.sectionIds
    ? sections.filter(s => subModule.sectionIds!.includes(s.id))
    : bigTopicSectionCode
    ? sections.filter(s => s.code.includes(bigTopicSectionCode))
    : sections;

  targetSections.forEach(section => {
    let dps = section.datapoints;
    if (subModule.datapointCodes && subModule.datapointCodes.length > 0) {
      dps = dps.filter(dp =>
        subModule.datapointCodes!.some(
          code => dp.code === code || dp.code.startsWith(code + '-')
        )
      );
    }
    if (dps.length > 0) {
      result.push({ section, datapoints: dps });
    }
  });

  return result;
}
