import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { StandardSection } from '../../types';
import { computeYoYVariationAlerts } from '../../services/variationAlerts';

interface VariationAlertsPanelProps {
  sections: StandardSection[];
  reportingYear: number;
}

export const VariationAlertsPanel: React.FC<VariationAlertsPanelProps> = ({
  sections,
  reportingYear
}) => {
  const alerts = useMemo(() => {
    const dps = sections.flatMap(s => s.datapoints);
    return computeYoYVariationAlerts(dps, reportingYear);
  }, [sections, reportingYear]);

  if (alerts.length === 0) return null;

  return (
    <div className="bg-amber-950/30 border border-amber-600/40 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
        <h3 className="text-sm font-bold text-white">Variación interanual (revisión)</h3>
      </div>
      <ul className="space-y-2 text-xs text-[#cccccc]">
        {alerts.slice(0, 8).map(a => (
          <li key={a.datapointId} className="flex flex-wrap gap-2 border-b border-[#2a2a2a] pb-2 last:border-0">
            <span className="font-mono text-amber-200/90">{a.code}</span>
            <span>
              {a.previousYear}: {a.previousValue} → {a.currentYear}: {a.currentValue}
              ({a.pctChange >= 0 ? '+' : ''}
              {a.pctChange.toFixed(1)}%)
            </span>
            <span
              className={
                a.severity === 'high'
                  ? 'text-red-400'
                  : a.severity === 'medium'
                    ? 'text-amber-400'
                    : 'text-[#6a6a6a]'
              }
            >
              {a.severity}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
