/**
 * Indicadores definidos por el usuario (sección ESRS existente), persistidos en cliente.
 */
import type { Datapoint, StandardSection } from '../types';

const STORAGE_KEY = 'nfq_custom_datapoints_v1';

type Stored = { sectionId: string; datapoint: Datapoint }[];

export function getCustomDatapoints(): Stored {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Stored;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustom(list: Stored): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function addCustomDatapointRecord(sectionId: string, datapoint: Datapoint): void {
  const list = getCustomDatapoints().filter((x) => x.datapoint.id !== datapoint.id);
  list.push({ sectionId, datapoint });
  saveCustom(list);
}

export function removeCustomDatapointRecord(datapointId: string): void {
  const list = getCustomDatapoints().filter((x) => x.datapoint.id !== datapointId);
  saveCustom(list);
}

/** Añade al final de cada sección los indicadores personalizados que aún no existen por id. */
export function mergeCustomIntoSections(base: StandardSection[]): StandardSection[] {
  const custom = getCustomDatapoints();
  if (custom.length === 0) return base;
  return base.map((s) => {
    const existingIds = new Set(s.datapoints.map((d) => d.id));
    const extra = custom
      .filter((c) => c.sectionId === s.id && !existingIds.has(c.datapoint.id))
      .map((c) => c.datapoint);
    if (extra.length === 0) return s;
    return { ...s, datapoints: [...s.datapoints, ...extra] };
  });
}
