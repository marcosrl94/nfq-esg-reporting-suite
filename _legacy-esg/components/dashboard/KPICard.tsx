/**
 * KPI Card Component - Con drill-down
 */
import React from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: number;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  onClick?: () => void;
  breakdown?: {
    byFunction?: Record<string, number>;
    byESRS?: Record<string, number>;
    byStatus?: Record<string, number>;
  };
  color?: 'blue' | 'green' | 'orange' | 'red' | 'gray';
}

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  trend,
  trendValue,
  onClick,
  breakdown,
  color = 'blue'
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    // Si hay breakdown pero no onClick, el componente padre puede manejar la navegación
  };
  
  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getColorClasses = () => {
    const colors = {
      blue: 'bg-[#0066ff]/20 text-[#0066ff]',
      green: 'bg-[#00ff88]/20 text-[#00ff88]',
      orange: 'bg-[#ffaa00]/20 text-[#ffaa00]',
      red: 'bg-[#ff4444]/20 text-[#ff4444]',
      gray: 'bg-[#6a6a6a]/20 text-[#6a6a6a]'
    };
    return colors[color];
  };
  
  return (
    <div
      onClick={handleClick}
      className={`bg-[#1e1e1e] p-4 lg:p-6 rounded border border-[#2a2a2a] 
                 ${onClick || breakdown ? 'cursor-pointer hover:border-[#0066ff] transition-colors' : ''}
                 flex items-center gap-3 lg:gap-4 min-w-0`}
    >
      <div className={`p-2 lg:p-3 rounded-full flex-shrink-0 ${getColorClasses()}`}>
        {breakdown && <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs lg:text-sm text-[#6a6a6a] truncate">{label}</p>
          {trend && getTrendIcon()}
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-xl lg:text-2xl font-bold text-white truncate">
            {value.toLocaleString()}
          </p>
          {trendValue !== undefined && (
            <span className={`text-xs lg:text-sm ${
              trend === 'up' ? 'text-green-500' : 
              trend === 'down' ? 'text-red-500' : 
              'text-gray-500'
            }`}>
              {trend === 'up' ? '+' : ''}{trendValue}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
