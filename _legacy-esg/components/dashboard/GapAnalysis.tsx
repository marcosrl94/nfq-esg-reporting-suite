/**
 * Gap Analysis - Workiva/Sygris style
 * Compara topics materiales vs cobertura de datos para identificar gaps
 */
import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle, Target, ChevronRight } from 'lucide-react';
import { StandardSection } from '../../types';
import { useMateriality } from '../../contexts';

interface GapAnalysisProps {
  sections: StandardSection[];
  reportingYear: number;
  onNavigateToData?: () => void;
}

export const GapAnalysis: React.FC<GapAnalysisProps> = ({
  sections,
  reportingYear,
  onNavigateToData
}) => {
  const { topics, materialSectionCodes, hasAssessment } = useMateriality();
  const yearKey = reportingYear.toString();

  const gapData = useMemo(() => {
    if (!hasAssessment) return [];

    return materialSectionCodes.map(code => {
      const section = sections.find(s => {
        const match = s.code.match(/\b(E[1-5]|S[1-4]|G1)\b/);
        const sectionCode = match ? match[1] : s.code.replace(/^ESRS\s+/i, '').split(/\s/)[0];
        return sectionCode === code;
      });

      if (!section) {
        return {
          code,
          name: code,
          total: 0,
          withData: 0,
          approved: 0,
          coverage: 0,
          status: 'missing' as const,
          topic: topics.find(t => (t.esrsSectionCode || '') === code)
        };
      }

      const total = section.datapoints.length;
      const withData = section.datapoints.filter(dp => {
        const v = dp.values?.[yearKey];
        return v !== null && v !== undefined && v !== '';
      }).length;
      const approved = section.datapoints.filter(dp =>
        dp.status === 'Approved' || dp.status === 'Locked'
      ).length;
      const coverage = total > 0 ? Math.round((withData / total) * 100) : 0;

      return {
        code,
        name: section.title,
        total,
        withData,
        approved,
        coverage,
        status: coverage >= 80 ? 'ok' : coverage >= 50 ? 'partial' : 'gap',
        topic: topics.find(t => (t.esrsSectionCode || '') === code)
      };
    });
  }, [hasAssessment, materialSectionCodes, sections, topics, yearKey]);

  const gapsCount = gapData.filter(g => g.status === 'gap').length;
  const partialCount = gapData.filter(g => g.status === 'partial').length;

  if (!hasAssessment) {
    return (
      <div className="bg-[#1e1e1e] p-4 lg:p-6 rounded border border-[#2a2a2a]">
        <h3 className="text-base lg:text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-[#0066ff]" />
          Gap Analysis
        </h3>
        <p className="text-sm text-[#6a6a6a]">
          Ejecuta la evaluación de materialidad para identificar gaps entre topics materiales y cobertura de datos.
        </p>
      </div>
    );
  }

  if (gapData.length === 0) {
    return (
      <div className="bg-[#1e1e1e] p-4 lg:p-6 rounded border border-[#2a2a2a]">
        <h3 className="text-base lg:text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-[#0066ff]" />
          Gap Analysis
        </h3>
        <p className="text-sm text-[#6a6a6a]">
          No hay topics materiales con disclosure activo. Ajusta la profundidad en Materialidad.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#1e1e1e] p-4 lg:p-6 rounded border border-[#2a2a2a]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base lg:text-lg font-bold text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-[#0066ff]" />
          Gap Analysis
        </h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> {gapData.filter(g => g.status === 'ok').length} OK
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" /> {partialCount} Parcial
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> {gapsCount} Gaps
          </span>
        </div>
      </div>
      <p className="text-xs text-[#6a6a6a] mb-4">
        Topics materiales vs cobertura de datos por sección ESRS
      </p>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {gapData.map(g => (
          <div
            key={g.code}
            className={`flex items-center justify-between p-2 rounded border ${
              g.status === 'ok' ? 'border-green-500/30 bg-green-500/5' :
              g.status === 'partial' ? 'border-yellow-500/30 bg-yellow-500/5' :
              'border-red-500/30 bg-red-500/5'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {g.status === 'ok' ? (
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <span className="font-mono text-xs text-[#0066ff]">{g.code}</span>
                <span className="text-sm text-white ml-2 truncate block">{g.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-xs font-bold ${
                g.status === 'ok' ? 'text-green-500' : g.status === 'partial' ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {g.coverage}%
              </span>
              <span className="text-xs text-[#6a6a6a]">
                {g.withData}/{g.total}
              </span>
            </div>
          </div>
        ))}
      </div>
      {gapsCount > 0 && onNavigateToData && (
        <button
          onClick={onNavigateToData}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-sm text-[#0066ff] hover:bg-[#0066ff]/10 rounded transition-colors"
        >
          Cerrar gaps en Data
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
