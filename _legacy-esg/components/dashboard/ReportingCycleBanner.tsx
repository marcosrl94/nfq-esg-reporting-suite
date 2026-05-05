/**
 * Reporting Cycle Banner - Sygris "campaigns" style
 * Muestra ciclo de reporte y plazo de cierre de datos
 */
import React from 'react';
import { Calendar, Clock, AlertCircle } from 'lucide-react';

interface ReportingCycleBannerProps {
  reportingYear: number;
  dataDeadline?: string; // ISO date
  onConfigure?: () => void;
}

export const ReportingCycleBanner: React.FC<ReportingCycleBannerProps> = ({
  reportingYear,
  dataDeadline,
  onConfigure
}) => {
  const deadline = dataDeadline ? new Date(dataDeadline) : null;
  const now = new Date();
  const daysRemaining = deadline ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isOverdue = daysRemaining !== null && daysRemaining < 0;

  return (
    <div className="bg-gradient-to-r from-[#1a1a1a] to-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-[#0066ff]/20 rounded-lg">
          <Calendar className="w-5 h-5 text-[#0066ff]" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-white">{reportingYear} Reporting Cycle</h3>
          <p className="text-xs text-[#6a6a6a]">
            {deadline ? (
              isOverdue ? (
                <span className="text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Cierre de datos vencido hace {Math.abs(daysRemaining)} días
                </span>
              ) : daysRemaining <= 7 ? (
                <span className="text-yellow-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {daysRemaining} días para cierre de datos
                </span>
              ) : (
                <span className="text-[#6a6a6a] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Cierre de datos: {deadline.toLocaleDateString('es-ES')}
                </span>
              )
            ) : (
              'Configura el plazo de cierre de datos'
            )}
          </p>
        </div>
      </div>
      {onConfigure && (
        <button
          onClick={onConfigure}
          className="text-xs text-[#0066ff] hover:text-[#00aaff] flex items-center gap-1"
        >
          Configurar
        </button>
      )}
    </div>
  );
};
