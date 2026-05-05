/**
 * Referencia ESRS (Fase E): IDs estables y versión de taxonomía para ESEF/XBRL futuro.
 * No genera XBRL; prepara el modelo de dominio.
 */

export const ESRS_TAXONOMY_VERSION = '2024-12';

export interface EsrsDisclosureRef {
  id: string;
  /** Código visible p.ej. E1-6 */
  code: string;
  /** Categoría ESRS */
  domain: 'ESRS_E' | 'ESRS_S' | 'ESRS_G';
}

/** Subconjunto ilustrativo para enlazar datapoints */
export const ESRS_DISCLOSURE_INDEX: EsrsDisclosureRef[] = [
  { id: 'esrs-e1-6-1', code: 'E1-6-01', domain: 'ESRS_E' },
  { id: 'esrs-e1-6-2', code: 'E1-6-02', domain: 'ESRS_E' },
  { id: 'esrs-e1-6-3', code: 'E1-6-03', domain: 'ESRS_E' },
  { id: 'esrs-s1-9', code: 'S1-9', domain: 'ESRS_S' }
];

export function findDisclosureByCode(code: string): EsrsDisclosureRef | undefined {
  return ESRS_DISCLOSURE_INDEX.find(d => d.code === code);
}
