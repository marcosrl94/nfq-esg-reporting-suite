import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { AppRoute } from './appRoutes';

export type { AppRoute } from './appRoutes';
export {
  DEFAULT_DATA_TAB,
  DEFAULT_REPORTING_TAB,
  defaultGovernanceTabForRole,
  routeEquals,
  routePageTitle,
  routePillarLabel,
  dataTabLabel,
  governanceTabLabel,
  reportingTabLabel,
  breadcrumbItemsForRoute,
} from './appRoutes';
export type { DataLoadTab, GovernanceTab, ReportingTab, BreadcrumbNavItem } from './appRoutes';

const DEFAULT_ROUTE: AppRoute = { type: 'dashboard' };

interface AppViewContextType {
  currentRoute: AppRoute;
  setCurrentRoute: (route: AppRoute) => void;
}

const AppViewContext = createContext<AppViewContextType | undefined>(undefined);

interface AppViewProviderProps {
  children: ReactNode;
  initialRoute?: AppRoute;
}

export const AppViewProvider: React.FC<AppViewProviderProps> = ({
  children,
  initialRoute = DEFAULT_ROUTE,
}) => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(initialRoute);

  const value: AppViewContextType = {
    currentRoute,
    setCurrentRoute,
  };

  return <AppViewContext.Provider value={value}>{children}</AppViewContext.Provider>;
};

export const useAppView = (): AppViewContextType => {
  const context = useContext(AppViewContext);
  if (!context) {
    throw new Error('useAppView must be used within an AppViewProvider');
  }
  return context;
};
