/**
 * Recent Activity Log - Sygris/Workiva audit trail style
 * Trazabilidad de cambios recientes en datapoints
 */
import React, { useMemo } from 'react';
import { History, Edit2, CheckCircle, FileText } from 'lucide-react';
import { StandardSection, WorkflowStatus } from '../../types';

interface RecentActivityLogProps {
  sections: StandardSection[];
  limit?: number;
}

export const RecentActivityLog: React.FC<RecentActivityLogProps> = ({
  sections,
  limit = 10
}) => {
  const activities = useMemo(() => {
    const items: Array<{
      id: string;
      datapointCode: string;
      datapointName: string;
      sectionCode: string;
      timestamp: string;
      type: 'modified' | 'approved' | 'review';
    }> = [];

    sections.forEach(section => {
      section.datapoints.forEach(dp => {
        if (dp.lastModified) {
          const status = dp.status;
          items.push({
            id: dp.id,
            datapointCode: dp.code,
            datapointName: dp.name,
            sectionCode: section.code,
            timestamp: dp.lastModified,
            type: status === WorkflowStatus.APPROVED || status === WorkflowStatus.LOCKED ? 'approved' :
                  status === WorkflowStatus.REVIEW ? 'review' : 'modified'
          });
        }
      });
    });

    return items
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }, [sections, limit]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return d.toLocaleDateString('es-ES');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'approved': return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'review': return <FileText className="w-3 h-3 text-yellow-500" />;
      default: return <Edit2 className="w-3 h-3 text-[#0066ff]" />;
    }
  };

  return (
    <div className="bg-[#1e1e1e] p-4 lg:p-6 rounded border border-[#2a2a2a]">
      <h3 className="text-base lg:text-lg font-bold text-white mb-4 flex items-center gap-2">
        <History className="w-5 h-5 text-[#0066ff]" />
        Actividad Reciente
      </h3>
      <p className="text-xs text-[#6a6a6a] mb-4">
        Trazabilidad de cambios para auditoría
      </p>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {activities.length === 0 ? (
          <p className="text-sm text-[#6a6a6a] py-4 text-center">Sin actividad reciente</p>
        ) : (
          activities.map(a => (
            <div
              key={`${a.id}-${a.timestamp}`}
              className="flex items-start gap-2 p-2 rounded hover:bg-[#1a1a1a] border-l-2 border-transparent"
            >
              <div className="flex-shrink-0 mt-0.5">{getIcon(a.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">
                  <span className="font-mono text-[#0066ff]">{a.datapointCode}</span>
                  {' '}{a.datapointName}
                </p>
                <p className="text-[10px] text-[#6a6a6a]">{a.sectionCode}</p>
              </div>
              <span className="text-[10px] text-[#6a6a6a] flex-shrink-0">
                {formatTime(a.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
