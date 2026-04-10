/**
 * ESRS Coverage Heatmap - Sygris style
 * Mapa de calor de cobertura por sección ESRS
 */
import React, { useMemo } from 'react';
import { StandardSection } from '../../types';
import { useMateriality } from '../../contexts';

interface ESRSCoverageHeatmapProps {
  sections: StandardSection[];
  reportingYear: number;
}

const SECTION_LABELS: Record<string, string> = {
  'E1': 'Climate',
  'E2': 'Pollution',
  'E3': 'Water',
  'E4': 'Biodiversity',
  'E5': 'Circular',
  'S1': 'Workforce',
  'S2': 'Value Chain',
  'S3': 'Communities',
  'S4': 'Consumers',
  'G1': 'Governance'
};

export const ESRSCoverageHeatmap: React.FC<ESRSCoverageHeatmapProps> = ({
  sections,
  reportingYear
}) => {
  const { hasAssessment, materialSectionCodes } = useMateriality();
  const yearKey = reportingYear.toString();

  const heatmapData = useMemo(() => {
    const allCodes = ['E1', 'E2', 'E3', 'E4', 'E5', 'S1', 'S2', 'S3', 'S4', 'G1'];
    return allCodes.map(code => {
      const section = sections.find(s => {
        const match = s.code.match(/\b(E[1-5]|S[1-4]|G1)\b/);
        const sectionCode = match ? match[1] : '';
        return sectionCode === code;
      });

      const isMaterial = hasAssessment ? materialSectionCodes.includes(code) : true;
      const total = section?.datapoints.length ?? 0;
      const withData = section?.datapoints.filter(dp => {
        const v = dp.values?.[yearKey];
        return v !== null && v !== undefined && v !== '';
      }).length ?? 0;
      const coverage = total > 0 ? Math.round((withData / total) * 100) : 0;

      return {
        code,
        label: SECTION_LABELS[code] || code,
        coverage,
        total,
        withData,
        isMaterial,
        hasSection: !!section
      };
    });
  }, [sections, reportingYear, hasAssessment, materialSectionCodes, yearKey]);

  const getCellColor = (coverage: number, isMaterial: boolean, hasSection: boolean) => {
    if (!hasSection) return 'bg-[#1a1a1a] border-[#2a2a2a]';
    if (!isMaterial) return 'bg-[#1a1a1a] border-[#2a2a2a] opacity-50';
    if (coverage >= 80) return 'bg-green-500/30 border-green-500/50';
    if (coverage >= 50) return 'bg-yellow-500/30 border-yellow-500/50';
    if (coverage > 0) return 'bg-orange-500/30 border-orange-500/50';
    return 'bg-red-500/20 border-red-500/50';
  };

  return (
    <div className="bg-[#1e1e1e] p-4 lg:p-6 rounded border border-[#2a2a2a]">
      <h3 className="text-base lg:text-lg font-bold text-white mb-4">
        Cobertura por ESRS
      </h3>
      <p className="text-xs text-[#6a6a6a] mb-4">
        {hasAssessment ? 'Solo secciones materiales.' : 'Todas las secciones.'}
      </p>
      <div className="grid grid-cols-5 gap-2">
        {heatmapData.map(cell => (
          <div
            key={cell.code}
            className={`p-3 rounded border text-center transition-all ${getCellColor(cell.coverage, cell.isMaterial, cell.hasSection)}`}
            title={`${cell.code}: ${cell.coverage}% (${cell.withData}/${cell.total})`}
          >
            <div className="font-mono text-xs font-bold text-[#0066ff]">{cell.code}</div>
            <div className="text-xs text-white mt-1">{cell.label}</div>
            <div className={`text-sm font-bold mt-1 ${
              cell.coverage >= 80 ? 'text-green-600' :
              cell.coverage >= 50 ? 'text-yellow-500' :
              cell.coverage > 0 ? 'text-orange-500' : 'text-red-500'
            }`}>
              {cell.hasSection ? `${cell.coverage}%` : '—'}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs text-[#6a6a6a]">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/30" /> 80%+</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500/30" /> 50-79%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/20" /> &lt;50%</span>
      </div>
    </div>
  );
};
