/**
 * Organization Model - Multi-tenancy root entity
 */
export interface Organization {
  id: string;
  name: string;
  legalName?: string;
  countryCode: string; // ISO 3166-1 alpha-2
  industry?: string;
  parentOrganizationId?: string; // Para grupos corporativos
  subsidiaries?: string[]; // IDs de subsidiarias
  settings: {
    defaultCurrency: string;
    defaultLanguage: string;
    fiscalYearEnd: string; // MM-DD
    reportingStandards: string[];
    dataRetentionYears: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSettings {
  defaultCurrency: string;
  defaultLanguage: string;
  fiscalYearEnd: string;
  reportingStandards: string[];
  dataRetentionYears: number;
}

export const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
  defaultCurrency: 'EUR',
  defaultLanguage: 'es',
  fiscalYearEnd: '12-31',
  reportingStandards: ['ESRS'],
  dataRetentionYears: 7
};
