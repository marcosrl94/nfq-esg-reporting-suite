/**
 * Hub: validación y gobierno — auditor, doble materialidad, alcance auditoría (diagnóstico).
 */
import React, { useEffect } from 'react';
import { ShieldCheck, Target, Scale, ClipboardList } from 'lucide-react';
import { StandardSection, User } from '../types';
import type { GovernanceTab } from '../contexts/appRoutes';
import AuditorView from './AuditorView';
import MaterialityAssessment from './MaterialityAssessment';
import MaterialityDiagnosticsPanel from './MaterialityDiagnosticsPanel';

const TAB_DEF: { id: GovernanceTab; label: string; icon: React.ElementType }[] = [
  { id: 'auditor', label: 'Vista auditor', icon: ShieldCheck },
  { id: 'materiality', label: 'Doble materialidad', icon: Target },
  { id: 'audit_scope', label: 'Alcance auditoría', icon: ClipboardList },
];

interface GovernanceHubProps {
  sections: StandardSection[];
  reportingYear: number;
  currentUser: User;
  activeTab: GovernanceTab;
  onTabChange: (tab: GovernanceTab) => void;
  /** Si false, la pestaña auditor no se muestra (p. ej. no es rol auditor). */
  showAuditorTab: boolean;
}

export const GovernanceHub: React.FC<GovernanceHubProps> = ({
  sections,
  reportingYear,
  currentUser,
  activeTab,
  onTabChange,
  showAuditorTab,
}) => {
  const tabs = showAuditorTab ? TAB_DEF : TAB_DEF.filter((t) => t.id !== 'auditor');

  useEffect(() => {
    if (!showAuditorTab && activeTab === 'auditor') {
      onTabChange('materiality');
    }
  }, [showAuditorTab, activeTab, onTabChange]);

  const effectiveTab =
    !showAuditorTab && activeTab === 'auditor' ? 'materiality' : activeTab;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-shrink-0 pb-4 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-500/15 rounded-lg border border-amber-500/30">
            <Scale className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Validación y gobierno</h1>
            <p className="text-sm text-[#6a6a6a]">
              Revisión independiente, materialidad ESRS y trazabilidad
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                effectiveTab === id
                  ? 'bg-amber-500/25 text-amber-100 border border-amber-500/50'
                  : 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#aaaaaa] hover:border-amber-500/40 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 pt-4 overflow-auto">
        {effectiveTab === 'auditor' && showAuditorTab && (
          <AuditorView sections={sections} currentUser={currentUser} reportingYear={reportingYear} />
        )}
        {effectiveTab === 'materiality' && (
          <MaterialityAssessment sections={sections} reportingYear={reportingYear} />
        )}
        {effectiveTab === 'audit_scope' && (
          <div className="rounded-lg border border-amber-500/25 bg-[#0d0d0d] p-4 sm:p-5 min-h-0">
            <MaterialityDiagnosticsPanel sections={sections} reportingYear={reportingYear} />
          </div>
        )}
      </div>
    </div>
  );
};

export default GovernanceHub;
