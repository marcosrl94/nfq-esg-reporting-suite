import { Role } from '../types';

/** Hilo: carga de datos */
export type DataLoadTab = 'indicators' | 'questionnaires' | 'bulk' | 'connections';

/** Hilo: validación y gobierno */
export type GovernanceTab = 'auditor' | 'materiality' | 'audit_scope';

/** Hilo: reporting modular */
export type ReportingTab = 'narrative' | 'index' | 'report';

export type AppRoute =
  | { type: 'dashboard' }
  | { type: 'data'; tab: DataLoadTab }
  | { type: 'governance'; tab: GovernanceTab }
  | { type: 'reporting'; tab: ReportingTab };

export const DEFAULT_DATA_TAB: DataLoadTab = 'indicators';
export const DEFAULT_REPORTING_TAB: ReportingTab = 'narrative';

export function defaultGovernanceTabForRole(role: Role): GovernanceTab {
  return role === Role.VIEWER ? 'auditor' : 'materiality';
}

export function routeEquals(a: AppRoute, b: AppRoute): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'dashboard') return true;
  if (b.type === 'dashboard') return false;
  if (a.type === 'data' && b.type === 'data') return a.tab === b.tab;
  if (a.type === 'governance' && b.type === 'governance') return a.tab === b.tab;
  if (a.type === 'reporting' && b.type === 'reporting') return a.tab === b.tab;
  return false;
}

/** Título corto para la barra superior */
export function routePageTitle(route: AppRoute): string {
  switch (route.type) {
    case 'dashboard':
      return 'Inicio';
    case 'data':
      return dataTabLabel(route.tab);
    case 'governance':
      return governanceTabLabel(route.tab);
    case 'reporting':
      return reportingTabLabel(route.tab);
    default:
      return 'NFQ ESG';
  }
}

/** Subtítulo: pilar */
export function routePillarLabel(route: AppRoute): string {
  switch (route.type) {
    case 'dashboard':
      return 'Panel';
    case 'data':
      return 'Carga de datos';
    case 'governance':
      return 'Validación y gobierno';
    case 'reporting':
      return 'Reporting modular';
    default:
      return '';
  }
}

export function dataTabLabel(tab: DataLoadTab): string {
  const m: Record<DataLoadTab, string> = {
    indicators: 'Indicadores ESG',
    questionnaires: 'Cuestionarios',
    bulk: 'Carga masiva',
    connections: 'Conexiones ERP',
  };
  return m[tab];
}

export function governanceTabLabel(tab: GovernanceTab): string {
  const m: Record<GovernanceTab, string> = {
    auditor: 'Vista auditor',
    materiality: 'Doble materialidad',
    audit_scope: 'Alcance auditoría',
  };
  return m[tab];
}

export function reportingTabLabel(tab: ReportingTab): string {
  const m: Record<ReportingTab, string> = {
    narrative: 'Narrativa',
    index: 'Índice',
    report: 'Informe final',
  };
  return m[tab];
}

export type BreadcrumbNavItem = {
  label: string;
  route?: AppRoute;
};

export function breadcrumbItemsForRoute(route: AppRoute): BreadcrumbNavItem[] {
  switch (route.type) {
    case 'dashboard':
      return [];
    case 'data':
      return [
        { label: 'Carga de datos', route: { type: 'data', tab: DEFAULT_DATA_TAB } },
        { label: dataTabLabel(route.tab) },
      ];
    case 'governance':
      return [
        {
          label: 'Validación y gobierno',
          route: { type: 'governance', tab: 'materiality' },
        },
        { label: governanceTabLabel(route.tab) },
      ];
    case 'reporting':
      return [
        {
          label: 'Reporting modular',
          route: { type: 'reporting', tab: DEFAULT_REPORTING_TAB },
        },
        { label: reportingTabLabel(route.tab) },
      ];
    default:
      return [];
  }
}
