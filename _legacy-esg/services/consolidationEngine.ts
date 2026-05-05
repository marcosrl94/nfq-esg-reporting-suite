import { ConsolidationSource, OrganizationalHierarchy } from '../types';
import { groupSourcesByHierarchy } from './hierarchyService';

/**
 * Roll-up numérico simple por grupo de jerarquía (Fase D).
 */
export function rollupNumericValues(
  sources: ConsolidationSource[],
  hierarchy: OrganizationalHierarchy[],
  year: number
): Map<string, number> {
  const groups = groupSourcesByHierarchy(sources, hierarchy);
  const sums = new Map<string, number>();
  const y = String(year);

  for (const [, list] of groups) {
    let sum = 0;
    for (const s of list) {
      const raw = s.values[y];
      if (typeof raw === 'number') sum += raw;
      else if (raw && typeof raw === 'object' && 'value' in raw) {
        const v = (raw as { value: number }).value;
        if (typeof v === 'number') sum += v;
      }
    }
    const key = list[0]?.hierarchyId || list[0]?.id || 'group';
    sums.set(key, sum);
  }

  return sums;
}
