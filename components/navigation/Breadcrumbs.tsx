/**
 * Migas de pan: hilo principal (Inicio) y sub-hilos del pilar activo.
 */
import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import type { AppRoute } from '../../contexts/appRoutes';

export type BreadcrumbItem = {
  label: string;
  route?: AppRoute;
  onClick?: () => void;
};

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate?: (route: AppRoute) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, onNavigate }) => {
  const handleClick = (item: BreadcrumbItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.route && onNavigate) {
      onNavigate(item.route);
    }
  };

  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm text-[#6a6a6a] mb-4">
      <button
        type="button"
        onClick={() => onNavigate && onNavigate({ type: 'dashboard' })}
        className="flex items-center gap-1 hover:text-white transition-colors"
      >
        <Home className="w-4 h-4" />
        <span>Inicio</span>
      </button>

      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          {index === items.length - 1 ? (
            <span className="text-white font-medium">{item.label}</span>
          ) : (
            <button
              type="button"
              onClick={() => handleClick(item)}
              className="hover:text-white transition-colors text-left"
            >
              {item.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
