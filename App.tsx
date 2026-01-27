import React, { useState } from 'react';
import { LayoutDashboard, Database, PenTool, FileBarChart, Settings, Bell, ShieldCheck, ChevronDown, Target, BookOpen, Menu, X, LogOut } from 'lucide-react';
import { useMobile } from './hooks/useMobile';
import Dashboard from './components/Dashboard';
import DataInput from './components/DataInput';
import NarrativeEngine from './components/NarrativeEngine';
import MaterialityAssessment from './components/MaterialityAssessment';
import IndexComposer from './components/IndexComposer';
import FinalReport from './components/FinalReport';
import Login from './components/Login';
import { StandardSection, WorkflowStatus, User, Role, Department, StandardType } from './types';
import { SectionsProvider, UsersProvider, AppViewProvider, useSections, useUsers, useAppView, View } from './contexts';

// Global Configuration
export const REPORTING_YEAR = 2024;

// --- MOCK USERS ---
const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Maria Gonzalez', role: Role.ADMIN, department: Department.SUSTAINABILITY, avatar: 'MG' },
  { id: 'u2', name: 'Carlos Ruiz', role: Role.EDITOR, department: Department.ENVIRONMENT, avatar: 'CR' },
  { id: 'u3', name: 'Sofia Lee', role: Role.EDITOR, department: Department.HR, avatar: 'SL' },
];

// --- MOCK DATA INITIALIZATION ---
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

// Inner App Component that uses hooks
const AppContent: React.FC = () => {
  const { currentView, setCurrentView } = useAppView();
  const { sections, activeSectionId, setActiveSectionId, updateDatapoint } = useSections();
  const { currentUser, setCurrentUser, users } = useUsers();
  const { isMobile, isTablet } = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile); // Closed on mobile by default
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser({
      id: 'anonymous',
      name: 'Anonymous User',
      role: Role.VIEWER,
      department: Department.SUSTAINABILITY,
      avatar: 'AU'
    });
  };

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login users={users} onLogin={handleLogin} />;
  }
  
  // Close sidebar when navigating on mobile
  const handleViewChange = (view: View) => {
    setCurrentView(view);
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

  // --- RENDER CONTENT ---
  const renderContent = () => {
    switch (currentView) {
      case View.DASHBOARD:
        return <Dashboard sections={filteredSections} currentUser={currentUser} reportingYear={REPORTING_YEAR} />;
      case View.MATERIALITY:
        return <MaterialityAssessment />;
      case View.DATA:
        return activeSection ? (
          <DataInput section={activeSection} onUpdateDatapoint={updateDatapoint} currentUser={currentUser} users={users} reportingYear={REPORTING_YEAR} />
        ) : (
          <div className="p-6 text-center text-[#6a6a6a]">
            <p>No hay secciones disponibles para tu perfil.</p>
          </div>
        );
      case View.NARRATIVE:
        return activeSection ? (
          <NarrativeEngine section={activeSection} reportingYear={REPORTING_YEAR} />
        ) : (
          <div className="p-6 text-center text-[#6a6a6a]">
            <p>No hay secciones disponibles para tu perfil.</p>
          </div>
        );
      case View.INDEX:
        return <IndexComposer sections={filteredSections} />;
      case View.REPORT:
        return <FinalReport reportingYear={REPORTING_YEAR} />;
      default:
        return <div>Select a view</div>;
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

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6a] px-3 mb-2">
             Start Here
          </div>
          <button 
            onClick={() => handleViewChange(View.DASHBOARD)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition-colors ${
              currentView === View.DASHBOARD 
                ? 'bg-[#0066ff] text-white' 
                : 'hover:bg-[#1a1a1a] text-[#cccccc]'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </button>
          <button 
            onClick={() => handleViewChange(View.MATERIALITY)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition-colors ${
              currentView === View.MATERIALITY 
                ? 'bg-[#0066ff] text-white' 
                : 'hover:bg-[#1a1a1a] text-[#cccccc]'
            }`}
          >
            <Target className="w-5 h-5" />
            <span className="font-medium">Double Materiality</span>
          </button>

          <div className="pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-[#6a6a6a] px-3">
             Data & Governance
          </div>
          <button 
            onClick={() => handleViewChange(View.DATA)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition-colors ${
              currentView === View.DATA 
                ? 'bg-[#0066ff] text-white' 
                : 'hover:bg-[#1a1a1a] text-[#cccccc]'
            }`}
          >
            <Database className="w-5 h-5" />
            <span className="font-medium">Data Ingestion</span>
          </button>
          
          <div className="pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-[#6a6a6a] px-3">
             Reporting & Output
          </div>
          <button 
            onClick={() => handleViewChange(View.NARRATIVE)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition-colors ${
              currentView === View.NARRATIVE 
                ? 'bg-[#0066ff] text-white' 
                : 'hover:bg-[#1a1a1a] text-[#cccccc]'
            }`}
          >
            <PenTool className="w-5 h-5" />
            <span className="font-medium">Narrative Engine</span>
          </button>
          <button 
            onClick={() => handleViewChange(View.INDEX)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition-colors ${
              currentView === View.INDEX 
                ? 'bg-[#0066ff] text-white' 
                : 'hover:bg-[#1a1a1a] text-[#cccccc]'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="font-medium">Index Composer</span>
          </button>
          <button 
            onClick={() => handleViewChange(View.REPORT)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition-colors ${
              currentView === View.REPORT 
                ? 'bg-[#0066ff] text-white' 
                : 'hover:bg-[#1a1a1a] text-[#cccccc]'
            }`}
          >
            <FileBarChart className="w-5 h-5" />
            <span className="font-medium">Final Reports</span>
          </button>
        </nav>

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
            <h1 className="text-base sm:text-lg lg:text-xl font-bold text-white truncate">{currentView}</h1>
            {(currentView === View.DATA || currentView === View.NARRATIVE) && filteredSections.length > 0 && (
              <select 
                value={activeSectionId}
                onChange={(e) => setActiveSectionId(e.target.value)}
                className="hidden md:block ml-2 lg:ml-4 pl-2 sm:pl-3 pr-6 sm:pr-8 py-1 sm:py-1.5 text-xs sm:text-sm bg-[#1a1a1a] border border-[#2a2a2a] rounded text-white focus:outline-none focus:border-[#00d4ff] transition-colors max-w-xs truncate"
              >
                {filteredSections.map(s => (
                  <option key={s.id} value={s.id} className="bg-[#1a1a1a]">{s.code}: {s.title}</option>
                ))}
              </select>
            )}
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

        {/* VIEWPORT */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6 bg-black min-w-0">
           <div className="w-full max-w-full">
             {renderContent()}
           </div>
        </div>
      </main>
    </div>
  );
};

// Main App Component with Providers
const App: React.FC = () => {
  return (
    <UsersProvider initialUsers={MOCK_USERS}>
      <SectionsProvider initialSections={MOCK_DATA} initialActiveSectionId={MOCK_DATA[0]?.id}>
        <AppViewProvider initialView={View.DASHBOARD}>
          <AppContent />
        </AppViewProvider>
      </SectionsProvider>
    </UsersProvider>
  );
};

export default App;