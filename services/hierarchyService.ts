/**
 * Servicio de Jerarquía Organizacional
 * Basado en mejores prácticas: Enablon (datos a nivel activo), Sygris (agregación multi-nivel), Workiva (consolidación bottom-up)
 *
 * Permite:
 * - Gestionar jerarquía: Instalación → Subsidiaria → Unidad de negocio → Región/País
 * - Roll-up automático de métricas según jerarquía
 * - Inferir tipo de fuente desde nombre/jerarquía
 */
import {
  OrganizationalHierarchy,
  ConsolidationSource,
  ConsolidationBreakdown
} from '../types';

export type HierarchyLevel = 'region' | 'country' | 'state' | 'city' | 'business_unit' | 'subsidiary' | 'facility';

const HIERARCHY_LEVEL_ORDER: Record<HierarchyLevel, number> = {
  facility: 0,
  city: 1,
  state: 2,
  subsidiary: 3,
  business_unit: 4,
  country: 5,
  region: 6
};

/**
 * Inferir tipo de ConsolidationSource desde el nombre de la fuente
 * Útil cuando se importa desde Excel/CSV con columna "Fuente"
 */
export function inferSourceType(sourceName: string): 'geography' | 'business_unit' | 'subsidiary' | 'facility' {
  const name = (sourceName || '').toLowerCase();
  // Patrones comunes
  if (/\b(planta|plant|fábrica|factory|instalación|facility|sede|office)\b/i.test(name))
    return 'facility';
  if (/\b(subsidiaria|subsidiary|filial|filial)\b/i.test(name))
    return 'subsidiary';
  if (/\b(división|division|unidad|unit|departamento|department)\b/i.test(name))
    return 'business_unit';
  if (/\b(españa|spain|francia|germany|usa|china|mexico|país|country|región|region)\b/i.test(name))
    return 'geography';
  return 'geography'; // Por defecto
}

/**
 * Crear ConsolidationSource desde datos de importación bottom-up
 */
export function createSourceFromImport(
  sourceName: string,
  value: string | number | null,
  year: number,
  defaultUserId: string,
  defaultUserName: string,
  existingSources?: ConsolidationSource[],
  responsibleDepartment?: string
): ConsolidationSource {
  const normalizedName = (sourceName || '').trim();
  const existing = existingSources?.find(
    s => s.name?.toLowerCase() === normalizedName.toLowerCase()
  );

  const sourceId = existing?.id || `src_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const values = existing?.values || {};
  values[year.toString()] = value;

  return {
    id: sourceId,
    name: normalizedName,
    type: existing?.type || inferSourceType(normalizedName),
    responsibleUserId: existing?.responsibleUserId || defaultUserId,
    responsibleUserName: existing?.responsibleUserName || defaultUserName,
    responsibleDepartment: responsibleDepartment || existing?.responsibleDepartment,
    values: { ...values },
    lastUpdated: new Date().toISOString(),
    status: 'Draft' as any
  };
}

/**
 * Roll-up de fuentes según jerarquía (bottom-up)
 * Agrupa fuentes hijas bajo padres y consolida por nivel
 * Inspirado en Enablon: datos granulares → agregación por nivel
 */
export function groupSourcesByHierarchy(
  sources: ConsolidationSource[],
  hierarchy: OrganizationalHierarchy[]
): Map<string, ConsolidationSource[]> {
  const sourceByHierarchyId = new Map<string, ConsolidationSource>();
  sources.forEach(s => {
    if (s.hierarchyId) {
      sourceByHierarchyId.set(s.hierarchyId, s);
    }
  });

  const hierarchyMap = new Map<string, OrganizationalHierarchy>();
  hierarchy.forEach(h => hierarchyMap.set(h.id, h));

  const groups = new Map<string, ConsolidationSource[]>();

  sources.forEach(source => {
    if (!source.hierarchyId) {
      const key = `_ungrouped_${source.id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(source);
      return;
    }

    const node = hierarchyMap.get(source.hierarchyId);
    const parentId = node?.parentId || 'root';
    const groupKey = parentId === undefined ? 'root' : parentId;

    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey)!.push(source);
  });

  return groups;
}

/**
 * Construir árbol de jerarquía desde fuentes con hierarchyPath
 * Útil para visualización en UI (estilo Sygris/Workiva)
 */
export interface HierarchyTreeNode {
  id: string;
  name: string;
  level: HierarchyLevel;
  children: HierarchyTreeNode[];
  sources: ConsolidationSource[];
  aggregatedValue?: number;
}

export function buildHierarchyTree(
  sources: ConsolidationSource[],
  year: number
): HierarchyTreeNode[] {
  const yearKey = year.toString();
  const root: Map<string, HierarchyTreeNode> = new Map();

  sources.forEach(source => {
    const path = source.hierarchyPath || [source.name];
    let currentPath: string[] = [];

    path.forEach((segment, idx) => {
      currentPath = currentPath.concat(segment);
      const nodeId = currentPath.join('|');
      const level = inferLevelFromPath(currentPath);

      if (!root.has(nodeId)) {
        root.set(nodeId, {
          id: nodeId,
          name: segment,
          level,
          children: [],
          sources: []
        });
      }

      const node = root.get(nodeId)!;
      if (idx === path.length - 1) {
        node.sources.push(source);
        const val = source.values?.[yearKey];
        if (typeof val === 'number') {
          node.aggregatedValue = (node.aggregatedValue || 0) + val;
        } else if (typeof val === 'object' && val !== null && 'value' in val) {
          const v = (val as { value: number }).value;
          if (typeof v === 'number') node.aggregatedValue = (node.aggregatedValue || 0) + v;
        } else if (val !== null && val !== undefined && val !== '') {
          const num = parseFloat(String(val));
          if (!isNaN(num)) node.aggregatedValue = (node.aggregatedValue || 0) + num;
        }
      }
    });
  });

  return Array.from(root.values());
}

function inferLevelFromPath(path: string[]): HierarchyLevel {
  if (path.length >= 3) return 'facility';
  if (path.length === 2) return 'subsidiary';
  return 'country';
}
