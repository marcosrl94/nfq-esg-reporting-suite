/**
 * Workflow Status Board - Tipo Kanban
 */
import React from 'react';
import { WorkflowStatus } from '../../types';
import { ArrowRight, Clock, CheckCircle, AlertCircle, Lock } from 'lucide-react';

interface WorkflowItem {
  id: string;
  code: string;
  name: string;
  owner: {
    id: string;
    name: string;
    avatar: string;
  };
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: WorkflowStatus;
}

interface WorkflowStage {
  stage: WorkflowStatus;
  count: number;
  items: WorkflowItem[];
}

interface WorkflowStatusBoardProps {
  stages: WorkflowStage[];
  onItemClick?: (item: WorkflowItem) => void;
  onStatusChange?: (itemId: string, newStatus: WorkflowStatus) => void;
}

const STATUS_CONFIG: Record<WorkflowStatus, { label: string; color: string; icon: React.ReactNode }> = {
  'Draft': {
    label: 'Draft',
    color: 'bg-[#6a6a6a]',
    icon: <Clock className="w-4 h-4" />
  },
  'Review': {
    label: 'In Review',
    color: 'bg-[#ffaa00]',
    icon: <AlertCircle className="w-4 h-4" />
  },
  'Approved': {
    label: 'Approved',
    color: 'bg-[#00ff88]',
    icon: <CheckCircle className="w-4 h-4" />
  },
  'Locked': {
    label: 'Locked',
    color: 'bg-[#2a2a2a]',
    icon: <Lock className="w-4 h-4" />
  }
};

export const WorkflowStatusBoard: React.FC<WorkflowStatusBoardProps> = ({
  stages,
  onItemClick,
  onStatusChange
}) => {
  const handleItemClick = (item: WorkflowItem) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-[#ff4444]';
      case 'medium':
        return 'border-l-[#ffaa00]';
      case 'low':
        return 'border-l-[#0066ff]';
      default:
        return 'border-l-[#6a6a6a]';
    }
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: `Overdue ${Math.abs(diffDays)} days`, color: 'text-red-500' };
    } else if (diffDays === 0) {
      return { text: 'Due today', color: 'text-orange-500' };
    } else if (diffDays <= 3) {
      return { text: `Due in ${diffDays} days`, color: 'text-orange-500' };
    } else {
      return { text: `Due in ${diffDays} days`, color: 'text-gray-500' };
    }
  };

  return (
    <div className="bg-[#1e1e1e] p-4 lg:p-6 rounded border border-[#2a2a2a]">
      <h3 className="text-base lg:text-lg font-bold text-white mb-4">
        Workflow Status & Ownership
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stages.map((stage) => {
          const config = STATUS_CONFIG[stage.stage];
          
          return (
            <div key={stage.stage} className="bg-[#0a0a0a] rounded border border-[#2a2a2a]">
              {/* Header */}
              <div className={`p-3 border-b border-[#2a2a2a] flex items-center justify-between ${config.color}`}>
                <div className="flex items-center gap-2">
                  {config.icon}
                  <span className="text-sm font-semibold text-white">{config.label}</span>
                </div>
                <span className="bg-black/30 text-white text-xs font-bold px-2 py-1 rounded">
                  {stage.count}
                </span>
              </div>
              
              {/* Items */}
              <div className="p-2 space-y-2 max-h-96 overflow-y-auto">
                {stage.items.length === 0 ? (
                  <div className="text-center py-8 text-[#6a6a6a] text-sm">
                    No items
                  </div>
                ) : (
                  stage.items.map((item) => {
                    const dueDateInfo = formatDueDate(item.dueDate);
                    
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className={`bg-[#1e1e1e] border-l-4 ${getPriorityColor(item.priority)} 
                                   rounded p-3 cursor-pointer hover:bg-[#2a2a2a] transition-colors`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs font-bold text-[#6a6a6a] bg-[#0a0a0a] px-1.5 rounded">
                                {item.code}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-white truncate">
                              {item.name}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#0066ff]/20 flex items-center justify-center text-xs font-medium text-[#0066ff]">
                              {item.owner.avatar}
                            </div>
                            <span className="text-xs text-[#6a6a6a] truncate">
                              {item.owner.name.split(' ')[0]}
                            </span>
                          </div>
                          <span className={`text-xs ${dueDateInfo.color}`}>
                            {dueDateInfo.text}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
