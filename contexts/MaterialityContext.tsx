/**
 * MaterialityContext - Materialidad como paso primero
 * Almacena el resultado de la evaluación de materialidad y determina:
 * - Qué topics ESRS son materiales
 * - Con qué nivel de profundidad reportar cada uno
 * - Filtra datapoints en la vista Data
 */
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import {
  MaterialityTopic,
  DisclosureDepth,
  MaterialityThresholdConfig,
  MaterialityCriterion
} from '../types';
import { inferEsrsSectionFromTopic } from '../services/materialityDiagnostics';

const THRESHOLD_STORAGE = 'nfq_materiality_thresholds_v1';
const CRITERION_STORAGE = 'nfq_materiality_criterion_v1';

const DEFAULT_THRESHOLDS: MaterialityThresholdConfig = { impactMin: 50, financialMin: 50 };

function readThresholds(): MaterialityThresholdConfig {
  if (typeof window === 'undefined') return DEFAULT_THRESHOLDS;
  try {
    const raw = localStorage.getItem(THRESHOLD_STORAGE);
    if (!raw) return DEFAULT_THRESHOLDS;
    const p = JSON.parse(raw) as Partial<MaterialityThresholdConfig>;
    return {
      impactMin: clamp100(p.impactMin ?? DEFAULT_THRESHOLDS.impactMin),
      financialMin: clamp100(p.financialMin ?? DEFAULT_THRESHOLDS.financialMin)
    };
  } catch {
    return DEFAULT_THRESHOLDS;
  }
}

function readCriterion(): MaterialityCriterion {
  if (typeof window === 'undefined') return 'both';
  try {
    const raw = localStorage.getItem(CRITERION_STORAGE);
    if (raw === 'either' || raw === 'both') return raw;
  } catch {
    /* ignore */
  }
  return 'both';
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export const ESRS_SECTION_MAP: Record<string, string> = {
  'E1': 'ESRS E1',
  'E2': 'ESRS E2',
  'E3': 'ESRS E3',
  'E4': 'ESRS E4',
  'E5': 'ESRS E5',
  'S1': 'ESRS S1',
  'S2': 'ESRS S2',
  'S3': 'ESRS S3',
  'S4': 'ESRS S4',
  'G1': 'ESRS G1'
};

interface MaterialityContextType {
  topics: MaterialityTopic[];
  setTopics: (topics: MaterialityTopic[]) => void;
  updateTopicDepth: (topicId: string, depth: DisclosureDepth) => void;
  /** Umbrales (0–100) para interpretar materialidad de impacto y financiera */
  thresholds: MaterialityThresholdConfig;
  setThresholds: (patch: Partial<MaterialityThresholdConfig>) => void;
  /** Regla: ambos ejes por encima del umbral, o al menos uno */
  criterion: MaterialityCriterion;
  setCriterion: (c: MaterialityCriterion) => void;
  /** Códigos de sección ESRS que son materiales (disclosureDepth !== 'omit') */
  materialSectionCodes: string[];
  /** ¿Hay evaluación de materialidad completada? */
  hasAssessment: boolean;
  /** Filtrar secciones por materialidad: solo incluir secciones materiales */
  filterSectionsByMateriality: <T extends { code: string }>(sections: T[]) => T[];
}

const MaterialityContext = createContext<MaterialityContextType | undefined>(undefined);

interface MaterialityProviderProps {
  children: ReactNode;
}

export const MaterialityProvider: React.FC<MaterialityProviderProps> = ({ children }) => {
  const [topics, setTopicsState] = useState<MaterialityTopic[]>([]);
  const [thresholds, setThresholdsState] = useState<MaterialityThresholdConfig>(readThresholds);
  const [criterion, setCriterionState] = useState<MaterialityCriterion>(readCriterion);

  useEffect(() => {
    try {
      localStorage.setItem(THRESHOLD_STORAGE, JSON.stringify(thresholds));
    } catch {
      /* ignore */
    }
  }, [thresholds]);

  useEffect(() => {
    try {
      localStorage.setItem(CRITERION_STORAGE, criterion);
    } catch {
      /* ignore */
    }
  }, [criterion]);

  const setTopics = useCallback((newTopics: MaterialityTopic[]) => {
    setTopicsState(newTopics);
  }, []);

  const setThresholds = useCallback((patch: Partial<MaterialityThresholdConfig>) => {
    setThresholdsState((prev) => ({
      impactMin: clamp100(patch.impactMin ?? prev.impactMin),
      financialMin: clamp100(patch.financialMin ?? prev.financialMin)
    }));
  }, []);

  const setCriterion = useCallback((c: MaterialityCriterion) => {
    setCriterionState(c);
  }, []);

  const updateTopicDepth = useCallback((topicId: string, depth: DisclosureDepth) => {
    setTopicsState(prev =>
      prev.map(t => t.id === topicId ? { ...t, disclosureDepth: depth } : t)
    );
  }, []);

  const materialSectionCodes = React.useMemo(() => {
    const codes = new Set<string>();
    topics.forEach(t => {
      const code = t.esrsSectionCode || inferEsrsSectionFromTopic(t);
      if (code && t.disclosureDepth !== 'omit') {
        codes.add(code);
      }
    });
    return Array.from(codes);
  }, [topics]);

  const hasAssessment = topics.length > 0;

  const filterSectionsByMateriality = useCallback(<T extends { code: string }>(sections: T[]): T[] => {
    if (!hasAssessment) return sections; // Sin evaluación: mostrar todo
    return sections.filter(s => {
      const match = s.code.match(/\b(E[1-5]|S[1-4]|G1)\b/);
      const sectionCode = match ? match[1] : s.code.replace(/^ESRS\s+/i, '').split(/\s/)[0];
      return materialSectionCodes.includes(sectionCode);
    });
  }, [hasAssessment, materialSectionCodes]);

  const value: MaterialityContextType = {
    topics,
    setTopics,
    updateTopicDepth,
    thresholds,
    setThresholds,
    criterion,
    setCriterion,
    materialSectionCodes,
    hasAssessment,
    filterSectionsByMateriality
  };

  return (
    <MaterialityContext.Provider value={value}>
      {children}
    </MaterialityContext.Provider>
  );
};

export const useMateriality = (): MaterialityContextType => {
  const context = useContext(MaterialityContext);
  if (!context) {
    throw new Error('useMateriality must be used within a MaterialityProvider');
  }
  return context;
};

export { inferEsrsSectionFromTopic } from '../services/materialityDiagnostics';
