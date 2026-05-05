import React, { useState, useEffect, useContext, createContext } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Settings, Bell, ShieldCheck, Menu, X, LogOut } from 'lucide-react';
import { useMobile } from './hooks/useMobile';
import { useRemoteSectionsQuery, useRemoteUsersQuery } from './hooks/useEnterpriseData';
import { isApiConfigured, setApiAccessToken } from './services/apiService';
import { supabase } from './services/supabaseClient';
import { getSessionUser, signOutSupabase } from './services/authService';
import {
  setCurrentActorId,
  resolveOrganizationIdForApi,
  getActiveReportingCycleId,
  isWorkspaceOnboardingDone,
  setWorkspaceOnboardingDone,
  setActiveOrganizationId,
  setActiveReportingCycleId
} from './services/dataPlane';
import { recordAuditEvent } from './services/auditLogService';
import Dashboard from './components/Dashboard';
import DataHub from './components/DataHub';
import ReportingHub from './components/ReportingHub';
import GovernanceHub from './components/GovernanceHub';
import Login from './components/Login';
import { WorkspaceOnboarding } from './components/WorkspaceOnboarding';
import { Breadcrumbs } from './components/navigation/Breadcrumbs';
import { AppSidebar } from './components/navigation/AppSidebar';
import { StandardSection, WorkflowStatus, User, Role, Department, StandardType } from './types';
import {
  SectionsProvider,
  UsersProvider,
  AppViewProvider,
  MaterialityProvider,
  useSections,
  useUsers,
  useAppView,
  breadcrumbItemsForRoute,
  routePageTitle,
  routePillarLabel,
} from './contexts';
import type { AppRoute } from './contexts';

// Global Configuration
export const REPORTING_YEAR = 2024;

/** Solo para demo local / fallback si falla la API; con Supabase activo se sustituyen por `fetchUsers`. */
const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Maria Gonzalez', role: Role.ADMIN, department: Department.SUSTAINABILITY, avatar: 'MG' },
  { id: 'u2', name: 'Carlos Ruiz', role: Role.EDITOR, department: Department.ENVIRONMENT, avatar: 'CR' },
  { id: 'u3', name: 'Sofia Lee', role: Role.EDITOR, department: Department.HR, avatar: 'SL' },
  { id: 'u4', name: 'Ana Auditor', role: Role.VIEWER, department: Department.SUSTAINABILITY, avatar: 'AA' },
];

/** Dataset demo alineado con ESRS de ejemplo; reemplazado por `fetchSections` cuando hay API. */
const MOCK_DATA: StandardSection[] = [
  {
    id: 's1',
    code: 'ESRS E1',
    title: 'Climate Change',
    datapoints: [
      { 
        id: 'dp1', code: 'E1-1', name: 'Transition plan for climate change mitigation', description: 'Disclosure of the transition plan for climate change mitigation.', 
        values: { "2024": null }, type: 'qualitative', status: WorkflowStatus.DRAFT, 
        ownerId: 'u1', department: Department.SUSTAINABILITY, 
        comments: [],
        mappings: { [StandardType.GRI]: '305-1', [StandardType.TCFD]: 'Strategy a)', [StandardType.SASB]: 'IF-EN-160a.1' }
      },
      { 
        id: 'dp2', code: 'E1-6-01', name: 'Gross Scope 1 GHG emissions', description: 'Gross Scope 1 GHG emissions in metric tonnes of CO2eq.', 
        values: { "2024": 45200, "2023": 48500, "2022": 51000 }, unit: 'tCO2e', type: 'quantitative', status: WorkflowStatus.APPROVED, 
        ownerId: 'u2', department: Department.ENVIRONMENT, lastModified: '2023-10-15T10:00:00Z', 
        comments: [{ id: 'c1', userId: 'u1', userName: 'Maria Gonzalez', text: 'Please attach the ISO verification cert.', timestamp: '2023-10-14T09:00:00Z' }],
        mappings: { [StandardType.GRI]: '305-1', [StandardType.TCFD]: 'Metrics & Targets b)' }
      },
      { 
        id: 'dp3', code: 'E1-6-02', name: 'Gross Scope 2 GHG emissions (Location-based)', description: 'Gross Scope 2 GHG emissions location-based in metric tonnes of CO2eq.', 
        values: { "2024": 12500, "2023": 12100, "2022": 11800 }, unit: 'tCO2e', type: 'quantitative', status: WorkflowStatus.REVIEW, 
        ownerId: 'u2', department: Department.ENVIRONMENT, evidence: ['Utility_Bills_2023.pdf'],
        comments: [],
        mappings: { [StandardType.GRI]: '305-2' }
      },
      { 
        id: 'dp4', code: 'E1-6-03', name: 'Gross Scope 3 GHG emissions', description: 'Gross Scope 3 GHG emissions in metric tonnes of CO2eq.', 
        values: { "2024": null, "2023": 150000, "2022": null }, unit: 'tCO2e', type: 'quantitative', status: WorkflowStatus.DRAFT, 
        ownerId: 'u2', department: Department.ENVIRONMENT,
        comments: [],
        mappings: { [StandardType.GRI]: '305-3' }
      },
      { 
        id: 'dp5', code: 'E1-9', name: 'Anticipated financial effects', description: 'Disclosure of anticipated financial effects from material physical and transition risks.', 
        values: { "2024": null }, type: 'qualitative', status: WorkflowStatus.DRAFT, 
        ownerId: 'u1', department: Department.FINANCE,
        comments: [],
        mappings: { [StandardType.TCFD]: 'Strategy b)' }
      },
    ]
  },
  {
    id: 's2',
    code: 'ESRS S1',
    title: 'Own Workforce',
    datapoints: [
      { 
        id: 'dp6', code: 'S1-1', name: 'Policies related to own workforce', description: 'Policies in place regarding own workforce.', 
        values: { "2024": 'We adhere to ILO conventions.' }, type: 'qualitative', status: WorkflowStatus.APPROVED, 
        ownerId: 'u3', department: Department.HR,
        comments: [],
        mappings: { [StandardType.GRI]: '103-2' }
      },
      { 
        id: 'dp7', code: 'S1-9', name: 'Diversity indicators', description: 'Percentage of employees by gender at top management.', 
        values: { "2024": 35, "2023": 30, "2022": 25 }, unit: '%', type: 'quantitative', status: WorkflowStatus.REVIEW, 
        ownerId: 'u3', department: Department.HR,
        comments: [{ id: 'c2', userId: 'u1', userName: 'Maria Gonzalez', text: 'Does this include the new board members?', timestamp: '2023-10-20T14:30:00Z' }],
        mappings: { [StandardType.GRI]: '405-1' }
      },
      { 
        id: 'dp8', code: 'S1-13', name: 'Training and Skills Development', description: 'Average training hours per employee.', 
        values: { "2024": 24.5, "2023": 20, "2022": 18.5 }, unit: 'hours', type: 'quantitative', status: WorkflowStatus.APPROVED, 
        ownerId: 'u3', department: Department.HR,
        comments: [],
        mappings: { [StandardType.GRI]: '404-1' }
      },
    ]
  }
];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false }
  }
});

const PackEnabledContext = createContext<(enabled: boolean) => void>(() => {});

type WorkspacePhase = 'loading' | 'need' | 'ready';

// Inner App Component that uses hooks
type AppContentProps = {
  sectionsQuery: ReturnType<typeof useRemoteSectionsQuery>;
};

const AppContent: React.FC<AppContentProps> = ({ sectionsQuery }) => {
  const setPackEnabled = useContext(PackEnabledContext);
  const { currentRoute, setCurrentRoute } = useAppView();
  const { sections, activeSectionId, setActiveSectionId, updateDatapoint } = useSections();
  const { currentUser, setCurrentUser, users } = useUsers();
  const { isMobile } = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile); // Closed on mobile by default
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [organizationLabel, setOrganizationLabel] = useState<string | null>(null);
  const [workspacePhase, setWorkspacePhase] = useState<WorkspacePhase>(() =>
    !isApiConfigured() ? 'ready' : 'loading'
  );

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setApiAccessToken(session?.access_token ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setApiAccessToken(session?.access_token ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    void getSessionUser().then(u => {
      if (u) {
        setCurrentActorId(u.id);
        setCurrentUser(u);
        setIsAuthenticated(true);
      }
    });
  }, [setCurrentUser]);

  useEffect(() => {
    if (!supabase || !isAuthenticated) {
      setOrganizationLabel(null);
      return;
    }
    const orgId = resolveOrganizationIdForApi();
    void supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data?.name) {
          setOrganizationLabel(String(data.name));
        } else {
          setOrganizationLabel(orgId.slice(0, 8) + '…');
        }
      });
  }, [isAuthenticated, currentUser?.organizationId]);

  useEffect(() => {
    setPackEnabled(isApiConfigured() && isAuthenticated && workspacePhase === 'ready');
  }, [isAuthenticated, workspacePhase, setPackEnabled]);

  useEffect(() => {
    if (!isApiConfigured()) {
      setWorkspacePhase('ready');
      return;
    }
    if (!isAuthenticated) {
      setWorkspacePhase('loading');
      return;
    }
    if (!supabase) {
      setWorkspacePhase('ready');
      return;
    }
    let cancelled = false;
    void (async () => {
      if (isWorkspaceOnboardingDone() && getActiveReportingCycleId()) {
        if (!cancelled) setWorkspacePhase('ready');
        return;
      }
      const { data: orgs, error: orgErr } = await supabase
        .from('organizations')
        .select('id')
        .order('name');
      if (cancelled) return;
      if (orgErr || !orgs?.length) {
        setWorkspacePhase('need');
        return;
      }
      const targetOrg =
        currentUser?.organizationId && orgs.some((o) => o.id === currentUser.organizationId)
          ? currentUser.organizationId!
          : orgs[0].id;
      const { data: cycles } = await supabase
        .from('reporting_cycles')
        .select('id')
        .eq('organization_id', targetOrg)
        .order('period_start', { ascending: false, nullsFirst: false });
      if (cancelled) return;
      if (orgs.length === 1 && cycles?.length === 1) {
        setActiveOrganizationId(orgs[0].id);
        setActiveReportingCycleId(cycles[0].id);
        setWorkspaceOnboardingDone(true);
        setWorkspacePhase('ready');
        return;
      }
      setWorkspacePhase('need');
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, currentUser?.organizationId]);

  // Filter sections and datapoints based on user role and department (first-person view)
  const filteredSections = React.useMemo(() => {
    if (!isAuthenticated || !currentUser) return [];

    return sections.map(section => {
      const filteredDatapoints = section.datapoints.filter(datapoint => {
        // Admins see everything
        if (currentUser.role === Role.ADMIN) {
          return true;
        }
        
        // Data Owners see their department's datapoints and their own
        if (currentUser.role === Role.EDITOR) {
          return datapoint.department === currentUser.department || 
                 datapoint.ownerId === currentUser.id;
        }
        
        // Viewers see approved/locked datapoints
        if (currentUser.role === Role.VIEWER) {
          return datapoint.status === WorkflowStatus.APPROVED || 
                 datapoint.status === WorkflowStatus.LOCKED;
        }
        
        return false;
      });

      return {
        ...section,
        datapoints: filteredDatapoints
      };
    }).filter(section => section.datapoints.length > 0);
  }, [sections, currentUser, isAuthenticated]);

  // Update activeSectionId if current section is not in filtered sections
  React.useEffect(() => {
    if (filteredSections.length > 0 && !filteredSections.find(s => s.id === activeSectionId)) {
      setActiveSectionId(filteredSections[0].id);
    }
  }, [filteredSections, activeSectionId, setActiveSectionId]);

  const activeSection = filteredSections.find(s => s.id === activeSectionId) || filteredSections[0];

  const getBreadcrumbItems = (route: AppRoute) => {
    return breadcrumbItemsForRoute(route).map((b) => ({
      label: b.label,
      route: b.route,
    }));
  };


  const handleLogin = (user: User) => {
    setCurrentActorId(user.id);
    setCurrentUser(user);
    setIsAuthenticated(true);
    void recordAuditEvent({
      actorUserId: user.id,
      actorName: user.name,
      action: 'login',
      resourceType: 'session',
      resourceId: user.id
    });
  };

  const handleLogout = () => {
    void signOutSupabase();
    setCurrentActorId('anonymous');
    setIsAuthenticated(false);
    setCurrentUser({
      id: 'anonymous',
      name: 'Anonymous User',
      role: Role.VIEWER,
      department: Department.SUSTAINABILITY,
      avatar: 'AU'
    });
  };

  const dataLoading =
    isAuthenticated &&
    isApiConfigured() &&
    sectionsQuery.isPending &&
    !sectionsQuery.isError;

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login users={users} onLogin={handleLogin} />;
  }

  if (isApiConfigured() && workspacePhase === 'loading') {
    return (
      <div
        className="min-h-screen bg-black text-white flex items-center justify-center"
        style={{
          minHeight: '100vh',
          background: '#000000',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}
      >
        <p style={{ color: '#9ca3af', margin: 0 }}>Preparando espacio de trabajo…</p>
      </div>
    );
  }

  if (isApiConfigured() && workspacePhase === 'need') {
    return (
      <WorkspaceOnboarding
        defaultOrganizationId={currentUser?.organizationId}
        onComplete={() => setWorkspacePhase('ready')}
      />
    );
  }

  if (dataLoading) {
    return (
      <div
        className="min-h-screen bg-black text-white flex items-center justify-center"
        style={{
          minHeight: '100vh',
          background: '#000000',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}
      >
        <p style={{ color: '#9ca3af', margin: 0 }}>Cargando datos de reporting…</p>
      </div>
    );
  }
  
  const handleRouteChange = (route: AppRoute) => {
    setCurrentRoute(route);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleApiKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
        await window.aistudio.openSelectKey();
        window.location.reload(); 
    } else {
        alert("API Key selection not available in this environment.");
    }
  }

  const renderContent = () => {
    const dataSections = filteredSections.length > 0 ? filteredSections : sections;

    switch (currentRoute.type) {
      case 'dashboard':
        return (
          <Dashboard
            sections={filteredSections}
            currentUser={currentUser}
            reportingYear={REPORTING_YEAR}
            onNavigate={setCurrentRoute}
          />
        );
      case 'data':
        return (
          <DataHub
            sections={dataSections}
            reportingYear={REPORTING_YEAR}
            currentUser={currentUser}
            users={users}
            onUpdateDatapoint={updateDatapoint}
            activeTab={currentRoute.tab}
            onTabChange={(tab) => setCurrentRoute({ type: 'data', tab })}
          />
        );
      case 'governance':
        return (
          <GovernanceHub
            sections={dataSections}
            reportingYear={REPORTING_YEAR}
            currentUser={currentUser}
            activeTab={currentRoute.tab}
            onTabChange={(tab) => setCurrentRoute({ type: 'governance', tab })}
            showAuditorTab={currentUser.role === Role.VIEWER}
          />
        );
      case 'reporting':
        return (
          <ReportingHub
            sections={filteredSections}
            reportingYear={REPORTING_YEAR}
            activeSectionId={activeSectionId}
            setActiveSectionId={setActiveSectionId}
            activeTab={currentRoute.tab}
            onTabChange={(tab) => setCurrentRoute({ type: 'reporting', tab })}
          />
        );
      default:
        return <div className="text-[#6a6a6a]">Selecciona un área en el menú.</div>;
    }
  };

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* SIDEBAR - PALANTIR Style */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 sm:w-72 bg-[#0a0a0a] border-r border-[#2a2a2a] 
        flex flex-col flex-shrink-0 
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        overflow-y-auto
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#2a2a2a]">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-[#0066ff] rounded flex items-center justify-center mr-3">
              <ShieldCheck className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">NFQ ESG</span>
          </div>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-[#1a1a1a] rounded transition-colors"
            >
              <X className="w-5 h-5 text-[#aaaaaa]" />
            </button>
          )}
        </div>

        {/* USER INFO */}
        <div className="px-4 py-4 border-b border-[#2a2a2a]">
           <div className="flex items-center gap-3 mb-3">
             <div className="w-10 h-10 rounded-full bg-[#0066ff]/20 flex items-center justify-center text-sm font-medium text-[#0066ff]">
               {currentUser.avatar}
             </div>
             <div className="flex-1 min-w-0">
               <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
               <p className="text-xs text-[#6a6a6a] truncate">{currentUser.role}</p>
               {organizationLabel && (
                 <p className="text-[10px] text-[#5a5a5a] truncate mt-0.5" title={resolveOrganizationIdForApi()}>
                   Org: {organizationLabel}
                 </p>
               )}
             </div>
           </div>
           <button
             onClick={handleLogout}
             className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#6a6a6a] hover:text-white hover:bg-[#1a1a1a] rounded transition-colors"
           >
             <LogOut className="w-4 h-4" />
             Cerrar Sesión
           </button>
        </div>

        <AppSidebar
          currentRoute={currentRoute}
          onNavigate={handleRouteChange}
          currentUser={currentUser}
        />

        <div className="p-4 border-t border-[#2a2a2a]">
           <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0066ff] to-[#00d4ff] flex items-center justify-center text-white text-xs font-bold">
                 {currentUser.avatar}
              </div>
              <div className="overflow-hidden flex-1">
                 <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
                 <p className="text-xs text-[#6a6a6a] truncate">{currentUser.role}</p>
              </div>
           </div>
           <button 
             onClick={handleApiKey}
             className="flex items-center gap-2 text-xs text-[#6a6a6a] hover:text-white transition-colors w-full p-2 rounded hover:bg-[#1a1a1a]"
           >
              <Settings className="w-3 h-3" /> Configure API Key
           </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-black w-full">
        {/* HEADER - PALANTIR Style */}
        <header className="h-14 sm:h-16 bg-[#0a0a0a] border-b border-[#2a2a2a] flex items-center justify-between px-3 sm:px-4 lg:px-6 z-10 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 flex-1 min-w-0">
            {/* Mobile Menu Button */}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 sm:p-2 hover:bg-[#1a1a1a] rounded transition-colors lg:hidden flex-shrink-0"
              >
                <Menu className="w-5 h-5 text-[#cccccc]" />
              </button>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] uppercase tracking-wide text-[#6a6a6a] leading-tight">
                {routePillarLabel(currentRoute)}
              </span>
              <span className="text-base sm:text-lg lg:text-xl font-bold text-white truncate">
                {routePageTitle(currentRoute)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 flex-shrink-0">
             <div className="hidden sm:block px-2 sm:px-3 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-[10px] sm:text-xs font-medium text-[#cccccc] whitespace-nowrap">
                FY {REPORTING_YEAR}
             </div>
             <button className="relative p-1.5 sm:p-2 text-[#cccccc] hover:bg-[#1a1a1a] rounded transition-colors">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#ff4444] rounded-full border-2 border-[#0a0a0a]"></span>
             </button>
          </div>
        </header>

        {isApiConfigured() && sectionsQuery.isError && (
          <div
            role="alert"
            className="flex-shrink-0 px-3 sm:px-4 py-2 bg-amber-950/50 border-b border-amber-600/40 text-sm text-amber-100 flex flex-wrap items-center gap-2"
            style={{
              background: 'rgba(69, 26, 3, 0.5)',
              color: '#fef3c7',
              borderBottom: '1px solid rgba(217, 119, 6, 0.4)'
            }}
          >
            <span>
              No se pudo cargar datos desde Supabase. Se muestran datos de demostración.
            </span>
            <button
              type="button"
              onClick={() => void sectionsQuery.refetch()}
              className="px-2 py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-50 text-xs font-medium border border-amber-500/50"
              style={{ cursor: 'pointer' }}
            >
              Reintentar
            </button>
            {import.meta.env.DEV && sectionsQuery.error && (
              <span className="text-xs opacity-80 font-mono truncate max-w-full">
                {(sectionsQuery.error as Error).message}
              </span>
            )}
          </div>
        )}

        {/* VIEWPORT */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6 bg-black min-w-0">
           <div className="w-full max-w-full">
             {/* Breadcrumbs */}
             {isAuthenticated && (
               <Breadcrumbs
                 items={getBreadcrumbItems(currentRoute)}
                 onNavigate={handleRouteChange}
               />
             )}
             
             {renderContent()}
           </div>
        </div>
      </main>
    </div>
  );
};

function DataBootstrap() {
  const [packEnabled, setPackEnabled] = useState(false);
  const usersQuery = useRemoteUsersQuery({ enabled: packEnabled });
  const sectionsQuery = useRemoteSectionsQuery({ enabled: packEnabled });
  const syncedUsers = isApiConfigured() ? usersQuery.data ?? null : null;
  const syncedSections = isApiConfigured() ? sectionsQuery.data ?? null : null;

  return (
    <PackEnabledContext.Provider value={setPackEnabled}>
      <UsersProvider initialUsers={MOCK_USERS} syncedUsers={syncedUsers}>
        <SectionsProvider
          initialSections={MOCK_DATA}
          initialActiveSectionId={MOCK_DATA[0]?.id}
          syncedSections={syncedSections}
        >
          <MaterialityProvider>
            <AppViewProvider initialRoute={{ type: 'dashboard' }}>
              <AppContent sectionsQuery={sectionsQuery} />
            </AppViewProvider>
          </MaterialityProvider>
        </SectionsProvider>
      </UsersProvider>
    </PackEnabledContext.Provider>
  );
}

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <DataBootstrap />
  </QueryClientProvider>
);

export default App;