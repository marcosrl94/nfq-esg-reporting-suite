import React, { useState } from 'react';
import { StandardSection, WorkflowStatus, User, Department } from '../types';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import { KPICard } from './dashboard/KPICard';
import { ReadinessScoring } from './dashboard/ReadinessScoring';
import { WorkflowStatusBoard } from './dashboard/WorkflowStatusBoard';
import { GapAnalysis } from './dashboard/GapAnalysis';
import { ESRSCoverageHeatmap } from './dashboard/ESRSCoverageHeatmap';
import { ReportingCycleBanner } from './dashboard/ReportingCycleBanner';
import { RecentActivityLog } from './dashboard/RecentActivityLog';
import { RemindersPanel } from './dashboard/RemindersPanel';
import { VariationAlertsPanel } from './dashboard/VariationAlertsPanel';
import type { AppRoute } from '../contexts/appRoutes';

interface DashboardProps {
  sections: StandardSection[];
  currentUser: User;
  reportingYear: number;
  onNavigate?: (route: AppRoute) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ sections, currentUser, reportingYear, onNavigate }) => {
  const [dataDeadline] = useState<string | undefined>(() => {
    const d = new Date(reportingYear + 1, 2, 31); // 31 marzo año siguiente al ejercicio
    return d.toISOString().split('T')[0];
  });
  // Aggregate stats
  let total = 0;
  let approved = 0;
  let review = 0;
  let draft = 0;
  let locked = 0;

  // Department Stats
  const deptStats: Record<string, { total: number, approved: number }> = {};
  Object.values(Department).forEach(d => deptStats[d] = { total: 0, approved: 0 });

  // User Tasks
  const myTasks: { id: string, code: string, name: string, status: string, department: string }[] = [];

  sections.forEach(s => {
    s.datapoints.forEach(d => {
      total++;
      if (d.status === WorkflowStatus.APPROVED) approved++;
      else if (d.status === WorkflowStatus.REVIEW) review++;
      else if (d.status === WorkflowStatus.LOCKED) locked++;
      else draft++;

      // Department Logic
      if (deptStats[d.department]) {
        deptStats[d.department].total++;
        if (d.status === WorkflowStatus.APPROVED || d.status === WorkflowStatus.LOCKED) {
           deptStats[d.department].approved++;
        }
      }

      // My Tasks Logic (If I am the owner and it is NOT approved yet)
      if (d.ownerId === currentUser.id && d.status !== WorkflowStatus.APPROVED && d.status !== WorkflowStatus.LOCKED) {
         myTasks.push({
            id: d.id,
            code: d.code,
            name: d.name,
            status: d.status,
            department: d.department
         });
      }
    });
  });

  const completionData = [
    { name: 'Approved', value: approved, color: '#00ff88' },
    { name: 'In Review', value: review, color: '#ffaa00' },
    { name: 'Draft', value: draft, color: '#6a6a6a' },
    { name: 'Locked', value: locked, color: '#2a2a2a' },
  ];

  const departmentData = Object.keys(deptStats).map(dept => ({
     name: dept.split(' ')[0], // Shorten name
     fullName: dept,
     progress: deptStats[dept].total > 0 ? Math.round((deptStats[dept].approved / deptStats[dept].total) * 100) : 0
  }));

  return (
    <div className="space-y-4 lg:space-y-6 w-full max-w-full overflow-x-hidden">
      
      {/* Reporting Cycle Banner - Sygris campaigns style */}
      <ReportingCycleBanner
        reportingYear={reportingYear}
        dataDeadline={dataDeadline}
      />

      <VariationAlertsPanel sections={sections} reportingYear={reportingYear} />

      {/* Welcome & My Tasks Header */}
      <div className="flex flex-col md:flex-row gap-4 lg:gap-6">
         <div className="flex-1">
            <h2 className="text-xl lg:text-2xl font-bold text-white">Welcome back, {currentUser.name.split(' ')[0]}</h2>
            <p className="text-[#aaaaaa] mt-1 text-sm lg:text-base">
               Panel de seguimiento · FY {reportingYear} | <span className="font-semibold text-[#cccccc]">{currentUser.role}</span>
            </p>
         </div>
      </div>

      {/* Overview indicadores reportados vs pendientes */}
      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg p-4 lg:p-6">
        <h3 className="text-base font-bold text-white mb-4">Indicadores ESG · Estado de reporte</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
            <p className="text-xs text-[#6a6a6a] mb-1">Reportados</p>
            <p className="text-2xl font-bold text-green-500">{approved + locked}</p>
            <p className="text-xs text-[#6a6a6a] mt-1">Aprobados / Bloqueados</p>
          </div>
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
            <p className="text-xs text-[#6a6a6a] mb-1">Pendientes</p>
            <p className="text-2xl font-bold text-amber-500">{draft + review}</p>
            <p className="text-xs text-[#6a6a6a] mt-1">Draft / En revisión</p>
          </div>
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
            <p className="text-xs text-[#6a6a6a] mb-1">Total</p>
            <p className="text-2xl font-bold text-white">{total}</p>
            <p className="text-xs text-[#6a6a6a] mt-1">Indicadores</p>
          </div>
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4 flex flex-col justify-center">
            <p className="text-xs text-[#6a6a6a] mb-1">Progreso</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${total > 0 ? Math.round(((approved + locked) / total) * 100) : 0}%` }}
                />
              </div>
              <span className="text-sm font-bold text-white">
                {total > 0 ? Math.round(((approved + locked) / total) * 100) : 0}%
              </span>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate({ type: 'data', tab: 'indicators' })}
                className="mt-3 text-xs text-[#0066ff] hover:underline font-medium"
              >
                Ir a carga de datos (indicadores) →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards - Con drill-down */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-6">
        <KPICard
          label="Total Datapoints"
          value={total}
          trend="up"
          trendValue={Math.round(((total - (total - approved)) / total) * 100)}
          color="blue"
          breakdown={{
            byStatus: {
              'Approved': approved,
              'In Review': review,
              'Draft': draft,
              'Locked': locked
            },
            byFunction: deptStats
          }}
        />
        <KPICard
          label="Ready"
          value={approved}
          trend="stable"
          color="green"
        />
        <KPICard
          label="At Risk"
          value={review}
          trend="down"
          trendValue={Math.round((review / total) * 100)}
          color="orange"
        />
        <KPICard
          label="Blocked"
          value={locked}
          color="gray"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        
        {/* Global Progress */}
        <div className="bg-[#1e1e1e] p-4 lg:p-6 rounded border border-[#2a2a2a] lg:col-span-1 min-h-0">
          <h3 className="text-sm sm:text-base lg:text-lg font-bold text-white mb-3 lg:mb-6">Workflow Status</h3>
          <div className="h-64 sm:h-72 lg:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={completionData}
                  cx="50%"
                  cy="50%"
                  innerRadius="30%"
                  outerRadius="50%"
                  paddingAngle={2}
                  dataKey="value"
                  labelLine={false}
                >
                  {completionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e1e1e', 
                    border: '1px solid #2a2a2a',
                    borderRadius: '4px',
                    color: '#ffffff',
                    fontSize: '12px'
                  }} 
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={40}
                  wrapperStyle={{ color: '#cccccc', fontSize: '11px' }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Readiness + Gap Analysis */}
        <div className="lg:col-span-2 space-y-4">
          <ReadinessScoring
            scores={Object.entries(deptStats).map(([dept, stats]) => ({
              dimension: 'function' as const,
              dimensionValue: dept.split(' ')[0],
              score: stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0,
              total: stats.total,
              completed: stats.approved,
              inProgress: 0, // Calcular desde datapoints
              blocked: 0
            }))}
            type="function"
          />
          <GapAnalysis
            sections={sections}
            reportingYear={reportingYear}
            onNavigateToData={
              onNavigate ? () => onNavigate({ type: 'data', tab: 'indicators' }) : undefined
            }
          />
        </div>
      </div>

      {/* ESRS Heatmap + Activity Log + Recordatorios - Sygris style */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <ESRSCoverageHeatmap sections={sections} reportingYear={reportingYear} />
        <RecentActivityLog sections={sections} limit={8} />
        <RemindersPanel />
      </div>

      {/* Workflow Status Board */}
      <WorkflowStatusBoard
        stages={[
          {
            stage: WorkflowStatus.DRAFT,
            count: draft,
            items: sections.flatMap(s => 
              s.datapoints
                .filter(d => d.status === WorkflowStatus.DRAFT && d.ownerId === currentUser.id)
                .map(d => ({
                  id: d.id,
                  code: d.code,
                  name: d.name,
                  owner: {
                    id: d.ownerId || currentUser.id,
                    name: currentUser.name,
                    avatar: currentUser.avatar
                  },
                  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  priority: 'medium' as const,
                  status: d.status
                }))
            )
          },
          {
            stage: WorkflowStatus.REVIEW,
            count: review,
            items: sections.flatMap(s => 
              s.datapoints
                .filter(d => d.status === WorkflowStatus.REVIEW)
                .map(d => ({
                  id: d.id,
                  code: d.code,
                  name: d.name,
                  owner: {
                    id: d.ownerId || currentUser.id,
                    name: currentUser.name,
                    avatar: currentUser.avatar
                  },
                  dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                  priority: 'high' as const,
                  status: d.status
                }))
            )
          },
          {
            stage: WorkflowStatus.APPROVED,
            count: approved,
            items: []
          },
          {
            stage: WorkflowStatus.LOCKED,
            count: locked,
            items: []
          }
        ]}
        onItemClick={(item) => {
          // Navegar a datapoint
          console.log('Navigate to datapoint:', item.id);
        }}
      />
      
    </div>
  );
};

export default Dashboard;