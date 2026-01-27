import React, { createContext, useContext, useState, ReactNode } from 'react';

export enum View {
  DASHBOARD = 'Dashboard',
  MATERIALITY = 'Materiality Assessment',
  DATA = 'Data Ingestion',
  NARRATIVE = 'Narrative Engine',
  INDEX = 'Index Composer',
  REPORT = 'Final Report'
}

interface AppViewContextType {
  currentView: View;
  setCurrentView: (view: View) => void;
}

const AppViewContext = createContext<AppViewContextType | undefined>(undefined);

interface AppViewProviderProps {
  children: ReactNode;
  initialView?: View;
}

export const AppViewProvider: React.FC<AppViewProviderProps> = ({ 
  children, 
  initialView = View.DASHBOARD 
}) => {
  const [currentView, setCurrentView] = useState<View>(initialView);

  const value: AppViewContextType = {
    currentView,
    setCurrentView,
  };

  return (
    <AppViewContext.Provider value={value}>
      {children}
    </AppViewContext.Provider>
  );
};

export const useAppView = (): AppViewContextType => {
  const context = useContext(AppViewContext);
  if (!context) {
    throw new Error('useAppView must be used within an AppViewProvider');
  }
  return context;
};
