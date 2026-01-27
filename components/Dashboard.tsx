import React from 'react';
import { StandardSection, WorkflowStatus, User, Department } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { AlertCircle, CheckCircle, FileText, Lock, ArrowRight, UserCircle } from 'lucide-react';

interface DashboardProps {
  sections: StandardSection[];
  currentUser: User;
  reportingYear: number;
}

const Dashboard: React.FC<DashboardProps> = ({ sections, currentUser, reportingYear }) => {
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
      
      {/* Welcome & My Tasks Header */}
      <div className="flex flex-col md:flex-row gap-4 lg:gap-6">
         <div className="flex-1">
            <h2 className="text-xl lg:text-2xl font-bold text-white">Welcome back, {currentUser.name.split(' ')[0]}</h2>
            <p className="text-[#aaaaaa] mt-1 text-sm lg:text-base">
               Reporting Cycle: <span className="font-bold text-[#0066ff]">FY {reportingYear}</span> | Role: <span className="font-semibold text-[#cccccc]">{currentUser.role}</span>
            </p>
         </div>
      </div>

      {/* KPI Cards - PALANTIR Style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-6">
        <div className="bg-[#1e1e1e] p-3 sm:p-4 lg:p-6 rounded border border-[#2a2a2a] flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0">
           <div className="p-1.5 sm:p-2 lg:p-3 bg-[#1a1a1a] rounded-full text-[#0066ff] flex-shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
           </div>
           <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs lg:text-sm text-[#6a6a6a] truncate">Total</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">{total}</p>
           </div>
        </div>
        <div className="bg-[#1e1e1e] p-3 sm:p-4 lg:p-6 rounded border border-[#2a2a2a] flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0">
           <div className="p-1.5 sm:p-2 lg:p-3 bg-[#1a1a1a] rounded-full text-[#00ff88] flex-shrink-0">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
           </div>
           <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs lg:text-sm text-[#6a6a6a] truncate">Approved</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">{approved}</p>
           </div>
        </div>
        <div className="bg-[#1e1e1e] p-3 sm:p-4 lg:p-6 rounded border border-[#2a2a2a] flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0">
           <div className="p-1.5 sm:p-2 lg:p-3 bg-[#1a1a1a] rounded-full text-[#ffaa00] flex-shrink-0">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
           </div>
           <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs lg:text-sm text-[#6a6a6a] truncate">In Review</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">{review}</p>
           </div>
        </div>
        <div className="bg-[#1e1e1e] p-3 sm:p-4 lg:p-6 rounded border border-[#2a2a2a] flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0">
           <div className="p-1.5 sm:p-2 lg:p-3 bg-[#1a1a1a] rounded-full text-[#6a6a6a] flex-shrink-0">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
           </div>
           <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs lg:text-sm text-[#6a6a6a] truncate">Locked</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">{locked}</p>
           </div>
        </div>
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

        {/* Department Progress */}
        <div className="bg-[#1e1e1e] p-4 lg:p-6 rounded border border-[#2a2a2a] lg:col-span-2 min-h-0">
          <h3 className="text-sm sm:text-base lg:text-lg font-bold text-white mb-3 lg:mb-6">Readiness by Function</h3>
          <div className="h-64 sm:h-72 lg:h-80 w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
              <BarChart data={departmentData} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#2a2a2a" />
                <XAxis 
                  type="number" 
                  domain={[0, 100]} 
                  stroke="#6a6a6a"
                  tick={{ fill: '#aaaaaa', fontSize: 11 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={60}
                  tick={{ fill: '#aaaaaa', fontSize: 11 }} 
                  stroke="#6a6a6a"
                />
                <Tooltip 
                  cursor={{fill: 'transparent'}} 
                  contentStyle={{ 
                    backgroundColor: '#1e1e1e', 
                    border: '1px solid #2a2a2a',
                    borderRadius: '4px',
                    color: '#ffffff',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [`${value}%`, 'Readiness']}
                />
                <Bar dataKey="progress" fill="#0066ff" radius={[0, 4, 4, 0]} barSize={20} name="% Readiness" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Action Items List - PALANTIR Style */}
      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded overflow-hidden">
         <div className="p-4 border-b border-[#2a2a2a] bg-[#1a1a1a] flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center gap-2 text-sm lg:text-base">
               <UserCircle className="w-4 h-4 lg:w-5 lg:h-5 text-[#0066ff]" /> My Pending Actions
            </h3>
            <span className="bg-[#0066ff] text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{myTasks.length}</span>
         </div>
         {myTasks.length > 0 ? (
            <div className="divide-y divide-[#2a2a2a]">
               {myTasks.map(task => (
                  <div key={task.id} className="p-4 hover:bg-[#1a1a1a] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                     <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${task.status === 'Draft' ? 'bg-[#6a6a6a]' : 'bg-[#ffaa00]'}`} />
                        <div className="min-w-0 flex-1">
                           <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-[#6a6a6a] bg-[#1a1a1a] px-1.5 rounded">{task.code}</span>
                              <span className="text-xs text-[#6a6a6a]">{task.department}</span>
                           </div>
                           <p className="text-sm font-medium text-white mt-0.5 truncate">{task.name}</p>
                        </div>
                     </div>
                     <button className="text-[#0066ff] hover:text-[#00d4ff] text-sm font-medium flex items-center gap-1 flex-shrink-0">
                        Open <ArrowRight className="w-4 h-4" />
                     </button>
                  </div>
               ))}
            </div>
         ) : (
            <div className="p-8 text-center text-[#6a6a6a]">
               <CheckCircle className="w-8 h-8 mx-auto text-[#00ff88] mb-2 opacity-50" />
               <p className="text-sm">All caught up! No pending data entry tasks assigned to you.</p>
            </div>
         )}
      </div>
      
    </div>
  );
};

export default Dashboard;