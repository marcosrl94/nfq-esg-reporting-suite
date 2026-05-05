/**
 * Menú lateral por pilares (hilos) y submenús (sub-hilos).
 */
import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Database,
  ShieldCheck,
  FileBarChart,
  ChevronDown,
  ChevronRight,
  BarChart3,
  FileQuestion,
  UploadCloud,
  Plug,
  Target,
  PenTool,
  BookOpen,
  FileText,
  Scale,
  ClipboardList,
} from 'lucide-react';
import type { User } from '../../types';
import { Role } from '../../types';
import type { AppRoute, DataLoadTab, GovernanceTab, ReportingTab } from '../../contexts/appRoutes';
import {
  dataTabLabel,
  governanceTabLabel,
  reportingTabLabel,
  routeEquals,
} from '../../contexts/appRoutes';

const DATA_SUB: { tab: DataLoadTab; icon: React.ElementType }[] = [
  { tab: 'indicators', icon: BarChart3 },
  { tab: 'questionnaires', icon: FileQuestion },
  { tab: 'bulk', icon: UploadCloud },
  { tab: 'connections', icon: Plug },
];

const GOV_SUB: { tab: GovernanceTab; icon: React.ElementType }[] = [
  { tab: 'auditor', icon: ShieldCheck },
  { tab: 'materiality', icon: Target },
  { tab: 'audit_scope', icon: ClipboardList },
];

const REP_SUB: { tab: ReportingTab; icon: React.ElementType }[] = [
  { tab: 'narrative', icon: PenTool },
  { tab: 'index', icon: BookOpen },
  { tab: 'report', icon: FileText },
];

interface AppSidebarProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  currentUser: User;
}

function pillarOpenForRoute(route: AppRoute): Set<string> {
  const s = new Set<string>();
  if (route.type === 'data') s.add('data');
  if (route.type === 'governance') s.add('governance');
  if (route.type === 'reporting') s.add('reporting');
  return s;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentRoute,
  onNavigate,
  currentUser,
}) => {
  const showAuditor = currentUser.role === Role.VIEWER;

  const [openPillars, setOpenPillars] = useState<Set<string>>(() =>
    pillarOpenForRoute(currentRoute)
  );

  useEffect(() => {
    setOpenPillars((prev) => {
      const next = new Set(prev);
      pillarOpenForRoute(currentRoute).forEach((k) => next.add(k));
      return next;
    });
  }, [currentRoute]);

  const toggle = (id: string) => {
    setOpenPillars((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isActive = (route: AppRoute) => routeEquals(currentRoute, route);

  const homeActive = currentRoute.type === 'dashboard';

  return (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5a5a5a] px-2 mb-2">
        Navegación
      </div>

      <button
        type="button"
        onClick={() => onNavigate({ type: 'dashboard' })}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
          homeActive
            ? 'bg-[#0066ff] text-white shadow-lg shadow-[#0066ff]/25'
            : 'hover:bg-[#1a1a1a] text-[#cccccc]'
        }`}
      >
        <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
        <span className="font-medium text-sm">Inicio</span>
      </button>

      {/* Pilar: Carga de datos */}
      <div className="rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] overflow-hidden">
        <button
          type="button"
          onClick={() => toggle('data')}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-[#151515] transition-colors"
        >
          <span className="flex items-center gap-2 min-w-0">
            <Database className="w-4 h-4 text-[#0066ff] flex-shrink-0" />
            <span className="font-medium text-sm text-white truncate">Carga de datos</span>
          </span>
          {openPillars.has('data') ? (
            <ChevronDown className="w-4 h-4 text-[#6a6a6a] flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#6a6a6a] flex-shrink-0" />
          )}
        </button>
        {openPillars.has('data') && (
          <ul className="pb-2 space-y-0.5 border-t border-[#2a2a2a]/80">
            {DATA_SUB.map(({ tab, icon: Icon }) => {
              const route: AppRoute = { type: 'data', tab };
              const active = isActive(route);
              return (
                <li key={tab}>
                  <button
                    type="button"
                    onClick={() => onNavigate(route)}
                    className={`w-full flex items-center gap-2 pl-4 pr-3 py-2 text-left text-sm border-l-2 transition-colors ${
                      active
                        ? 'border-[#0066ff] bg-[#0066ff]/10 text-white'
                        : 'border-transparent text-[#9a9a9a] hover:text-white hover:bg-[#1a1a1a]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-80" />
                    <span className="truncate">{dataTabLabel(tab)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Pilar: Validación y gobierno */}
      <div className="rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] overflow-hidden">
        <button
          type="button"
          onClick={() => toggle('governance')}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-[#151515] transition-colors"
        >
          <span className="flex items-center gap-2 min-w-0">
            <Scale className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="font-medium text-sm text-white truncate">Validación y gobierno</span>
          </span>
          {openPillars.has('governance') ? (
            <ChevronDown className="w-4 h-4 text-[#6a6a6a] flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#6a6a6a] flex-shrink-0" />
          )}
        </button>
        {openPillars.has('governance') && (
          <ul className="pb-2 space-y-0.5 border-t border-[#2a2a2a]/80">
            {GOV_SUB.filter((x) => showAuditor || x.tab !== 'auditor').map(({ tab, icon: Icon }) => {
              const route: AppRoute = { type: 'governance', tab };
              const active = isActive(route);
              return (
                <li key={tab}>
                  <button
                    type="button"
                    onClick={() => onNavigate(route)}
                    className={`w-full flex items-center gap-2 pl-4 pr-3 py-2 text-left text-sm border-l-2 transition-colors ${
                      active
                        ? 'border-amber-500 bg-amber-500/10 text-amber-50'
                        : 'border-transparent text-[#9a9a9a] hover:text-white hover:bg-[#1a1a1a]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-80" />
                    <span className="truncate">{governanceTabLabel(tab)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Pilar: Reporting modular */}
      <div className="rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] overflow-hidden">
        <button
          type="button"
          onClick={() => toggle('reporting')}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-[#151515] transition-colors"
        >
          <span className="flex items-center gap-2 min-w-0">
            <FileBarChart className="w-4 h-4 text-[#0066ff] flex-shrink-0" />
            <span className="font-medium text-sm text-white truncate">Reporting modular</span>
          </span>
          {openPillars.has('reporting') ? (
            <ChevronDown className="w-4 h-4 text-[#6a6a6a] flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#6a6a6a] flex-shrink-0" />
          )}
        </button>
        {openPillars.has('reporting') && (
          <ul className="pb-2 space-y-0.5 border-t border-[#2a2a2a]/80">
            {REP_SUB.map(({ tab, icon: Icon }) => {
              const route: AppRoute = { type: 'reporting', tab };
              const active = isActive(route);
              return (
                <li key={tab}>
                  <button
                    type="button"
                    onClick={() => onNavigate(route)}
                    className={`w-full flex items-center gap-2 pl-4 pr-3 py-2 text-left text-sm border-l-2 transition-colors ${
                      active
                        ? 'border-[#0066ff] bg-[#0066ff]/10 text-white'
                        : 'border-transparent text-[#9a9a9a] hover:text-white hover:bg-[#1a1a1a]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-80" />
                    <span className="truncate">{reportingTabLabel(tab)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
};
