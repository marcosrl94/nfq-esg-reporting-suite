/**
 * Alcance in/out y orígenes de datos por indicador (cliente; persistencia local hasta API).
 */
import type { DataOrigin } from '../types';
import { StandardType } from '../types';

export type IndicatorScopeEntry = {
  inScope: boolean;
  origins: DataOrigin[];
  /** Estándar principal de fila (guion ESRS por defecto en UI) */
  primaryStandard?: StandardType;
};

const STORAGE_KEY = 'nfq_indicator_scope_v1';

export function defaultScopeEntry(): IndicatorScopeEntry {
  return { inScope: true, origins: [] };
}

export function loadScopeStore(): Record<string, IndicatorScopeEntry> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, IndicatorScopeEntry>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveScopeStore(data: Record<string, IndicatorScopeEntry>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}
